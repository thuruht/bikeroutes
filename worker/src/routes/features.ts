/**
 * /api/features — Unified GeoJSON endpoint for trail + rail features
 *
 * Returns a GeoJSON FeatureCollection from the `trails` D1 table,
 * filtered by optional category query parameter.
 *
 * GET /api/features?category=cycleway,railway,station
 * GET /api/features?type=trail       — synonym for category=cycleway,route
 * GET /api/features?type=rail        — synonym for category=railway,station,halt
 * GET /api/features?offset=0&limit=5000 — pagination (default offset=0, limit=5000, max=10000)
 */

import { Hono } from "hono";

export const featuresRoutes = new Hono<{ Bindings: Env }>();

featuresRoutes.get("/", async (c) => {
	const category = c.req.query("category") || "";
	const type = c.req.query("type") || "";
	const bbox = c.req.query("bbox") || "";
	const offset = Math.max(0, parseInt(c.req.query("offset") || "0", 10));
	const limit = Math.min(10000, Math.max(1, parseInt(c.req.query("limit") || "5000", 10)));

	let where = "WHERE (status IN ('approved','existing') OR status LIKE 'construction_%')";
	const params: any[] = [];
	const countParams: any[] = [];

	if (category) {
		const cats = category.split(",").map(s => s.trim()).filter(Boolean);
		if (cats.length) {
			const placeholders = cats.map(() => "?").join(",");
			where += ` AND category IN (${placeholders})`;
			params.push(...cats);
			countParams.push(...cats);
		}
	} else if (type === "trail") {
		const trailCats = ["cycleway", "route", "path", "shared_use_path", "bike_lane", "separated_bike_lane", "paved_shoulder", "marked_bike_route", "walking_trail", "mountain_bike", "equestrian_trail", "national_historic_trail", "share_the_road", "metro_green", "bikeway", "bridge", "construction"];
		where += ` AND category IN (${trailCats.map(() => "?").join(",")})`;
		params.push(...trailCats);
		countParams.push(...trailCats);
	} else if (type === "rail") {
		const railCats = ["railway", "station", "halt", "light_rail", "tram"];
		where += ` AND category IN (${railCats.map(() => "?").join(",")})`;
		params.push(...railCats);
		countParams.push(...railCats);
	}

	if (bbox) {
		const parts = bbox.split(",").map(Number);
		if (parts.length === 4 && parts.every(n => isFinite(n))) {
			const [south, west, north, east] = parts;
			where += " AND lat >= ? AND lat <= ? AND lon >= ? AND lon <= ?";
			params.push(south, north, west, east);
			countParams.push(south, north, west, east);
		}
	}

	const countSql = `SELECT COUNT(*) as total FROM trails ${where}`;
	const countResult = await c.env.DB.prepare(countSql).bind(...countParams).first<{ total: number }>();
	const total = countResult?.total ?? 0;

	const { results } = await c.env.DB.prepare(
		`SELECT id, name, category, source, source_type, source_id, geom, lat, lon, surface, length_m, difficulty, description, status FROM trails ${where} LIMIT ? OFFSET ?`
	).bind(...params, limit, offset).all();

	const rows = (results || []) as Array<{
		id: string; name: string; category: string;
		source: string; source_type: string; source_id: string;
		geom: string | null; lat: number; lon: number;
		surface: string; length_m: number | null; difficulty: string; description: string; status: string;
	}>;

	const features = rows.map(r => {
		let geometry: any;
		if (r.geom) {
			try { geometry = JSON.parse(r.geom); } catch { geometry = null; }
		}
		if (!geometry) {
			geometry = { type: "Point", coordinates: [r.lon, r.lat] };
		}
		return {
			type: "Feature",
			id: r.id,
			geometry,
			properties: {
				name: r.name,
				category: r.category,
				source: r.source,
				surface: r.surface,
				length_m: r.length_m,
				difficulty: r.difficulty,
				description: r.description,
				status: r.status,
			},
		};
	});

	return c.json({
		type: "FeatureCollection",
		features,
		total,
		offset,
		limit,
	}, 200, {
		"Access-Control-Allow-Origin": "*",
		"Cache-Control": "public, max-age=300, s-maxage=600",
	});
});
