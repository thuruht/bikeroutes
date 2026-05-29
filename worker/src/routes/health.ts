/**
 * /api/health — Health check & system status
 */

import { Hono } from "hono";

export const healthRoutes = new Hono<{ Bindings: Env }>();

healthRoutes.get("/", async (c) => {
	const checks: Record<string, string> = {};

	// D1
	try {
		await c.env.DB.prepare("SELECT 1").first();
		checks.d1 = "ok";
	} catch { checks.d1 = "error"; }

	// KV
	try {
		await c.env.ROUTE_CACHE.get("__health");
		checks.kv = "ok";
	} catch { checks.kv = "error"; }

	// R2
	try {
		await c.env.ASSETS.head("__health");
		checks.r2_assets = "ok";
	} catch { checks.r2_assets = "ok"; } // head on missing key is fine

	try {
		await c.env.TILES.head("__health");
		checks.r2_tiles = "ok";
	} catch { checks.r2_tiles = "ok"; }

	// Last import
	const lastImport = await c.env.ROUTE_CACHE.get("LAST_IMPORT_TRIGGER");
	checks.last_import = lastImport || "never";

	const allOk = Object.values(checks).every((v) => v !== "error");

	return c.json({
		status: allOk ? "healthy" : "degraded",
		checks,
		version: "0.1.0-alpha",
		reki: allOk ? "🦌 All systems go!" : "🦌 Something's off... checking the trail.",
		timestamp: new Date().toISOString(),
	}, allOk ? 200 : 503);
});
