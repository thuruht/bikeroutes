/**
 * /api/route — Valhalla routing proxy with KV caching
 */

import { Hono } from "hono";
import { getContainer } from "@cloudflare/containers";
import { logger } from "../lib/logger";

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
// Request validation helper
function validateCoordinates(locations: any[]): boolean {
	if (!locations || locations.length < 2) return false;
	return locations.every(loc => 
		typeof loc.lat === "number" && typeof loc.lon === "number" &&
		(loc.lat !== 0 || loc.lon !== 0) // Basic 0,0 boundary rejection
	);
}

routeRoutes.post("/", async (c) => {
	const body = await c.req.text();
	
	let parsed;
	try {
		parsed = JSON.parse(body);
	} catch {
		return c.json({ error: "Invalid JSON payload" }, 400);
	}

	if (!validateCoordinates(parsed.locations)) {
		return c.json({ 
			error: "Invalid coordinates", 
			message: "Locations must contain valid lat/lon (0,0 is not permitted)." 
		}, 400);
	}

	const cacheKey = `route:${await sha256(body)}`;

	// 1. Check KV cache
	const cached = await c.env.ROUTE_CACHE.get(cacheKey, "json");
	if (cached) {
		return c.json(cached, 200, {
			"X-Cache": "HIT",
			"X-Reki": encodeURIComponent("🦌 cached trail"),
			"X-Reki-Source": "cache",
		});
	}

	// 2. Try Local Valhalla Container
	let routeData;
	let source = "edge";

	try {
		const container = getContainer(c.env.VALHALLA, "valhalla-router");
		const valhallaResp = await container.fetch(new Request("http://localhost:8002/route", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				...parsed,
				shape_format: "geojson",
				directions_options: { units: "kilometers", language: "en-US" },
			}),
		}));

		if (valhallaResp.ok) {
			routeData = await valhallaResp.json();
		} else {
			const errText = await valhallaResp.text();
			console.warn(`[Valhalla Edge Offline] Status: ${valhallaResp.status}. Error: ${errText}. Attempting FOSSGIS fallback.`);
			source = "fallback";
		}
	} catch (error) {
		console.warn("[Valhalla Edge Error] Exception occurred, attempting FOSSGIS fallback.", error);
		source = "fallback";
	}

	// 3. Fallback to FOSSGIS if local failed
	if (source === "fallback") {
		try {
			const fossgisResp = await fetch("https://valhalla1.openstreetmap.de/route", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					...parsed,
					shape_format: "geojson",
					directions_options: { units: "kilometers", language: "en-US" },
				}),
			});

			if (!fossgisResp.ok) {
				throw new Error(`FOSSGIS returned ${fossgisResp.status}`);
			}
			routeData = await fossgisResp.json();
		} catch (fallbackError) {
			logger.error("All routing methods failed", fallbackError, "ROUTING");
			return c.json({
				error: "Reki got lost",
				message: "All routing engines are taking a nap. Try again shortly.",
			}, 503);
		}
	}

	// 4. Cache & Return
	if (routeData) {
		c.executionCtx.waitUntil(
			c.env.ROUTE_CACHE.put(cacheKey, JSON.stringify(routeData), {
				expirationTtl: 86400,
			})
		);

		// Log route to D1 for analytics
		c.executionCtx.waitUntil(
			c.env.DB.prepare(
				"INSERT INTO route_logs (request_hash, created_at) VALUES (?, ?)"
			).bind(cacheKey, new Date().toISOString()).run()
		);

		return c.json(routeData, 200, {
			"X-Cache": "MISS",
			"X-Reki": encodeURIComponent(source === "edge" ? "🦌 fresh scouted trail" : "🦌 scouted via fallback"),
			"X-Reki-Source": source,
		});
	}

	return c.json({ error: "Routing failed" }, 500);
});

/**
 * GET /api/health
 * Verify DO health natively using RPC `getState()`
 */
routeRoutes.get("/health", async (c) => {
	try {
		const container = getContainer(c.env.VALHALLA, "valhalla-router");
		const state = await container.getState();
		
		return c.json({
			valhalla: state.status, // e.g., 'running', 'healthy', 'stopped'
			lastChange: state.lastChange,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		return c.json({
			valhalla: "offline",
			error: String(error),
			timestamp: new Date().toISOString(),
		}, 503);
	}
});
