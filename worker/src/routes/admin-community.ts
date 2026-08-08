/**
 * /api/admin/community — Community moderation endpoints
 * All routes require a signed-in admin or moderator.
 */

import { Hono } from "hono";
import type { Context } from "hono";
import { getCurrentUser, isModerator } from "../lib/auth";
import { logger } from "../lib/logger";

export const adminCommunityRoutes = new Hono<{ Bindings: Env }>();

function forbidden() {
	return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
}

function badRequest(message: string) {
	return new Response(JSON.stringify({ error: message }), { status: 400, headers: { "Content-Type": "application/json" } });
}

// ─── List reports ─────────────────────────────────────────────────
adminCommunityRoutes.get("/reports", async (c) => {
	const user = await getCurrentUser(c);
	if (!user || !isModerator(user)) return forbidden();

	const status = c.req.query("status") || "open";
	const validStatuses = ["open", "resolved", "dismissed"];
	const filter = validStatuses.includes(status) ? status : "open";

	try {
		const { results } = await c.env.DB.prepare(
			`SELECT r.id, r.post_id, r.comment_id, r.reporter_id, r.reason, r.status, r.moderator_note, r.created_at,
			        p.body AS post_body,
			        c.body AS comment_body,
			        rep.display_name AS reporter_display_name, rep.username AS reporter_username,
			        cu.display_name AS comment_author_display_name, cu.username AS comment_author_username
			 FROM community_reports r
			 LEFT JOIN community_posts p ON p.id = r.post_id
			 LEFT JOIN community_post_comments c ON c.id = r.comment_id
			 LEFT JOIN users rep ON rep.id = r.reporter_id
			 LEFT JOIN users cu ON cu.id = c.user_id
			 WHERE r.status = ?
			 ORDER BY r.created_at DESC
			 LIMIT 100`
		).bind(filter).all();

		return c.json({ reports: results ?? [] });
	} catch (error) {
		logger.error("Failed to list community reports", error, "ADMIN_COMMUNITY");
		return c.json({ error: "Failed to load reports" }, 500);
	}
});

// ─── Resolve / dismiss report ─────────────────────────────────────
async function updateReportStatus(c: Context<{ Bindings: Env }>, status: "resolved" | "dismissed") {
	const user = await getCurrentUser(c);
	if (!user || !isModerator(user)) return forbidden();

	const id = c.req.param("id");
	const body = await c.req.json<{ moderator_note?: string }>().catch(() => ({ moderator_note: undefined } as { moderator_note?: string }));
	const note = typeof body.moderator_note === "string" ? body.moderator_note.slice(0, 500) : null;

	try {
		await c.env.DB.prepare(
			"UPDATE community_reports SET status = ?, moderator_note = ?, updated_at = datetime('now') WHERE id = ?"
		).bind(status, note, id).run();
		return c.json({ success: true });
	} catch (error) {
		logger.error(`Failed to ${status} report`, error, "ADMIN_COMMUNITY");
		return c.json({ error: "Failed to update report" }, 500);
	}
}

adminCommunityRoutes.post("/reports/:id/resolve", async (c) => updateReportStatus(c, "resolved"));
adminCommunityRoutes.post("/reports/:id/dismiss", async (c) => updateReportStatus(c, "dismissed"));

// ─── Set post status ──────────────────────────────────────────────
adminCommunityRoutes.post("/posts/:id/status", async (c) => {
	const user = await getCurrentUser(c);
	if (!user || !isModerator(user)) return forbidden();

	const id = c.req.param("id");
	const body = await c.req.json<{ status?: string }>();
	if (!["active", "hidden"].includes(body.status || "")) {
		return badRequest("Status must be active or hidden");
	}

	try {
		await c.env.DB.prepare(
			"UPDATE community_posts SET status = ?, updated_at = datetime('now') WHERE id = ?"
		).bind(body.status, id).run();
		return c.json({ success: true });
	} catch (error) {
		logger.error("Failed to set post status", error, "ADMIN_COMMUNITY");
		return c.json({ error: "Failed to update post" }, 500);
	}
});

// ─── Set comment status ─────────────────────────────────────────────
adminCommunityRoutes.post("/comments/:id/status", async (c) => {
	const user = await getCurrentUser(c);
	if (!user || !isModerator(user)) return forbidden();

	const id = c.req.param("id");
	const body = await c.req.json<{ status?: string }>();
	if (!["active", "hidden"].includes(body.status || "")) {
		return badRequest("Status must be active or hidden");
	}

	try {
		await c.env.DB.prepare(
			"UPDATE community_post_comments SET status = ?, updated_at = datetime('now') WHERE id = ?"
		).bind(body.status, id).run();
		return c.json({ success: true });
	} catch (error) {
		logger.error("Failed to set comment status", error, "ADMIN_COMMUNITY");
		return c.json({ error: "Failed to update comment" }, 500);
	}
});
