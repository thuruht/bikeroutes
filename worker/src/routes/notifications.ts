/**
 * /api/notifications
 */

import { Hono } from "hono";
import { getCurrentUser } from "../lib/auth";
import { logger } from "../lib/logger";

export const notificationRoutes = new Hono<{ Bindings: Env }>();

notificationRoutes.get("/", async (c) => {
	const user = await getCurrentUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	try {
		const { results } = await c.env.DB.prepare(
			`SELECT id, type, title, body, link, is_read, created_at FROM notifications
			 WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`
		).bind(user.id).all<{ id: string; type: string; title: string; body: string; link: string | null; is_read: number; created_at: string }>();

		const items = results?.map(r => ({
			id: r.id,
			type: r.type,
			title: r.title,
			body: r.body,
			link: r.link,
			isRead: !!r.is_read,
			createdAt: r.created_at,
		})) ?? [];
		const unreadCount = items.filter(i => !i.isRead).length;

		return c.json({ notifications: items, unreadCount });
	} catch (error) {
		logger.error("Failed to fetch notifications", error, "NOTIFICATIONS");
		return c.json({ error: "Failed to fetch notifications" }, 500);
	}
});

notificationRoutes.post("/:id/read", async (c) => {
	const user = await getCurrentUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);
	const id = c.req.param("id");

	try {
		const result = await c.env.DB.prepare(
			"UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?"
		).bind(id, user.id).run();
		return c.json({ success: result.meta?.changes > 0 });
	} catch (error) {
		logger.error("Failed to mark notification read", error, "NOTIFICATIONS");
		return c.json({ error: "Failed to mark read" }, 500);
	}
});

notificationRoutes.post("/read-all", async (c) => {
	const user = await getCurrentUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	try {
		await c.env.DB.prepare(
			"UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0"
		).bind(user.id).run();
		return c.json({ success: true });
	} catch (error) {
		logger.error("Failed to mark all notifications read", error, "NOTIFICATIONS");
		return c.json({ error: "Failed to mark all read" }, 500);
	}
});
