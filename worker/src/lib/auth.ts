import type { Context } from "hono";

type UserRow = {
	id: string;
	email_hash: string;
	display_name: string | null;
	trust_level: number;
	contribution_count: number;
	badges: string;
	is_subscriber: number;
	subscription_tier: string | null;
	role: string;
	reputation_score: number;
	contributor_level: number;
	username: string | null;
	bio: string | null;
	avatar_url: string | null;
	social_links: string | null;
	public_key: string | null;
	created_at: string;
	last_active: string;
};

export async function getCurrentUser(c: Context<{ Bindings: Env }>): Promise<UserRow | null> {
	const authHeader = c.req.header("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return null;
	}

	const token = authHeader.split(" ")[1];
	const userId = await c.env.SESSIONS.get(`session:${token}`);
	if (!userId) {
		return null;
	}

	const user = await c.env.DB.prepare(
		"SELECT * FROM users WHERE id = ?"
	).bind(userId).first<UserRow>();

	return user ?? null;
}

export function isModerator(user: UserRow | null): boolean {
	if (!user) return false;
	return user.role === "admin" || user.role === "moderator";
}

export function canEditCurated(user: UserRow | null, ownerId: string | null): boolean {
	if (!user) return false;
	if (isModerator(user)) return true;
	return !!ownerId && user.id === ownerId;
}
