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
import { geocodeRoutes } from "./routes/geocode";
import { searchRoutes } from "./routes/search";
import { tileRoutes } from "./routes/tiles";
import { donateRoutes } from "./routes/donate";
import { poiRoutes } from "./routes/poi";
import { healthRoutes } from "./routes/health";
import { authRoutes } from "./routes/auth";
import { reportRoutes } from "./routes/reports";
import { ingestRoutes } from "./routes/ingest";

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
app.route("/api/admin/ingest", ingestRoutes);

// ─── Legacy redirect: old seed endpoint → new ingest endpoint ───
app.get("/api/admin/seed-trails", async (c) => {
	return c.json({
		message: "This endpoint is retired. Use POST /api/admin/ingest?source=d1 or source=osm",
		hint: "Requires X-Admin-Secret header",
	}, 410);
});

app.post("/api/admin/sync-gis", async (c) => {
	const secret = c.req.header("X-Admin-Secret");
	if (!secret || secret !== c.env.ADMIN_SECRET) {
		return c.json({ error: "Unauthorized" }, 403);
	}
	try {
		await syncGisData(c.env);
		return c.json({ message: "MARC GIS sync complete 🦌" });
	} catch (e) {
		return c.json({ error: "Sync failed", message: String(e) }, 500);
	}
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
