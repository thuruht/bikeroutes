/**
 * /api/geocode & /api/reverse — Nominatim proxy with KV caching
 */

import { Hono } from "hono";
import { logger } from "../lib/logger";

export const geocodeRoutes = new Hono<{ Bindings: Env }>();
export const reverseRoutes = new Hono<{ Bindings: Env }>();

async function sha256Short(data: string): Promise<string> {
	const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
	return Array.from(new Uint8Array(buf)).slice(0, 8)
		.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * GET /api/geocode?q=query
 */
geocodeRoutes.get("/", async (c) => {
	const query = c.req.query("q");
	if (!query || query.length < 2) {
		return c.json({ error: "Query too short" }, 400);
	}

	const cacheKey = `geo:${await sha256Short(query)}`;
	const cached = await c.env.ROUTE_CACHE.get(cacheKey, "json");
	if (cached) {
		return c.json(cached, 200, { "X-Cache": "HIT" });
	}

	try {
		const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
			q: query,
			format: "json",
			limit: "5",
			bounded: "1",
			viewbox: "-102.0,40.6,-89.0,36.0",
		})}`;
		const resp = await fetch(url, {
			headers: { "User-Agent": "BikeRoutes.org/1.0 (bikeroutes.org)" },
		});
		const data = await resp.json() as Array<{
			place_id: number;
			display_name: string;
			lat: string;
			lon: string;
		}>;

		const result = {
			query,
			results: data.map((item) => ({
				id: item.place_id,
				name: item.display_name.split(",")[0],
				description: item.display_name,
				coords: [parseFloat(item.lon), parseFloat(item.lat)],
			})),
			reki_says: data.length > 0
				? `🦌 Reki scouted ${data.length} spots for you!`
				: "🦌 Hmm, Reki hasn't explored that area yet. Try different words?",
		};

		c.executionCtx.waitUntil(
			c.env.ROUTE_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 86400 })
		);

		return c.json(result, 200, { "X-Cache": "MISS" });
	} catch (error) {
		logger.error("Geocode proxy failed", error, "SEARCH");
		return c.json({ error: "Geocode failed", message: "Reki got distracted by a butterfly. Try again. 🦋🦌" }, 500);
	}
});

/**
 * GET /api/reverse?lat=...&lon=...
 */
reverseRoutes.get("/", async (c) => {
	const lat = parseFloat(c.req.query("lat") || "0");
	const lon = parseFloat(c.req.query("lon") || "0");

	if (!lat || !lon) {
		return c.json({ error: "lat and lon are required" }, 400);
	}

	const cacheKey = `rev:${await sha256Short(`${lat.toFixed(4)},${lon.toFixed(4)}`)}`;
	const cached = await c.env.ROUTE_CACHE.get(cacheKey, "json");
	if (cached) {
		return c.json(cached, 200, { "X-Cache": "HIT" });
	}

	try {
		const url = `https://nominatim.openstreetmap.org/reverse?${new URLSearchParams({
			lat: lat.toString(),
			lon: lon.toString(),
			format: "json",
		})}`;
		const resp = await fetch(url, {
			headers: { "User-Agent": "BikeRoutes.org/1.0 (bikeroutes.org)" },
		});
		const data = await resp.json() as {
			display_name: string;
			lat: string;
			lon: string;
		};

		const result = {
			name: data.display_name.split(",")[0],
			description: data.display_name,
			coords: [parseFloat(data.lon), parseFloat(data.lat)],
			reki_says: "🦌 Found it!",
		};

		c.executionCtx.waitUntil(
			c.env.ROUTE_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 86400 })
		);

		return c.json(result, 200, { "X-Cache": "MISS" });
	} catch (error) {
		logger.error("Reverse geocode proxy failed", error, "SEARCH");
		return c.json({ error: "Reverse geocode failed", message: "Reki couldn't place that spot. Try again. 🦌" }, 500);
	}
});
