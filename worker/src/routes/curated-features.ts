/**
 * /api/curated-features — JKCBIKEMAP-style curated feature API
 *
 * Public reads only see visibility IN ('public','informal').
 * Authenticated users can create, comment, and checkpoint.
 * Owners and moderators can update/delete and see admin fields.
 */

import { Hono } from "hono";
import { getCurrentUser, canEditCurated, isModerator } from "../lib/auth";
import { createNotification } from "../lib/notifications";
import { logger } from "../lib/logger";

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

	// Notify feature owner, but never notify the commenter themselves
	if (user && userId) {
		try {
			const feature = await c.env.DB.prepare(
				"SELECT owner_id, name FROM curated_features WHERE id = ?"
			).bind(id).first<{ owner_id: string | null; name: string | null }>();
			if (feature?.owner_id && feature.owner_id !== userId) {
				await createNotification(c.env.DB, {
					user_id: feature.owner_id,
					type: "comment",
					title: "New comment on your feature",
					body: `${user.display_name || user.username || "Someone"} commented on ${feature.name || "your feature"}: ${text.slice(0, 80)}${text.length > 80 ? "…" : ""}`,
					link: `/feature/${id}`,
				});
			}
		} catch (error) {
			logger.error("Failed to notify feature owner", error, "FEATURES");
		}
	}

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

// ─── Submissions (public contribution / correction queue) ─────────
const VALID_GEOM_TYPES = ["Point", "LineString"];

function sanitize(text: unknown, max = 500): string | null {
	if (typeof text !== "string") return null;
	const s = text.trim();
	if (s.length === 0) return null;
	return s.slice(0, max);
}

function validateGeometry(geom: unknown): { ok: true; type: string; coords: number[][] } | { ok: false; reason: string } {
	if (!geom || typeof geom !== "object") return { ok: false, reason: "Geometry missing" };
	const g = geom as { type?: string; coordinates?: any };
	if (!g.type || !VALID_GEOM_TYPES.includes(g.type)) return { ok: false, reason: "Geometry type must be Point or LineString" };
	if (!Array.isArray(g.coordinates) || g.coordinates.length === 0) return { ok: false, reason: "Coordinates missing" };
	if (g.type === "Point") {
		const [lon, lat] = g.coordinates;
		if (!Number.isFinite(lon) || !Number.isFinite(lat)) return { ok: false, reason: "Invalid point coordinates" };
		return { ok: true, type: g.type, coords: g.coordinates };
	}
	// LineString
	if (g.coordinates.length < 2) return { ok: false, reason: "Line needs at least 2 points" };
	for (const pt of g.coordinates) {
		if (!Array.isArray(pt) || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) return { ok: false, reason: "Invalid line coordinates" };
	}
	return { ok: true, type: g.type, coords: g.coordinates };
}

// Create a new submission (auth required)
curatedFeatureRoutes.post("/submissions", async (c) => {
	const user = await getCurrentUser(c);
	if (!user) return c.json({ error: "Sign in to contribute" }, 401);

	const body = await c.req.json();
	const name = sanitize(body.name, 140);
	if (!name) return c.json({ error: "Name is required" }, 400);

	const geometryResult = validateGeometry(body.geometry);
	if (!geometryResult.ok) return c.json({ error: geometryResult.reason }, 400);

	const targetId = typeof body.target_feature_id === "string" && body.target_feature_id
		? body.target_feature_id
		: null;
	if (targetId) {
		const exists = await c.env.DB.prepare("SELECT 1 FROM curated_features WHERE id = ?").bind(targetId).first();
		if (!exists) return c.json({ error: "Target feature not found" }, 404);
	}

	const id = crypto.randomUUID();
	const category = sanitize(body.category, 80) ?? "Ride anchors";
	const description = sanitize(body.description, 2000);
	const sourceNote = sanitize(body.source_note, 1000);
	const featureType = geometryResult.type === "Point" ? "point" : "line";

	try {
		await c.env.DB.prepare(
			`INSERT INTO curated_feature_submissions
			 (id, user_id, target_feature_id, name, category, description, geom, source_note, feature_type)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		).bind(id, user.id, targetId, name, category, description, JSON.stringify(body.geometry), sourceNote, featureType).run();

		const newCount = (user.contribution_count ?? 0) + 1;
		await c.env.DB.prepare(
			"UPDATE users SET contribution_count = ?, last_active = datetime('now') WHERE id = ?"
		).bind(newCount, user.id).run();

		return c.json({ id, message: targetId ? "Change submitted for review" : "Feature suggestion submitted" }, 201);
	} catch (e) {
		return c.json({ error: "Failed to save submission", message: String(e) }, 500);
	}
});

// List submissions. Moderators see all with optional status filter; users see their own.
curatedFeatureRoutes.get("/submissions", async (c) => {
	const user = await getCurrentUser(c);
	const isMod = isModerator(user);
	const status = c.req.query("status");

	let where = "WHERE user_id = ?";
	const params: any[] = [user?.id ?? ""];
	if (isMod) {
		where = "WHERE 1=1";
		params.pop();
	}
	if (status) {
		where += isMod ? " AND status = ?" : " AND status = ?";
		params.push(status);
	}

	const { results } = await c.env.DB.prepare(
		`SELECT s.*, u.display_name, u.username
		 FROM curated_feature_submissions s
		 LEFT JOIN users u ON u.id = s.user_id
		 ${where}
		 ORDER BY s.created_at DESC`
	).bind(...params).all();

	return c.json({ submissions: results ?? [] });
});

// Get one submission (owner or moderator)
curatedFeatureRoutes.get("/submissions/:id", async (c) => {
	const user = await getCurrentUser(c);
	const id = c.req.param("id");
	const row = await c.env.DB.prepare(
		`SELECT s.*, u.display_name, u.username FROM curated_feature_submissions s
		 LEFT JOIN users u ON u.id = s.user_id WHERE s.id = ?`
	).bind(id).first<any>();
	if (!row) return c.json({ error: "Submission not found" }, 404);
	if (!isModerator(user) && row.user_id !== user?.id) return c.json({ error: "Forbidden" }, 403);
	return c.json({ submission: row });
});

// Approve (moderator only)
curatedFeatureRoutes.post("/submissions/:id/approve", async (c) => {
	const user = await getCurrentUser(c);
	if (!user || !isModerator(user)) return c.json({ error: "Forbidden" }, 403);
	const id = c.req.param("id");
	const body = await c.req.json<{ admin_note?: string }>().catch(() => ({} as { admin_note?: string }));

	const sub = await c.env.DB.prepare("SELECT * FROM curated_feature_submissions WHERE id = ?").bind(id).first<any>();
	if (!sub) return c.json({ error: "Submission not found" }, 404);

	try {
		const geometry = JSON.parse(sub.geom);
		let targetId = sub.target_feature_id;

		if (targetId) {
			// Update existing feature + geometry
			await c.env.DB.prepare(
				`UPDATE curated_features SET name = ?, category = ?, public_description = ?, updated_at = datetime('now') WHERE id = ?`
			).bind(sub.name, sub.category, sub.description ?? null, targetId).run();
			await c.env.DB.prepare(
				"INSERT INTO curated_feature_geometries (feature_id, public_geometry) VALUES (?, ?) ON CONFLICT(feature_id) DO UPDATE SET public_geometry = excluded.public_geometry"
			).bind(targetId, JSON.stringify(geometry)).run();
		} else {
			// Create new curated feature
			const featureType = sub.feature_type || (geometry.type === "Point" ? "point" : "line");
			const res = await c.env.DB.prepare(
				`INSERT INTO curated_features
				 (name, feature_type, category, public_description, visibility, officiality, owner_id)
				 VALUES (?, ?, ?, ?, 'public', 'informal', ?) RETURNING id`
			).bind(sub.name, featureType, sub.category, sub.description ?? null, user.id).first<{ id: string }>();
			targetId = res?.id;
			if (targetId) {
				await c.env.DB.prepare(
					"INSERT INTO curated_feature_geometries (feature_id, public_geometry) VALUES (?, ?)"
				).bind(targetId, JSON.stringify(geometry)).run();
			}
		}

		await c.env.DB.prepare(
			`UPDATE curated_feature_submissions SET status = 'approved', admin_note = ?, updated_at = datetime('now') WHERE id = ?`
		).bind(body.admin_note ?? null, id).run();

		if (targetId) {
			await recordRevision(c.env.DB, targetId, user.id, { status: sub.status }, { status: "approved" });
		}

		return c.json({ id, feature_id: targetId, message: "Submission approved" });
	} catch (e) {
		return c.json({ error: "Failed to approve submission", message: String(e) }, 500);
	}
});

// Reject (moderator only)
curatedFeatureRoutes.post("/submissions/:id/reject", async (c) => {
	const user = await getCurrentUser(c);
	if (!user || !isModerator(user)) return c.json({ error: "Forbidden" }, 403);
	const id = c.req.param("id");
	const body = await c.req.json<{ admin_note?: string }>().catch(() => ({} as { admin_note?: string }));

	const sub = await c.env.DB.prepare(
		"SELECT user_id, name FROM curated_feature_submissions WHERE id = ?"
	).bind(id).first<{ user_id: string; name: string }>();
	if (!sub) return c.json({ error: "Submission not found" }, 404);

	await c.env.DB.prepare(
		`UPDATE curated_feature_submissions SET status = 'rejected', admin_note = ?, updated_at = datetime('now') WHERE id = ?`
	).bind(body.admin_note ?? null, id).run();

	if (sub.user_id && sub.user_id !== user.id) {
		await createNotification(c.env.DB, {
			user_id: sub.user_id,
			type: "submission_rejected",
			title: "Your feature suggestion was not approved",
			body: `${sub.name} was reviewed and not added.${body.admin_note ? " Note: " + body.admin_note : ""}`,
			link: `/map`,
		});
	}

	return c.json({ id, message: "Submission rejected" });
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
