/**
 * /api/trail-overlay-legend
 *
 * Returns a mapping of local bicycle route refs to route names by querying
 * OSM bicycle route relations in the KC metro bbox. Result is cached in KV
 * for 24 hours to avoid hitting Overpass on every page load.
 */

import { Hono } from "hono";
import { logger } from "../lib/logger";

export const legendRoutes = new Hono<{ Bindings: Env }>();

const BBOX = "38.8,-95.0,39.4,-94.2";
const KV_KEY = "TRAIL_OVERLAY_LEGEND";
const CACHE_TTL = 86400; // 24h

interface RouteInfo {
	ref: string;
	name: string;
	network?: string;
}

legendRoutes.get("/", async (c) => {
	// Try KV cache first
	try {
		const cached = await c.env.ROUTE_CACHE.get(KV_KEY);
		if (cached) {
			return c.json({ source: "cache", routes: JSON.parse(cached) });
		}
	} catch (err) {
		logger.warn("Failed to read trail legend cache", err, "LEGEND");
	}

	const overpassQuery = `[out:json][timeout:60];relation["route"="bicycle"](${BBOX});out tags;`;
	const res = await fetch("https://overpass-api.de/api/interpreter", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"User-Agent": "bikeroutes.org/1.0 (contact@bikeroutes.org)",
		},
		body: new URLSearchParams({ data: overpassQuery }),
	});

	if (!res.ok) {
		logger.error("Overpass legend query failed", { status: res.status }, "LEGEND");
		return c.json({ error: "Could not fetch route legend" }, 502);
	}

	const data = await res.json() as { elements?: any[] };
	const routes: RouteInfo[] = [];
	const seen = new Set<string>();

	for (const e of data.elements || []) {
		const t = e.tags || {};
		const ref = t.ref?.trim();
		const name = t.name?.trim();
		if (!ref && !name) continue;
		const key = `${ref || ""}|${name || ""}`;
		if (seen.has(key)) continue;
		seen.add(key);
		routes.push({
			ref: ref || name || " unnamed",
			name: name || ref || "Unnamed route",
			network: t.network,
		});
	}

	// Sort by ref for stable display
	routes.sort((a, b) => a.ref.localeCompare(b.ref));

	// Cache in KV
	try {
		await c.env.ROUTE_CACHE.put(KV_KEY, JSON.stringify(routes), { expirationTtl: CACHE_TTL });
	} catch (err) {
		logger.warn("Failed to cache trail legend", err, "LEGEND");
	}

	return c.json({ source: "overpass", routes });
});
