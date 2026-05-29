/**
 * /api/route — Valhalla routing proxy with KV caching
 */

import { Hono } from "hono";
import { getContainer } from "@cloudflare/containers";

export const routeRoutes = new Hono<{ Bindings: Env }>();

// SHA-256 hash for cache keys
async function sha256(data: string): Promise<string> {
	const buf = await crypto.subtle.digest("SHA-256",
		new TextEncoder().encode(data));
	return Array.from(new Uint8Array(buf))
		.map(b => b.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * POST /api/route
 * Body: Valhalla-compatible JSON (locations, costing, etc.)
 * Returns: Valhalla route response (GeoJSON-like)
 */
routeRoutes.post("/", async (c) => {
	const body = await c.req.text();
	const cacheKey = `route:${await sha256(body)}`;

	// 1. Check KV cache
	const cached = await c.env.ROUTE_CACHE.get(cacheKey, "json");
	if (cached) {
		return c.json(cached, 200, {
			"X-Cache": "HIT",
			"X-Reki": "🦌 cached trail",
		});
	}

	// 2. Forward to Valhalla container
	try {
		const container = getContainer(c.env.VALHALLA, "valhalla-router");
		const valhallaResp = await container.fetch(
			new Request("http://localhost:8002/route", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body,
			})
		);

		if (!valhallaResp.ok) {
			const errText = await valhallaResp.text();
			return c.json({
				error: "Routing failed",
				message: `Valhalla says: ${errText}`,
			}, valhallaResp.status as any);
		}

		const routeData = await valhallaResp.json();

		// 3. Cache for 24 hours
		c.executionCtx.waitUntil(
			c.env.ROUTE_CACHE.put(cacheKey, JSON.stringify(routeData), {
				expirationTtl: 86400,
			})
		);

		// 4. Log route to D1 for analytics
		c.executionCtx.waitUntil(
			c.env.DB.prepare(
				"INSERT INTO route_logs (request_hash, created_at) VALUES (?, ?)"
			).bind(cacheKey, new Date().toISOString()).run()
		);

		return c.json(routeData, 200, {
			"X-Cache": "MISS",
			"X-Reki": "🦌 fresh scouted trail",
		});
	} catch (error) {
		console.error("Route error:", error);
		return c.json({
			error: "Reki got lost",
			message: "The routing engine is taking a nap. Try again shortly.",
		}, 503);
	}
});

/**
 * GET /api/route/status
 * Check if the Valhalla container is alive
 */
routeRoutes.get("/status", async (c) => {
	try {
		const container = getContainer(c.env.VALHALLA, "valhalla-router");
		const resp = await container.fetch(
			new Request("http://localhost:8002/status")
		);
		return c.json({
			valhalla: resp.ok ? "running" : "error",
			timestamp: new Date().toISOString(),
		});
	} catch {
		return c.json({
			valhalla: "offline",
			timestamp: new Date().toISOString(),
		}, 503);
	}
});
