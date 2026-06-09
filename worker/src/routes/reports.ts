import { Hono } from "hono";
import { logger } from "../lib/logger";

export const reportRoutes = new Hono<{ Bindings: Env }>();

// Helper to get user ID from session
async function getUserId(c: any): Promise<string | null> {
	const authHeader = c.req.header("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
	
	const token = authHeader.split(" ")[1];
	try {
		const userId = await c.env.SESSIONS.get(`session:${token}`);
		return userId || null;
	} catch (error) {
		logger.error("Failed to retrieve session from KV", error, "AUTH");
		return null;
	}
}

// ─── Get Active Reports ──────────────────────────────────────────
reportRoutes.get("/", async (c) => {
	// Only fetch active reports where expires_at > now
	const stmt = c.env.DB.prepare(`
		SELECT r.id, r.poi_id, r.lat, r.lon, r.type, r.description, r.status, r.created_at, u.display_name
		FROM reports r
		LEFT JOIN users u ON r.user_id = u.id
		WHERE r.status = 'active' AND datetime(r.expires_at) > datetime('now')
		ORDER BY r.created_at DESC
		LIMIT 50
	`);
	
	const { results } = await stmt.all();
	
	return c.json({ reports: results });
});

// ─── Submit a Report ─────────────────────────────────────────────
reportRoutes.post("/", async (c) => {
	const userId = await getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized. Please sign in to submit a report." }, 401);
	}

	const body = await c.req.json();
	const { lat, lon, type, description, poi_id } = body;

	if (!lat || !lon || !type) {
		return c.json({ error: "Missing required fields: lat, lon, type" }, 400);
	}

	// Calculate expiration (48 hours from now)
	const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
	
	const stmt = c.env.DB.prepare(`
		INSERT INTO reports (lat, lon, type, description, poi_id, user_id, expires_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		RETURNING id, created_at
	`);

	const result = await stmt.bind(
		lat, 
		lon, 
		type, 
		description || null, 
		poi_id || null, 
		userId,
		expiresAt
	).first();

	// Reward user for contributing
	c.executionCtx.waitUntil(
		c.env.DB.prepare("UPDATE users SET contribution_count = contribution_count + 1 WHERE id = ?").bind(userId).run()
	);

	return c.json({ 
		message: "Report submitted successfully",
		report: result
	});
});
