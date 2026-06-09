/**
 * BikeRoutes.org API — Main Worker Entry
 *
 * Cloudflare Workers backend using Hono router.
 * Bindings: D1, KV (3), R2 (2), Vectorize, Durable Objects (3), Containers (1)
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "./lib/logger";
import { routeRoutes } from "./routes/route";
import { searchRoutes } from "./routes/search";
import { geocodeRoutes, reverseRoutes } from "./routes/geocode";
import { tileRoutes } from "./routes/tiles";
import { donateRoutes } from "./routes/donate";
import { poiRoutes } from "./routes/poi";
import { healthRoutes } from "./routes/health";
import { authRoutes } from "./routes/auth";
import { reportRoutes } from "./routes/reports";

// Re-export Durable Objects & Containers so Wrangler can find them
export { POIStore } from "./durable-objects/POIStore";
export { RouteSession } from "./durable-objects/RouteSession";
export { ValhallaContainer } from "./durable-objects/ValhallaContainer";

const app = new Hono<{ Bindings: Env }>();

// ─── Middleware ────────────────────────────────────────
app.use("*", cors({
	origin: ["https://bikeroutes.org", "http://localhost:5173"],
	allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowHeaders: ["Content-Type", "Authorization"],
	maxAge: 86400,
}));

// ─── Routes ───────────────────────────────────────────
app.route("/api/route", routeRoutes);
app.route("/api/search", searchRoutes);
app.route("/api/geocode", geocodeRoutes);
app.route("/api/reverse", reverseRoutes);
app.route("/api/tiles", tileRoutes);
app.route("/api/donate", donateRoutes);
app.route("/api/poi", poiRoutes);
app.route("/api/health", healthRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/reports", reportRoutes);

// ─── Temporary admin route to seed GIS data ────────────
app.get("/api/admin/sync-gis", async (c) => {
	const { syncGisData } = await import("./tasks/sync-gis");
	c.executionCtx.waitUntil(syncGisData(c.env));
	return c.json({ message: "GIS sync triggered. Check logs. 🦌" });
});

// ─── Temporary seed route for Vectorize ────────────────
app.get("/api/admin/seed-trails", async (c) => {
	const SAMPLE_TRAILS = [
		{ id: "trail_1", name: "Katy Trail", description: "Missouri's legendary 240-mile rail-trail following the Missouri River. Flat, scenic, and packed with history. Perfect for long-distance touring.", category: "paved", lat: 38.8, lon: -91.5 },
		{ id: "trail_2", name: "Burroughs Creek Trail", description: "Shaded riverside path in Lawrence, Kansas. Great for families and casual riding with plenty of birdwatching.", category: "paved", lat: 38.96, lon: -95.26 },
		{ id: "trail_3", name: "Trolley Track Trail", description: "Kansas City's first rail-trail conversion. Urban greenway through Brookside and Waldo with cafes and shops nearby.", category: "paved", lat: 39.05, lon: -94.59 },
		{ id: "trail_4", name: "Loose Park Loops", description: "Quiet paved loops around one of KC's most beautiful parks. Shaded by oak trees with a rose garden pit stop.", category: "paved", lat: 39.03, lon: -94.59 },
		{ id: "trail_5", name: "Shawnee Mission Park Trails", description: "Mixed-surface trails around a large lake. Includes gravel sections through prairie restoration areas.", category: "gravel", lat: 38.99, lon: -94.73 },
		{ id: "trail_6", name: "Swope Park MTB Trail", description: "Technical singletrack through wooded hills. Roots, rocks, and berms for intermediate mountain bikers.", category: "mtb", lat: 39.00, lon: -94.53 },
		{ id: "trail_7", name: "Clinton Lake North Shore", description: "Rugged lakeside trails with steep climbs and fast descents. Popular with Kansas mountain bikers.", category: "mtb", lat: 38.93, lon: -95.38 },
		{ id: "trail_8", name: "Little Blue Trace", description: "Easy paved trail following the Little Blue River. Gentle grades and connecting to multiple neighborhoods.", category: "paved", lat: 39.05, lon: -94.42 },
		{ id: "trail_9", name: "Blue River Parkway", description: "Forested dirt and gravel paths along the Blue River. Wildflowers in spring, serene in all seasons.", category: "dirt", lat: 38.92, lon: -94.58 },
		{ id: "trail_10", name: "Indian Creek Trail", description: "Suburban greenway connecting Overland Park neighborhoods. Paved with water fountains and rest stops.", category: "paved", lat: 38.93, lon: -94.67 },
		{ id: "trail_11", name: "Rock Island Spur", description: "Gravel rail-trail branching off the Katy Trail. Quiet rural riding through Missouri farmland.", category: "gravel", lat: 38.6, lon: -92.1 },
		{ id: "trail_12", name: "Tomahawk Creek Trail", description: "Paved path through Leawood with public art installations and native landscaping. Very family-friendly.", category: "paved", lat: 38.92, lon: -94.62 },
	];

	const texts = SAMPLE_TRAILS.map(t => `${t.name}. ${t.description}. Category: ${t.category}`);

	const embedResp = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", { text: texts }) as { data: number[][] };

	const vectors = embedResp.data.map((values, i) => ({
		id: SAMPLE_TRAILS[i].id,
		values,
		metadata: SAMPLE_TRAILS[i] as unknown as Record<string, string | number | boolean>,
	}));

	await c.env.TRAIL_SEARCH.upsert(vectors);

	return c.json({
		message: `Seeded ${vectors.length} trails into Vectorize! 🦌`,
		trails: SAMPLE_TRAILS.map(t => t.name),
	});
});

// ─── Fallthrough to static assets ─────────────────────
// With run_worker_first: ["/api/*"], the Worker only runs for API routes.
// If a request somehow reaches here (e.g. /api/unknown), return 404.
app.all("/*", (c) => {
	return c.json({
		error: "Trail not found",
		message: "Reki couldn't find that API endpoint. Try /api/health? 🦌",
		status: 404,
	}, 404);
});

// ─── Error handler ────────────────────────────────────
app.onError((err, c) => {
	logger.error("Worker unhandled exception", err);
	return c.json({
		error: "Reki tripped on a root",
		message: "Something went wrong. Try again in a sec.",
		status: 500,
	}, 500);
});

// ─── Scheduled (cron) handler ─────────────────────────
import { syncGisData } from "./tasks/sync-gis";

const scheduled: ExportedHandlerScheduledHandler<Env> = async (event, env, ctx) => {
	logger.info("Scheduled event triggered", { cron: event.cron, time: new Date().toISOString() }, "CRON");

	try {
		// Run the MARC GIS Sync
		await syncGisData(env);

		// Record heartbeat
		await env.ROUTE_CACHE.put("LAST_CRON_TRIGGER", new Date().toISOString(), {
			expirationTtl: 86400 * 7, // keep for 7 days
		});

		logger.info("Scheduled tasks completed successfully", undefined, "CRON");
	} catch (error) {
		logger.error("Scheduled tasks failed", error, "CRON");
	}
};

export default {
	fetch: app.fetch,
	scheduled,
} satisfies ExportedHandler<Env>;
