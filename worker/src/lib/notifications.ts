/**
 * Notification helper
 */

export async function createNotification(
	db: D1Database,
	{
		user_id,
		type,
		title,
		body,
		link,
	}: {
		user_id: string;
		type: string;
		title: string;
		body: string;
		link?: string | null;
	},
): Promise<void> {
	try {
		await db.prepare(
			"INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)"
		).bind(user_id, type, title, body, link ?? null).run();
	} catch (error) {
		// Notifications are best-effort; don't fail the primary operation
		console.error("Failed to create notification", error);
	}
}
