/**
 * BikeRoutes.org API — Main Worker Entry
 *
 * Cloudflare Workers backend using Hono router.
 * Bindings: D1, KV (3), R2 (2), Vectorize, Durable Objects (3), Containers (1)
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { routeRoutes } from "./routes/route";
import { searchRoutes } from "./routes/search";
import { tileRoutes } from "./routes/tiles";
import { donateRoutes } from "./routes/donate";
import { poiRoutes } from "./routes/poi";
import { healthRoutes } from "./routes/health";

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
app.route("/api/tiles", tileRoutes);
app.route("/api/donate", donateRoutes);
app.route("/api/poi", poiRoutes);
app.route("/api/health", healthRoutes);

// ─── Root ─────────────────────────────────────────────
app.get("/", (c) => {
	return c.json({
		name: "BikeRoutes.org API",
		version: "0.1.0-alpha",
		mascot: "🦌 Reki",
		status: "scouting trails...",
		endpoints: {
			route: "POST /api/route",
			search: "GET /api/search?q=...",
			tiles: "GET /api/tiles/:z/:x/:y.pbf",
			donate: "POST /api/donate/create-order",
			poi: "GET /api/poi?geohash=...",
			health: "GET /api/health",
		},
	});
});

// ─── 404 ──────────────────────────────────────────────
app.notFound((c) => {
	return c.json({
		error: "Trail not found",
		message: "Reki couldn't find that path. Try a different route? 🦌",
		status: 404,
	}, 404);
});

// ─── Error handler ────────────────────────────────────
app.onError((err, c) => {
	console.error("Worker error:", err);
	return c.json({
		error: "Reki tripped on a root",
		message: "Something went wrong. Try again in a sec.",
		status: 500,
	}, 500);
});

// ─── Scheduled (cron) handler ─────────────────────────
const scheduled: ExportedHandlerScheduledHandler<Env> = async (event, env, ctx) => {
	console.log(`[CRON] Daily OSM import triggered at ${new Date().toISOString()}`);

	try {
		// 1. Signal the VPS to start OSM import
		// TODO: Replace with actual VPS webhook URL
		// await fetch(env.VPS_IMPORT_WEBHOOK_URL, { method: "POST" });

		// 2. Record heartbeat
		await env.ROUTE_CACHE.put("LAST_IMPORT_TRIGGER", new Date().toISOString(), {
			expirationTtl: 86400 * 7, // keep for 7 days
		});

		console.log("[CRON] Import trigger sent successfully");
	} catch (error) {
		console.error("[CRON] Import trigger failed:", error);
	}
};

export default {
	fetch: app.fetch,
	scheduled,
} satisfies ExportedHandler<Env>;
