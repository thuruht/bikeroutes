/**
 * /api/tiles — Tile proxy with R2 caching
 * Serves OSM tiles from R2 bucket or upstream
 */

import { Hono } from "hono";

export const tileRoutes = new Hono<{ Bindings: Env }>();

const UPSTREAM_TILES = [
	"https://a.tile.openstreetmap.org",
	"https://b.tile.openstreetmap.org",
	"https://c.tile.openstreetmap.org",
];

/**
 * GET /api/tiles/:z/:x/:y.png
 * Check R2 first, then fetch from upstream and cache
 */
tileRoutes.get("/:z/:x/:y{.+}", async (c) => {
	const z = c.req.param("z");
	const x = c.req.param("x");
	const y = c.req.param("y"); // includes extension like "123.png"
	const tileKey = `tiles/${z}/${x}/${y}`;

	// 1. Try R2 cache first
	const cached = await c.env.TILES.get(tileKey);
	if (cached) {
		const headers = new Headers();
		headers.set("Content-Type", cached.httpMetadata?.contentType || "image/png");
		headers.set("Cache-Control", "public, max-age=86400");
		headers.set("X-Cache", "R2-HIT");
		headers.set("X-Reki", "🦌 tile from the stash");
		return new Response(cached.body, { headers });
	}

	// 2. Fetch from upstream OSM tile server
	const upstream = UPSTREAM_TILES[Math.floor(Math.random() * UPSTREAM_TILES.length)];
	const tileUrl = `${upstream}/${z}/${x}/${y}`;

	try {
		const resp = await fetch(tileUrl, {
			headers: {
				"User-Agent": "BikeRoutes.org/0.1 (https://bikeroutes.org; Reki the deer)",
			},
		});

		if (!resp.ok) {
			return c.json({ error: "Tile not found" }, resp.status as any);
		}

		const tileData = await resp.arrayBuffer();
		const contentType = resp.headers.get("Content-Type") || "image/png";

		// 3. Store in R2 for future requests (non-blocking)
		c.executionCtx.waitUntil(
			c.env.TILES.put(tileKey, tileData, {
				httpMetadata: { contentType },
				customMetadata: {
					cachedAt: new Date().toISOString(),
					upstream,
				},
			})
		);

		return new Response(tileData, {
			headers: {
				"Content-Type": contentType,
				"Cache-Control": "public, max-age=86400",
				"X-Cache": "UPSTREAM-MISS",
				"X-Reki": "🦌 fresh tile fetched",
			},
		});
	} catch (error) {
		console.error("Tile fetch error:", error);
		return c.json({ error: "Tile fetch failed" }, 502);
	}
});

/**
 * GET /api/tiles/usgs/:type/:z/:y/:x
 * Proxy USGS Topo and Imagery tiles through Worker, cache in ROUTE_CACHE KV with 7-day TTL
 */
tileRoutes.get("/usgs/:type/:z/:y/:x", async (c) => {
	const type = c.req.param("type");
	const z = c.req.param("z");
	const y = c.req.param("y");
	const x = c.req.param("x");

	const service = type === "imagery" ? "USGSImageryOnly" : "USGSTopo";
	const tileKey = `usgs:${service}:${z}:${y}:${x}`;

	// 1. Try KV cache first
	const cached = await c.env.ROUTE_CACHE.get(tileKey, "arrayBuffer");
	if (cached) {
		const headers = new Headers();
		headers.set("Content-Type", "image/jpeg");
		headers.set("Cache-Control", "public, max-age=604800");
		headers.set("Access-Control-Allow-Origin", "*");
		headers.set("X-Cache", "HIT");
		return new Response(cached, { headers });
	}

	// 2. Fetch upstream
	const tileUrl = `https://basemap.nationalmap.gov/arcgis/rest/services/${service}/MapServer/tile/${z}/${y}/${x}`;
	try {
		const resp = await fetch(tileUrl, {
			headers: { "User-Agent": "BikeRoutes.org/0.1" },
		});

		if (!resp.ok) {
			return c.json({ error: "USGS tile fetch failed" }, resp.status as any);
		}

		const tileData = await resp.arrayBuffer();
		const contentType = resp.headers.get("Content-Type") || "image/jpeg";

		// 3. Cache in KV
		c.executionCtx.waitUntil(
			c.env.ROUTE_CACHE.put(tileKey, tileData, {
				expirationTtl: 604800, // 7 days
			})
		);

		return new Response(tileData, {
			headers: {
				"Content-Type": contentType,
				"Cache-Control": "public, max-age=604800",
				"Access-Control-Allow-Origin": "*",
				"X-Cache": "MISS",
			},
		});
	} catch (err) {
		console.error("USGS fetch error:", err);
		return c.json({ error: "USGS Proxy Failed" }, 502);
	}
});

/**
 * DELETE /api/tiles/purge
 * Purge all cached tiles (called after OSM import)
 */
tileRoutes.delete("/purge", async (c) => {
	// List and delete all tile objects in R2
	// Note: In production, use R2's bulk delete or prefix-based cleanup
	let cursor: string | undefined;
	let deleted = 0;

	do {
		const listed = await c.env.TILES.list({
			prefix: "tiles/",
			cursor,
			limit: 1000,
		});

		const keys = listed.objects.map((obj) => obj.key);
		if (keys.length > 0) {
			await Promise.all(keys.map((key) => c.env.TILES.delete(key)));
			deleted += keys.length;
		}

		cursor = listed.truncated ? listed.cursor : undefined;
	} while (cursor);

	return c.json({
		purged: deleted,
		message: `🦌 Reki cleared ${deleted} stale tiles. Fresh maps incoming!`,
	});
});
