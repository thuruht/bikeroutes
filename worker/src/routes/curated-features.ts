/**
 * /api/curated-features — JKCBIKEMAP-style curated feature API
 *
 * Public reads only see visibility IN ('public','informal').
 * Authenticated users can create, comment, and checkpoint.
 * Owners and moderators can update/delete and see admin fields.
 */

import { Hono } from "hono";
import { getCurrentUser, canEditCurated, isModerator } from "../lib/auth";

export const curatedFeatureRoutes = new Hono<{ Bindings: Env }>();

const VALID_FEATURE_TYPES = ["point", "line"];
const VALID_VISIBILITIES = ["public", "informal", "sensitive", "private"];
const VALID_STATUSES = ["open", "closed", "deleted"];

function parseFeatureRow(row: any, includeAdmin = false) {
	const base = {
		id: row.id,
		slug: row.slug,
		name: row.name,
		feature_type: row.feature_type,
		category: row.category,
		status: row.status,
		visibility: row.visibility,
		officiality: row.officiality,
		public_description: row.public_description,
		surface_note: row.surface_note,
		risk_note: row.risk_note,
		weather_sensitivity: row.weather_sensitivity,
		source_confidence: row.source_confidence,
		longevity: row.longevity,
		owner_id: row.owner_id,
		last_verified_at: row.last_verified_at,
		created_at: row.created_at,
		updated_at: row.updated_at,
	};
	if (includeAdmin) {
		return {
			...base,
			admin_note: row.admin_note,
			poster_email: row.poster_email,
			delete_token: row.delete_token,
		};
	}
	return base;
}

function parseGeometry(geom: string | null) {
	if (!geom) return null;
	try { return JSON.parse(geom); } catch { return null; }
}

// ─── Helper: record a revision snapshot ───────────────────────────
async function recordRevision(
	db: D1Database,
	featureId: string,
	actor: string,
	previous: any,
	current: any
) {
	const changedFields: string[] = [];
	for (const key of Object.keys({ ...previous, ...current })) {
		if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) {
			changedFields.push(key);
		}
	}

	await db.prepare(
		`INSERT INTO curated_feature_revisions
		 (feature_id, actor, changed_fields, previous_state, new_state)
		 VALUES (?, ?, ?, ?, ?)`
	).bind(
		featureId,
		actor,
		JSON.stringify(changedFields),
		JSON.stringify(previous),
		JSON.stringify(current)
	).run();
}

// ─── List public curated features as GeoJSON ───────────────────────
curatedFeatureRoutes.get("/", async (c) => {
	const category = c.req.query("category") || "";
	const featureType = c.req.query("type") || "";
	const offset = Math.max(0, parseInt(c.req.query("offset") || "0", 10));
	const limit = Math.min(500, Math.max(1, parseInt(c.req.query("limit") || "100", 10)));

	let where = "WHERE f.visibility IN ('public','informal') AND f.status = 'open'";
	const params: any[] = [];

	if (category) {
		const cats = category.split(",").map(s => s.trim()).filter(Boolean);
		if (cats.length) {
			where += ` AND f.category IN (${cats.map(() => "?").join(",")})`;
			params.push(...cats);
		}
	}
	if (featureType && VALID_FEATURE_TYPES.includes(featureType)) {
		where += " AND f.feature_type = ?";
		params.push(featureType);
	}

	const countResult = await c.env.DB.prepare(
		`SELECT COUNT(*) as total FROM curated_features f ${where}`
	).bind(...params).first<{ total: number }>();
	const total = countResult?.total ?? 0;

	const { results } = await c.env.DB.prepare(
		`SELECT f.*, g.public_geometry
		 FROM curated_features f
		 LEFT JOIN curated_feature_geometries g ON g.feature_id = f.id
		 ${where}
		 ORDER BY f.created_at DESC
		 LIMIT ? OFFSET ?`
	).bind(...params, limit, offset).all();

	const features = (results || []).map((r: any) => ({
		type: "Feature" as const,
		id: r.id,
		geometry: parseGeometry(r.public_geometry),
		properties: parseFeatureRow(r, false),
	}));

	return c.json({
		type: "FeatureCollection",
		features,
		total,
		offset,
		limit,
	});
});

// ─── Get one feature (with admin geometry for editors) ──────────────
curatedFeatureRoutes.get("/:id", async (c) => {
	const id = c.req.param("id");
	const user = await getCurrentUser(c);

	const feature = await c.env.DB.prepare(
		`SELECT f.*, g.public_geometry, g.admin_geometry
		 FROM curated_features f
		 LEFT JOIN curated_feature_geometries g ON g.feature_id = f.id
		 WHERE f.id = ?`
	).bind(id).first<any>();

	if (!feature) {
		return c.json({ error: "Feature not found" }, 404);
	}

	const showAdmin = canEditCurated(user, feature.owner_id) || isModerator(user);
	const isPubliclyVisible = feature.visibility === "public" || feature.visibility === "informal";

	if (!isPubliclyVisible && !showAdmin) {
		return c.json({ error: "Feature not found" }, 404);
	}

	return c.json({
		...parseFeatureRow(feature, showAdmin),
		geometry: parseGeometry(showAdmin ? feature.admin_geometry : feature.public_geometry),
		sources: await c.env.DB.prepare(
			"SELECT id, source_url, source_note, confidence, verified_at FROM curated_feature_sources WHERE feature_id = ?"
		).bind(id).all().then(r => r.results),
	});
});

// ─── Create a new curated feature ───────────────────────────────────
curatedFeatureRoutes.post("/", async (c) => {
	const user = await getCurrentUser(c);
	if (!user) {
		return c.json({ error: "Authentication required" }, 401);
	}

	const body = await c.req.json();
	const {
		slug,
		name,
		feature_type,
		category,
		public_description,
		surface_note,
		risk_note,
		weather_sensitivity,
		visibility,
		officiality,
		public_geometry,
	} = body;

	if (!name || !feature_type || !category || !public_geometry) {
		return c.json({ error: "Missing required fields: name, feature_type, category, public_geometry" }, 400);
	}
	if (!VALID_FEATURE_TYPES.includes(feature_type)) {
		return c.json({ error: "feature_type must be 'point' or 'line'" }, 400);
	}

	const resolvedVisibility = VALID_VISIBILITIES.includes(visibility) ? visibility : "public";
	const resolvedOfficiality = ["official", "informal", "planned"].includes(officiality) ? officiality : "official";

	try {
		const geometryString = typeof public_geometry === "string" ? public_geometry : JSON.stringify(public_geometry);

		const featureResult = await c.env.DB.prepare(
			`INSERT INTO curated_features
			 (slug, name, feature_type, category, public_description, surface_note, risk_note,
			  weather_sensitivity, visibility, officiality, owner_id)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			 RETURNING id`
		).bind(
			slug ?? null,
			name,
			feature_type,
			category,
			public_description ?? null,
			surface_note ?? null,
			risk_note ?? null,
			weather_sensitivity ?? null,
			resolvedVisibility,
			resolvedOfficiality,
			user.id
		).first<{ id: string }>();

		const featureId = featureResult?.id;
		if (!featureId) {
			throw new Error("Failed to create feature");
		}

		await c.env.DB.prepare(
			`INSERT INTO curated_feature_geometries (feature_id, public_geometry)
			 VALUES (?, ?)`
		).bind(featureId, geometryString).run();

		// Update contribution stats
		const newCount = (user.contribution_count ?? 0) + 1;
		await c.env.DB.prepare(
			"UPDATE users SET contribution_count = ?, last_active = datetime('now') WHERE id = ?"
		).bind(newCount, user.id).run();

		if (newCount === 1) {
			await c.env.DB.prepare(
				"INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, 'noob')"
			).bind(user.id).run();
		}

		return c.json({ id: featureId, message: "Feature created " }, 201);
	} catch (e) {
		return c.json({ error: "Failed to create feature", message: String(e) }, 500);
	}
});

// ─── Update a curated feature ──────────────────────────────────────
curatedFeatureRoutes.put("/:id", async (c) => {
	const id = c.req.param("id");
	const user = await getCurrentUser(c);
	if (!user) {
		return c.json({ error: "Authentication required" }, 401);
	}

	const existing = await c.env.DB.prepare(
		"SELECT * FROM curated_features WHERE id = ?"
	).bind(id).first<any>();

	if (!existing) {
		return c.json({ error: "Feature not found" }, 404);
	}
	if (!canEditCurated(user, existing.owner_id)) {
		return c.json({ error: "Forbidden" }, 403);
	}

	const body = await c.req.json();
	const allowedFields = [
		"slug", "name", "category", "public_description", "surface_note",
		"risk_note", "weather_sensitivity", "source_confidence", "longevity",
		"visibility", "officiality", "status", "admin_note"
	];

	const updates: Record<string, any> = {};
	for (const key of allowedFields) {
		if (body[key] !== undefined) {
			updates[key] = body[key];
		}
	}
	updates.updated_at = new Date().toISOString();

	const fields = Object.keys(updates);
	if (fields.length === 0 && !body.public_geometry) {
		return c.json({ error: "No fields to update" }, 400);
	}

	try {
		if (fields.length > 0) {
			const setClause = fields.map(f => `${f} = ?`).join(", ");
			await c.env.DB.prepare(
				`UPDATE curated_features SET ${setClause} WHERE id = ?`
			).bind(...fields.map(f => updates[f]), id).run();
		}

		if (body.public_geometry) {
			const geometryString = typeof body.public_geometry === "string" ? body.public_geometry : JSON.stringify(body.public_geometry);
			await c.env.DB.prepare(
				"INSERT INTO curated_feature_geometries (feature_id, public_geometry) VALUES (?, ?) ON CONFLICT(feature_id) DO UPDATE SET public_geometry = excluded.public_geometry"
			).bind(id, geometryString).run();
		}

		const newFeature = await c.env.DB.prepare(
			"SELECT * FROM curated_features WHERE id = ?"
		).bind(id).first<any>();

		if (newFeature) {
			const previous = parseFeatureRow(existing, true);
			const current = parseFeatureRow(newFeature, true);
			await recordRevision(c.env.DB, id, user.id, previous, current);
		}

		return c.json({ id, message: "Feature updated" });
	} catch (e) {
		return c.json({ error: "Failed to update feature", message: String(e) }, 500);
	}
});

// ─── Soft-delete a curated feature ──────────────────────────────────
curatedFeatureRoutes.delete("/:id", async (c) => {
	const id = c.req.param("id");
	const user = await getCurrentUser(c);
	if (!user) {
		return c.json({ error: "Authentication required" }, 401);
	}

	const existing = await c.env.DB.prepare(
		"SELECT * FROM curated_features WHERE id = ?"
	).bind(id).first<any>();

	if (!existing) {
		return c.json({ error: "Feature not found" }, 404);
	}
	if (!canEditCurated(user, existing.owner_id)) {
		return c.json({ error: "Forbidden" }, 403);
	}

	await c.env.DB.prepare(
		"UPDATE curated_features SET status = 'deleted', updated_at = datetime('now') WHERE id = ?"
	).bind(id).run();

	return c.json({ id, message: "Feature deleted" });
});

// ─── List revisions (owner/moderator only) ──────────────────────────
curatedFeatureRoutes.get("/:id/revisions", async (c) => {
	const id = c.req.param("id");
	const user = await getCurrentUser(c);

	const feature = await c.env.DB.prepare(
		"SELECT owner_id FROM curated_features WHERE id = ?"
	).bind(id).first<{ owner_id: string | null }>();

	if (!feature) {
		return c.json({ error: "Feature not found" }, 404);
	}
	if (!canEditCurated(user, feature.owner_id)) {
		return c.json({ error: "Forbidden" }, 403);
	}

	const { results } = await c.env.DB.prepare(
		"SELECT * FROM curated_feature_revisions WHERE feature_id = ? ORDER BY created_at DESC"
	).bind(id).all();

	return c.json({ revisions: results ?? [] });
});

// ─── Add a source citation ──────────────────────────────────────────
curatedFeatureRoutes.post("/:id/sources", async (c) => {
	const id = c.req.param("id");
	const user = await getCurrentUser(c);
	if (!user) return c.json({ error: "Authentication required" }, 401);

	const feature = await c.env.DB.prepare(
		"SELECT owner_id FROM curated_features WHERE id = ?"
	).bind(id).first<{ owner_id: string | null }>();
	if (!feature) return c.json({ error: "Feature not found" }, 404);
	if (!canEditCurated(user, feature.owner_id)) return c.json({ error: "Forbidden" }, 403);

	const body = await c.req.json();
	const { source_url, source_note, confidence } = body;
	if (!source_url && !source_note) {
		return c.json({ error: "source_url or source_note required" }, 400);
	}

	const result = await c.env.DB.prepare(
		`INSERT INTO curated_feature_sources (feature_id, source_url, source_note, confidence)
		 VALUES (?, ?, ?, ?)
		 RETURNING id`
	).bind(id, source_url ?? null, source_note ?? null, confidence ?? "medium").first<{ id: string }>();

	return c.json({ id: result?.id, message: "Source added" }, 201);
});

// ─── Comments ──────────────────────────────────────────────────────
curatedFeatureRoutes.get("/:id/comments", async (c) => {
	const id = c.req.param("id");
	const { results } = await c.env.DB.prepare(
		`SELECT c.id, c.body, c.author_name, c.created_at, u.username, u.display_name
		 FROM curated_feature_comments c
		 LEFT JOIN users u ON u.id = c.user_id
		 WHERE c.feature_id = ?
		 ORDER BY c.created_at ASC`
	).bind(id).all();

	return c.json({ comments: results ?? [] });
});

curatedFeatureRoutes.post("/:id/comments", async (c) => {
	const id = c.req.param("id");
	const user = await getCurrentUser(c);

	const body = await c.req.json();
	const text = body.body?.toString().trim();
	if (!text) {
		return c.json({ error: "Comment body required" }, 400);
	}

	const authorName = user ? (user.display_name || user.username || " anon") : (body.author_name?.toString().trim() || "Anonymous");
	const userId = user ? user.id : null;

	const result = await c.env.DB.prepare(
		`INSERT INTO curated_feature_comments (feature_id, user_id, author_name, body)
		 VALUES (?, ?, ?, ?)
		 RETURNING id`
	).bind(id, userId, authorName, text).first<{ id: string }>();

	return c.json({ id: result?.id, message: "Comment posted" }, 201);
});

// ─── Checkpoints ─────────────────────────────────────────────────────
curatedFeatureRoutes.get("/:id/checkpoints", async (c) => {
	const id = c.req.param("id");
	const { results } = await c.env.DB.prepare(
		`SELECT ck.*, u.display_name, u.username
		 FROM curated_feature_checkpoints ck
		 LEFT JOIN users u ON u.id = ck.contributor_id
		 WHERE ck.feature_id = ?
		 ORDER BY ck.created_at DESC`
	).bind(id).all();

	return c.json({ checkpoints: results ?? [] });
});

curatedFeatureRoutes.post("/:id/checkpoints", async (c) => {
	const id = c.req.param("id");
	const user = await getCurrentUser(c);
	if (!user) return c.json({ error: "Authentication required" }, 401);

	const body = await c.req.json();
	const checkInType = ["passage", "verification", "media_update"].includes(body.check_in_type)
		? body.check_in_type
		: "passage";

	const result = await c.env.DB.prepare(
		`INSERT INTO curated_feature_checkpoints (contributor_id, feature_id, check_in_type, note)
		 VALUES (?, ?, ?, ?)
		 RETURNING id`
	).bind(user.id, id, checkInType, body.note ?? null).first<{ id: string }>();

	// Update contribution count + trail-veteran-style badges
	const newCount = (user.contribution_count ?? 0) + 1;
	await c.env.DB.prepare(
		"UPDATE users SET contribution_count = ?, last_active = datetime('now') WHERE id = ?"
	).bind(newCount, user.id).run();

	if (newCount >= 10) {
		await c.env.DB.prepare(
			"INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, 'trail-veteran')"
		).bind(user.id).run();
	}

	return c.json({ id: result?.id, message: "Checkpoint logged" }, 201);
});

// ─── Badges ─────────────────────────────────────────────────────────
curatedFeatureRoutes.get("/badges", async (c) => {
	const { results } = await c.env.DB.prepare(
		"SELECT id, name, description, icon_svg FROM badges ORDER BY name"
	).all();
	return c.json({ badges: results ?? [] });
});

curatedFeatureRoutes.get("/badges/me", async (c) => {
	const user = await getCurrentUser(c);
	if (!user) return c.json({ error: "Authentication required" }, 401);

	const { results } = await c.env.DB.prepare(
		`SELECT b.id, b.name, b.description, ub.unlocked_at
		 FROM user_badges ub
		 JOIN badges b ON b.id = ub.badge_id
		 WHERE ub.user_id = ?
		 ORDER BY ub.unlocked_at DESC`
	).bind(user.id).all();

	return c.json({ badges: results ?? [] });
});
