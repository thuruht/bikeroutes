/**
 * /api/geocode  GET ?q=...         → [{label, short, kind, lng, lat}]
 * /api/reverse  GET ?lng=&lat=     → "display string"
 *
 * Proxies Nominatim with a proper User-Agent (required by OSM policy).
 * Results cached in ROUTE_CACHE KV — geocode TTL 30 days, reverse 7 days.
 * All external calls are server-side only; never exposed to the client.
 */

import { Hono } from "hono";

export const geocodeRoutes = new Hono<{ Bindings: Env }>();

const NOMINATIM = "https://nominatim.openstreetmap.org";
const UA = "bikeroutes.org/1.0 (contact@bikeroutes.org)";

/* ── helpers ────────────────────────────────────────────────────────────── */

function kvKey(prefix: string, val: string) {
	// normalise: lowercase, collapse whitespace
	return `${prefix}:${val.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

/* ── GET /api/geocode?q=... ─────────────────────────────────────────────── */
geocodeRoutes.get("/geocode", async (c) => {
	const q = (c.req.query("q") || "").trim();
	if (!q) return c.json({ error: "Query too short" }, 400);

	const cacheKey = kvKey("geo", q);
	const cached = await c.env.ROUTE_CACHE.get(cacheKey, "json");
	if (cached) {
		return c.json(cached, 200, { "X-Cache": "HIT" });
	}

	try {
		const url = `${NOMINATIM}/search?format=jsonv2&limit=6&addressdetails=1&q=${encodeURIComponent(q)}`;
		const res = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" } });
		if (!res.ok) throw new Error(`Nominatim ${res.status}`);
		const raw = await res.json() as any[];

		const results = raw.map((d: any) => ({
			label: d.display_name,
			short: d.name || d.display_name.split(",")[0],
			kind: d.type || d.category,
			lng: parseFloat(d.lon),
			lat: parseFloat(d.lat),
		}));

		// Cache 30 days
		c.executionCtx.waitUntil(
			c.env.ROUTE_CACHE.put(cacheKey, JSON.stringify(results), { expirationTtl: 86400 * 30 })
		);

		return c.json(results, 200, { "X-Cache": "MISS" });
	} catch (e) {
		console.error("geocode error:", e);
		return c.json({ error: "Geocode failed", message: String(e) }, 502);
	}
});

/* ── GET /api/reverse?lng=&lat= ─────────────────────────────────────────── */
geocodeRoutes.get("/reverse", async (c) => {
	const lng = parseFloat(c.req.query("lng") || "");
	const lat = parseFloat(c.req.query("lat") || "");
	if (!isFinite(lng) || !isFinite(lat)) return c.json({ error: "Invalid coordinates" }, 400);

	// round to 4dp for cache key (~11m precision — good enough for reverse)
	const cacheKey = `rev:${lat.toFixed(4)},${lng.toFixed(4)}`;
	const cached = await c.env.ROUTE_CACHE.get(cacheKey);
	if (cached) return c.json({ label: cached }, 200, { "X-Cache": "HIT" });

	try {
		const url = `${NOMINATIM}/reverse?format=jsonv2&lon=${lng}&lat=${lat}`;
		const res = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" } });
		if (!res.ok) throw new Error(`Nominatim ${res.status}`);
		const d = await res.json() as any;
		const label: string = d.name || (d.display_name || "").split(",").slice(0, 2).join(", ")
			|| `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

		// Cache 7 days
		c.executionCtx.waitUntil(
			c.env.ROUTE_CACHE.put(cacheKey, label, { expirationTtl: 86400 * 7 })
		);

		return c.json({ label }, 200, { "X-Cache": "MISS" });
	} catch (e) {
		console.error("reverse error:", e);
		// graceful fallback — never leave the UI stranded
		return c.json({ label: `${lat.toFixed(4)}, ${lng.toFixed(4)}` }, 200);
	}
});
