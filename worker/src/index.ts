/**
 * BikeRoutes.org API — Main Worker Entry
 *
 * Cloudflare Workers backend using Hono router.
 * Bindings: D1, KV (3), R2 (2), Vectorize, Durable Objects (3), Containers (1)
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { routeRoutes } from "./routes/route";
import { geocodeRoutes } from "./routes/geocode";
import { searchRoutes } from "./routes/search";
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
app.route("/api", geocodeRoutes);      // mounts /api/geocode + /api/reverse
app.route("/api/search", searchRoutes);
app.route("/api/tiles", tileRoutes);
app.route("/api/donate", donateRoutes);
app.route("/api/poi", poiRoutes);
app.route("/api/health", healthRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/reports", reportRoutes);

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
	console.error("Worker error:", err);
	return c.json({
		error: "Reki tripped on a root",
		message: "Something went wrong. Try again in a sec.",
		status: 500,
	}, 500);
});

// ─── Scheduled (cron) handler ─────────────────────────
import { syncGisData } from "./tasks/sync-gis";

const scheduled: ExportedHandlerScheduledHandler<Env> = async (event, env, ctx) => {
	console.log(`[CRON] Scheduled event triggered at ${new Date().toISOString()} via ${event.cron}`);

	try {
		// Run the MARC GIS Sync
		await syncGisData(env);

		// Record heartbeat
		await env.ROUTE_CACHE.put("LAST_CRON_TRIGGER", new Date().toISOString(), {
			expirationTtl: 86400 * 7, // keep for 7 days
		});

		console.log("[CRON] All scheduled tasks completed successfully");
	} catch (error) {
		console.error("[CRON] Scheduled tasks failed:", error);
	}
};

export default {
	fetch: app.fetch,
	scheduled,
} satisfies ExportedHandler<Env>;
