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
const KV_KEY = "TRAIL_OVERLAY_LEGEND_V3";
const CACHE_TTL = 86400; // 24h

const STREET_SUFFIX_RE = /\b(st|street|ave|avenue|rd|road|dr|drive|blvd|boulevard|ln|lane|way|cir|circle|ter|terrace|pl|place|ct|court|pkwy|parkway|run|loop)\b/i;

function isStreetNameLocalRoute(r: RouteInfo): boolean {
	// Named regional/national routes are always OK
	if (r.network && ["ncn", "rcn", "icn"].includes(r.network)) return false;
	// Many KC lcn relations are just generic street refs like "115th Street".
	// Filter those out when name and ref are the same street-style text.
	if (!r.name || !r.ref) return false;
	if (r.name.toLowerCase() !== r.ref.toLowerCase()) return false;
	return STREET_SUFFIX_RE.test(r.name);
}

interface RouteInfo {
	ref: string;
	name: string;
	network?: string;
	displayName: string;
	context?: string;
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

		// Build the most human-readable display name available.
		let displayName = t.official_name?.trim()
			|| name
			|| t.description?.trim()
			|| "";

		// If the best name is just the ref abbreviation again, try description/from-to.
		if (!displayName || displayName.toLowerCase() === (ref || "").toLowerCase()) {
			displayName = t.description?.trim()
				|| (t.from && t.to ? `${t.from.trim()} → ${t.to.trim()}` : "")
				|| ref
				|| "Unnamed route";
		}

		const contextParts: string[] = [];
		if (t.network === "ncn") contextParts.push("national bike route");
		else if (t.network === "rcn") contextParts.push("regional bike route");
		else if (t.network === "lcn") contextParts.push("local bike route");
		if (t.from && t.to && !displayName.includes("→")) {
			contextParts.push(`${t.from.trim()} → ${t.to.trim()}`);
		}

		routes.push({
			ref: ref || name || "",
			name: name || ref || "Unnamed route",
			displayName,
			network: t.network,
			context: contextParts.join(" · ") || undefined,
		});
	}

	// Sort by ref for stable display
	const filtered = routes.filter(r => !isStreetNameLocalRoute(r));

	const networkRank = { icn: 0, ncn: 1, rcn: 2, lcn: 3 };
	filtered.sort((a, b) => {
		const ra = networkRank[a.network as keyof typeof networkRank] ?? 4;
		const rb = networkRank[b.network as keyof typeof networkRank] ?? 4;
		if (ra !== rb) return ra - rb;
		return a.displayName.localeCompare(b.displayName);
	});

	// Cache in KV
	try {
		await c.env.ROUTE_CACHE.put(KV_KEY, JSON.stringify(filtered), { expirationTtl: CACHE_TTL });
	} catch (err) {
		logger.warn("Failed to cache trail legend", err, "LEGEND");
	}

	return c.json({ source: "overpass", routes: filtered });
});
