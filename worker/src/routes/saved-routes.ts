/**
 * /api/saved-routes
 */

import { Hono } from "hono";
import { getCurrentUser } from "../lib/auth";
import { logger } from "../lib/logger";

export const savedRouteRoutes = new Hono<{ Bindings: Env }>();

savedRouteRoutes.get("/", async (c) => {
	const user = await getCurrentUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	try {
		const { results } = await c.env.DB.prepare(
			`SELECT id, name, description, distance_km, duration_min, costing, created_at FROM saved_routes
			 WHERE user_id = ? ORDER BY created_at DESC LIMIT 200`
		).bind(user.id).all<{ id: string; name: string; description: string | null; distance_km: number | null; duration_min: number | null; costing: string | null; created_at: string }>();

		return c.json({ routes: results ?? [] });
	} catch (error) {
		logger.error("Failed to list saved routes", error, "SAVED_ROUTES");
		return c.json({ error: "Failed to load routes" }, 500);
	}
});

savedRouteRoutes.get("/:id", async (c) => {
	const user = await getCurrentUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);
	const id = c.req.param("id");

	try {
		const row = await c.env.DB.prepare(
			`SELECT id, name, description, waypoints, geometry, costing, distance_km, duration_min, created_at
			 FROM saved_routes WHERE id = ? AND user_id = ?`
		).bind(id, user.id).first<{ id: string; name: string; description: string | null; waypoints: string; geometry: string | null; costing: string | null; distance_km: number | null; duration_min: number | null; created_at: string }>();

		if (!row) return c.json({ error: "Route not found" }, 404);

		return c.json({
			route: {
				...row,
				waypoints: JSON.parse(row.waypoints),
				geometry: row.geometry ? JSON.parse(row.geometry) : null,
			},
		});
	} catch (error) {
		logger.error("Failed to get saved route", error, "SAVED_ROUTES");
		return c.json({ error: "Failed to load route" }, 500);
	}
});

savedRouteRoutes.post("/", async (c) => {
	const user = await getCurrentUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const body = await c.req.json<{
		name?: string;
		description?: string;
		waypoints?: Array<{ lat: number; lon: number; label?: string }>;
		geometry?: object;
		costing?: string;
		distanceKm?: number;
		durationMin?: number;
	}>();

	const name = (body.name || " Saved route").trim().slice(0, 120);
	if (!name) return c.json({ error: "Route name required" }, 400);
	if (!Array.isArray(body.waypoints) || body.waypoints.length < 2) {
		return c.json({ error: "At least two waypoints required" }, 400);
	}

	try {
		const id = crypto.randomUUID();
		await c.env.DB.prepare(
			`INSERT INTO saved_routes (id, user_id, name, description, waypoints, geometry, costing, distance_km, duration_min)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		).bind(
			id,
			user.id,
			name,
			(body.description ?? "").slice(0, 500) || null,
			JSON.stringify(body.waypoints),
			body.geometry ? JSON.stringify(body.geometry) : null,
			body.costing ?? null,
			body.distanceKm ?? null,
			body.durationMin ?? null,
		).run();

		return c.json({ id, message: "Route saved" }, 201);
	} catch (error) {
		logger.error("Failed to save route", error, "SAVED_ROUTES");
		return c.json({ error: "Failed to save route" }, 500);
	}
});

savedRouteRoutes.delete("/:id", async (c) => {
	const user = await getCurrentUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);
	const id = c.req.param("id");

	try {
		await c.env.DB.prepare("DELETE FROM saved_routes WHERE id = ? AND user_id = ?").bind(id, user.id).run();
		return c.json({ success: true });
	} catch (error) {
		logger.error("Failed to delete saved route", error, "SAVED_ROUTES");
		return c.json({ error: "Failed to delete route" }, 500);
	}
});
