import { Hono } from "hono";

export const authRoutes = new Hono<{ Bindings: Env }>();

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

	// In a real app, send an email here using Cloudflare Email Routing or SendGrid
	// console.log(`Sending code ${code} to ${email}`);

	return c.json({ 
		message: "Code generated. Check your email (or dev console).",
		dev_code: code // For development purposes only
	});
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
