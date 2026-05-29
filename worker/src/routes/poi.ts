/**
 * /api/poi — User-submitted Points of Interest
 * Uses Durable Objects for geo-cell-based moderation queues
 */

import { Hono } from "hono";

export const poiRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /api/poi?lat=39.09&lon=-94.57&radius=5
 * Fetch approved POIs near a location
 */
poiRoutes.get("/", async (c) => {
	const lat = parseFloat(c.req.query("lat") || "0");
	const lon = parseFloat(c.req.query("lon") || "0");
	const radius = parseFloat(c.req.query("radius") || "5"); // km

	if (!lat || !lon) {
		return c.json({ error: "lat and lon are required" }, 400);
	}

	// Query D1 for approved POIs within bounding box
	const latDelta = radius / 111.0; // rough km → degrees
	const lonDelta = radius / (111.0 * Math.cos(lat * Math.PI / 180));

	const pois = await c.env.DB.prepare(`
		SELECT id, name, category, lat, lon, description, submitted_by, created_at
		FROM pois
		WHERE status = 'approved'
			AND lat BETWEEN ? AND ?
			AND lon BETWEEN ? AND ?
		ORDER BY created_at DESC
		LIMIT 100
	`).bind(
		lat - latDelta, lat + latDelta,
		lon - lonDelta, lon + lonDelta
	).all();

	return c.json({
		pois: pois.results,
		count: pois.results.length,
	});
});

/**
 * POST /api/poi
 * Submit a new POI for moderation
 * Body: { name, category, lat, lon, description }
 */
poiRoutes.post("/", async (c) => {
	const body = await c.req.json<{
		name: string;
		category: string;
		lat: number;
		lon: number;
		description?: string;
	}>();

	if (!body.name || !body.category || !body.lat || !body.lon) {
		return c.json({ error: "Missing required fields: name, category, lat, lon" }, 400);
	}

	// Compute geohash cell (precision 4 ≈ 40km²) for DO routing
	const geohash = simpleGeohash(body.lat, body.lon, 4);
	const doId = c.env.POI_STORE.idFromName(geohash);
	const stub = c.env.POI_STORE.get(doId);

	// Forward to the POIStore Durable Object
	const resp = await stub.fetch(
		new Request("http://internal/submit", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				...body,
				geohash,
				submittedAt: new Date().toISOString(),
				ip: c.req.header("CF-Connecting-IP") || "unknown",
			}),
		})
	);

	return new Response(resp.body, {
		status: resp.status,
		headers: resp.headers,
	});
});

/**
 * GET /api/poi/categories
 * List available POI categories
 */
poiRoutes.get("/categories", (c) => {
	return c.json({
		categories: [
			{ id: "water", label: "Water Station", icon: "💧" },
			{ id: "bike_shop", label: "Bike Shop", icon: "🔧" },
			{ id: "trailhead", label: "Trailhead", icon: "🚩" },
			{ id: "scenic", label: "Scenic Lookout", icon: "🌄" },
			{ id: "rest_area", label: "Rest Area / Bench", icon: "🪑" },
			{ id: "food", label: "Food & Drink", icon: "🍔" },
			{ id: "parking", label: "Bike Parking", icon: "🅿️" },
			{ id: "hazard", label: "Hazard / Warning", icon: "⚠️" },
		],
	});
});

/**
 * Simple geohash — enough to partition DOs by cell
 */
function simpleGeohash(lat: number, lon: number, precision: number): string {
	const base32 = "0123456789bcdefghjkmnpqrstuvwxyz";
	let minLat = -90, maxLat = 90, minLon = -180, maxLon = 180;
	let hash = "";
	let isLon = true;
	let bit = 0;
	let ch = 0;

	while (hash.length < precision) {
		if (isLon) {
			const mid = (minLon + maxLon) / 2;
			if (lon >= mid) { ch |= (1 << (4 - bit)); minLon = mid; }
			else { maxLon = mid; }
		} else {
			const mid = (minLat + maxLat) / 2;
			if (lat >= mid) { ch |= (1 << (4 - bit)); minLat = mid; }
			else { maxLat = mid; }
		}
		isLon = !isLon;
		if (bit < 4) { bit++; }
		else { hash += base32[ch]; bit = 0; ch = 0; }
	}

	return hash;
}
