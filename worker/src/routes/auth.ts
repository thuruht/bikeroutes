import { Hono } from "hono";
import { getCurrentUser } from "../lib/auth";
import { logger } from "../lib/logger";
import { checkRateLimit, getClientIP } from "../lib/rate-limit";

export const authRoutes = new Hono<{ Bindings: Env }>();

const MAX_LOGIN_REQUESTS = 5; // per IP per window
const LOGIN_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 20; // per IP per window
const VERIFY_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS_PER_EMAIL = 10; // after this, delete code

async function sendLoginCode(email: string, code: string, env: Env): Promise<boolean> {
	try {
		await env.EMAIL.send({
			to: email,
			from: { email: "noreply@bikeroutes.org", name: "BikeRoutes.org" },
			replyTo: "hello@bikeroutes.org",
			subject: `Your BikeRoutes login code: ${code}`,
			text: `Your one-time login code is: ${code}\n\nIt expires in 15 minutes.\n\n— BikeRoutes.org`,
			html: `<div style="font-family:system-ui,sans-serif;max-width:320px;margin:24px auto;">` +
				`<h2 style="color:#7a9a8c;">BikeRoutes login code</h2>` +
				`<p style="font-size:16px;">Your one-time code is:</p>` +
				`<p style="font-size:28px;letter-spacing:4px;font-weight:700;">${code}</p>` +
				`<p style="color:#666;font-size:13px;">It expires in 15 minutes.</p>` +
				`<p style="color:#999;font-size:12px;">— BikeRoutes.org</p>` +
				`</div>`,
		});
		return true;
	} catch (error) {
		logger.error("Failed to send login email", error, "EMAIL");
		return false;
	}
}

// Simple SHA-256 for email hashing to avoid storing plaintext PII
async function hashEmail(email: string): Promise<string> {
	const msgUint8 = new TextEncoder().encode(email.trim().toLowerCase());
	const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Request Magic Code ───────────────────────────────────────────
authRoutes.post("/request", async (c) => {
	const body = await c.req.json();
	const email = body.email;
	const ip = getClientIP(c);

	if (!email || !email.includes("@")) {
		return c.json({ error: "Invalid email" }, 400);
	}

	const { allowed, remaining } = await checkRateLimit(
		c.env.RATE_LIMITS,
		`login_request:${ip}`,
		MAX_LOGIN_REQUESTS,
		LOGIN_REQUEST_WINDOW_MS,
	);
	if (!allowed) {
		return c.json({ error: "Too many login attempts. Try again later." }, 429, {
			"Retry-After": String(LOGIN_REQUEST_WINDOW_MS / 1000),
		});
	}

	const emailHash = await hashEmail(email);

	// Generate a 6-digit code
	const code = Math.floor(100000 + Math.random() * 900000).toString();

	// Store code in KV for 15 minutes
	await c.env.SESSIONS.put(`login_code:${emailHash}`, code, { expirationTtl: 900 });

	const sent = await sendLoginCode(email, code, c.env);
	if (!sent) {
		return c.json({ error: "Could not send email. Try again later." }, 502);
	}
	return c.json({ message: "Code emailed. Check your inbox.", remaining });
});

// ─── Verify Magic Code ────────────────────────────────────────────
authRoutes.post("/verify", async (c) => {
	const body = await c.req.json();
	const email = body.email;
	const code = body.code;
	const ip = getClientIP(c);

	if (!email || !code) {
		return c.json({ error: "Missing email or code" }, 400);
	}

	const { allowed } = await checkRateLimit(
		c.env.RATE_LIMITS,
		`login_verify:${ip}`,
		MAX_VERIFY_ATTEMPTS,
		VERIFY_WINDOW_MS,
	);
	if (!allowed) {
		return c.json({ error: "Too many verification attempts. Try again later." }, 429, {
			"Retry-After": String(VERIFY_WINDOW_MS / 1000),
		});
	}

	const emailHash = await hashEmail(email);

	const storedCode = await c.env.SESSIONS.get(`login_code:${emailHash}`);
	if (!storedCode || storedCode !== code) {
		const failKey = `login_fail:${emailHash}`;
		const raw = await c.env.SESSIONS.get(failKey, "json") as { count: number } | null;
		const count = (raw?.count || 0) + 1;
		if (count >= MAX_FAILED_ATTEMPTS_PER_EMAIL) {
			await c.env.SESSIONS.delete(`login_code:${emailHash}`);
			await c.env.SESSIONS.delete(failKey);
			logger.warn(`Login code invalidated after ${count} failed attempts`, { emailHash: emailHash.slice(0, 8) }, "AUTH");
			return c.json({ error: "Too many failed attempts. Request a new code." }, 429);
		}
		await c.env.SESSIONS.put(failKey, JSON.stringify({ count }), { expirationTtl: 900 });
		return c.json({ error: "Invalid or expired code" }, 401);
	}

	await c.env.SESSIONS.delete(`login_fail:${emailHash}`);

	// Delete the code so it can't be reused
	await c.env.SESSIONS.delete(`login_code:${emailHash}`);

	// Check if user exists in D1
	let userId: string;
	const existingUser = await c.env.DB.prepare(
		"SELECT id FROM users WHERE email_hash = ?"
	).bind(emailHash).first();

	if (existingUser) {
		userId = existingUser.id as string;
	} else {
		// Create new user
		const res = await c.env.DB.prepare(
			"INSERT INTO users (email_hash) VALUES (?) RETURNING id"
		).bind(emailHash).first();
		userId = res?.id as string;
	}

	// Generate a session token
	const sessionToken = crypto.randomUUID();
	await c.env.SESSIONS.put(`session:${sessionToken}`, userId, { expirationTtl: 604800 }); // 7 days

	return c.json({ 
		message: "Authenticated successfully",
		session_token: sessionToken,
		user_id: userId
	});
});

// ─── Public user lookup by username ─────────────────────────────────
authRoutes.get("/users/:username", async (c) => {
	const username = c.req.param("username").toLowerCase().trim();
	if (!username) return c.json({ error: "Username required" }, 400);

	const user = await c.env.DB.prepare(
		"SELECT id, username, display_name, avatar_url, bio, contribution_count, public_key FROM users WHERE username = ?"
	).bind(username).first();

	if (!user) return c.json({ error: "User not found" }, 404);
	return c.json({ user });
});

// ─── Get Current User ──────────────────────────────────────────────
authRoutes.get("/me", async (c) => {
	const authHeader = c.req.header("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const token = authHeader.split(" ")[1];
	const userId = await c.env.SESSIONS.get(`session:${token}`);

	if (!userId) {
		return c.json({ error: "Invalid session" }, 401);
	}

	const user = await c.env.DB.prepare(
		"SELECT id, email_hash, display_name, username, bio, avatar_url, social_links, trust_level, contribution_count, badges, role, created_at, last_active, public_key FROM users WHERE id = ?"
	).bind(userId).first();

	if (!user) {
		return c.json({ error: "User not found" }, 404);
	}

	return c.json({ user });
});

// ─── Register/update device public key for end-to-end encrypted DMs ─
authRoutes.put("/public-key", async (c) => {
	const user = await getCurrentUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const body = await c.req.json<{ public_key?: string }>();
	const key = typeof body.public_key === "string" ? body.public_key.trim() : "";
	// SPKI base64 for a 2048-bit RSA key is ~392 chars; allow some slack
	if (!key || key.length < 64 || key.length > 4096) {
		return c.json({ error: "Invalid public key" }, 400);
	}

	await c.env.DB.prepare("UPDATE users SET public_key = ? WHERE id = ?").bind(key, user.id).run();
	return c.json({ message: "Public key updated" });
});

// ─── Update Profile ─────────────────────────────────────────────────
authRoutes.put("/profile", async (c) => {
	const user = await getCurrentUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const body = await c.req.json<{
		display_name?: string;
		username?: string;
		bio?: string;
		social_links?: any;
	}>();

	const updates: Record<string, any> = {};
	if (body.display_name !== undefined) updates.display_name = body.display_name.trim().slice(0, 80) || null;
	if (body.username !== undefined) {
		const username = body.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30);
		if (username) {
			const taken = await c.env.DB.prepare("SELECT 1 FROM users WHERE username = ? AND id != ?").bind(username, user.id).first();
			if (taken) return c.json({ error: "Username taken" }, 409);
			updates.username = username;
		} else {
			updates.username = null;
		}
	}
	if (body.bio !== undefined) updates.bio = body.bio.trim().slice(0, 500) || null;
	if (body.social_links !== undefined) {
		try { updates.social_links = JSON.stringify(body.social_links); }
		catch { updates.social_links = null; }
	}

	if (Object.keys(updates).length === 0) {
		return c.json({ error: "No fields to update" }, 400);
	}

	const setClause = Object.keys(updates).map(k => `${k} = ?`).join(", ");
	await c.env.DB.prepare(`UPDATE users SET ${setClause} WHERE id = ?`).bind(...Object.values(updates), user.id).run();
	return c.json({ message: "Profile updated" });
});

// ─── Upload Avatar ──────────────────────────────────────────────────
authRoutes.post("/avatar", async (c) => {
	const user = await getCurrentUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	let body: ArrayBuffer | null = null;
	let fileName = "avatar";
	let contentType = "application/octet-stream";

	const contentTypeHeader = c.req.header("content-type") ?? "";
	if (contentTypeHeader.includes("multipart/form-data")) {
		const form = await c.req.formData();
		const file = form.get("file");
		if (!file || !(file instanceof File)) return c.json({ error: "No file" }, 400);
		body = await file.arrayBuffer();
		fileName = file.name;
		contentType = file.type || "application/octet-stream";
	} else {
		body = await c.req.arrayBuffer();
		fileName = c.req.header("x-file-name") ?? "avatar";
		contentType = contentTypeHeader || "application/octet-stream";
	}
	if (!body || body.byteLength === 0) return c.json({ error: "Empty file" }, 400);
	if (body.byteLength > 2 * 1024 * 1024) return c.json({ error: "Max 2MB" }, 413);

	const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
	const allowed = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
	if (!allowed.has(ext) && !contentType.startsWith("image/")) {
		return c.json({ error: "Images only" }, 415);
	}

	const key = `avatars/${user.id}/${crypto.randomUUID()}.${ext || "png"}`;
	try {
		await c.env.R2_ASSETS.put(key, body, { httpMetadata: { contentType }, customMetadata: { userId: user.id } });
		const url = `/api/community/media/${encodeURIComponent(key)}`;
		await c.env.DB.prepare("UPDATE users SET avatar_url = ? WHERE id = ?").bind(url, user.id).run();
		return c.json({ success: true, url, key });
	} catch (error) {
		logger.error("Avatar upload failed", error, "AUTH");
		return c.json({ error: "Upload failed" }, 500);
	}
});
