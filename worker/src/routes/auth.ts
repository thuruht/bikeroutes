import { Hono } from "hono";
import { logger } from "../lib/logger";

export const authRoutes = new Hono<{ Bindings: Env }>();

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

	if (!email || !email.includes("@")) {
		return c.json({ error: "Invalid email" }, 400);
	}

	const emailHash = await hashEmail(email);
	
	// Generate a 6-digit code
	const code = Math.floor(100000 + Math.random() * 900000).toString();

	// Store code in KV for 15 minutes
	await c.env.SESSIONS.put(`login_code:${emailHash}`, code, { expirationTtl: 900 });

	const sent = await sendLoginCode(email, code, c.env);
	const isLocalDev = c.req.header('origin')?.includes('localhost') ?? false;
	const response: { message: string; dev_code?: string } = {
		message: sent ? "Code emailed. Check your inbox." : "Email failed — use the dev code if available."
	};
	if (isLocalDev || !sent) {
		response.dev_code = code; // fallback for dev or email failure
	}
	return c.json(response);
});

// ─── Verify Magic Code ────────────────────────────────────────────
authRoutes.post("/verify", async (c) => {
	const body = await c.req.json();
	const email = body.email;
	const code = body.code;

	if (!email || !code) {
		return c.json({ error: "Missing email or code" }, 400);
	}

	const emailHash = await hashEmail(email);
	
	const storedCode = await c.env.SESSIONS.get(`login_code:${emailHash}`);
	if (!storedCode || storedCode !== code) {
		return c.json({ error: "Invalid or expired code" }, 401);
	}

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
		"SELECT id, trust_level, display_name FROM users WHERE id = ?"
	).bind(userId).first();

	if (!user) {
		return c.json({ error: "User not found" }, 404);
	}

	return c.json({ user });
});
