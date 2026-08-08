import { Hono } from "hono";
import { getCurrentUser } from "../lib/auth";
import { logger } from "../lib/logger";
import { createNotification } from "../lib/notifications";

export const messageRoutes = new Hono<{ Bindings: Env }>();

function uuidv4(): string {
	return crypto.randomUUID();
}

function sanitizeString(input: unknown, max: number): string | null {
	if (typeof input !== "string") return null;
	const s = input.trim();
	if (s.length === 0) return null;
	return s.slice(0, max);
}

// Ensure a conversation exists between the current user and target user
messageRoutes.post("/conversations", async (c) => {
	const user = await getCurrentUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const { target_user_id } = await c.req.json<{ target_user_id?: string }>();
	if (!target_user_id) return c.json({ error: "target_user_id required" }, 400);
	if (target_user_id === user.id) return c.json({ error: "Cannot message yourself" }, 400);

	const target = await c.env.DB.prepare("SELECT 1 FROM users WHERE id = ?").bind(target_user_id).first();
	if (!target) return c.json({ error: "User not found" }, 404);

	try {
		// Look for existing 1:1 conversation
		const existing = await c.env.DB.prepare(
			`SELECT cp1.conversation_id FROM conversation_participants cp1
			 JOIN conversation_participants cp2 ON cp2.conversation_id = cp1.conversation_id
			 WHERE cp1.user_id = ? AND cp2.user_id = ?`
		).bind(user.id, target_user_id).first<{ conversation_id: string }>();

		if (existing) {
			return c.json({ conversation_id: existing.conversation_id }, 200);
		}

		const convId = uuidv4();
		await c.env.DB.prepare("INSERT INTO conversations (id) VALUES (?)").bind(convId).run();
		await c.env.DB.prepare(
			"INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)"
		).bind(convId, user.id, convId, target_user_id).run();

		return c.json({ conversation_id: convId }, 201);
	} catch (error) {
		logger.error("Failed to create conversation", error, "MESSAGES");
		return c.json({ error: "Failed to create conversation" }, 500);
	}
});

// List conversations for current user
messageRoutes.get("/conversations", async (c) => {
	const user = await getCurrentUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const { results } = await c.env.DB.prepare(
		`SELECT c.id, c.created_at,
		        u.id as other_user_id, u.display_name, u.username, u.avatar_url,
		        (SELECT body FROM direct_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_body,
		        (SELECT created_at FROM direct_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_at
		 FROM conversations c
		 JOIN conversation_participants cp ON cp.conversation_id = c.id
		 JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id != ?
		 JOIN users u ON u.id = cp2.user_id
		 WHERE cp.user_id = ?
		 ORDER BY last_at DESC, c.created_at DESC`
	).bind(user.id, user.id).all();

	return c.json({ conversations: results ?? [] });
});

// Get messages in a conversation
messageRoutes.get("/conversations/:id/messages", async (c) => {
	const user = await getCurrentUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);
	const convId = c.req.param("id");

	const participant = await c.env.DB.prepare(
		"SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?"
	).bind(convId, user.id).first();
	if (!participant) return c.json({ error: "Forbidden" }, 403);

	const limit = Math.min(100, parseInt(c.req.query("limit") ?? "50", 10) || 50);
	const { results } = await c.env.DB.prepare(
		`SELECT m.id, m.sender_id, m.body, m.created_at,
		        u.display_name, u.username, u.avatar_url
		 FROM direct_messages m
		 JOIN users u ON u.id = m.sender_id
		 WHERE m.conversation_id = ?
		 ORDER BY m.created_at DESC
		 LIMIT ?`
	).bind(convId, limit).all();

	return c.json({ messages: (results ?? []).reverse() });
});

// Send a message
messageRoutes.post("/conversations/:id/messages", async (c) => {
	const user = await getCurrentUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);
	const convId = c.req.param("id");
	const { body } = await c.req.json<{ body?: string }>();
	const text = sanitizeString(body, 4000);
	if (!text) return c.json({ error: "Message body required" }, 400);

	const participant = await c.env.DB.prepare(
		"SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?"
	).bind(convId, user.id).first();
	if (!participant) return c.json({ error: "Forbidden" }, 403);

	try {
		const id = uuidv4();
		await c.env.DB.prepare(
			"INSERT INTO direct_messages (id, conversation_id, sender_id, body) VALUES (?, ?, ?, ?)"
		).bind(id, convId, user.id, text).run();

		// Notify other conversation participants
		const recipients = await c.env.DB.prepare(
			"SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id != ?"
		).bind(convId, user.id).all<{ user_id: string }>();

		const senderName = user.display_name || user.username || "Someone";
		for (const r of recipients.results ?? []) {
			await createNotification(c.env.DB, {
				user_id: r.user_id,
				type: "dm",
				title: "New message",
				body: `${senderName}: ${text.slice(0, 80)}${text.length > 80 ? "…" : ""}`,
				link: `/messages?c=${convId}`,
			});
		}

		return c.json({ id, created_at: new Date().toISOString() }, 201);
	} catch (error) {
		logger.error("Failed to send message", error, "MESSAGES");
		return c.json({ error: "Failed to send message" }, 500);
	}
});
