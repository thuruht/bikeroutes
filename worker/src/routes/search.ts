/**
 * /api/search — Semantic trail search via Vectorize
 * Rate-limited with KV token bucket
 */

import { Hono } from "hono";

export const searchRoutes = new Hono<{ Bindings: Env }>();

/**
 * Token bucket rate limiter — 10 requests/min per IP
 */
async function checkRateLimit(
	kv: KVNamespace,
	ip: string
): Promise<{ allowed: boolean; remaining: number }> {
	const key = `rl:search:${ip}`;
	const now = Date.now();
	const windowMs = 60_000; // 1 minute
	const maxTokens = 10;

	const raw = await kv.get(key, "json") as { tokens: number; lastRefill: number } | null;
	let tokens = maxTokens;
	let lastRefill = now;

	if (raw) {
		const elapsed = now - raw.lastRefill;
		const refill = Math.floor(elapsed / (windowMs / maxTokens));
		tokens = Math.min(maxTokens, raw.tokens + refill);
		lastRefill = raw.lastRefill + refill * (windowMs / maxTokens);
	}

	if (tokens <= 0) {
		return { allowed: false, remaining: 0 };
	}

	tokens -= 1;

	// Write updated bucket (non-blocking)
	await kv.put(key, JSON.stringify({ tokens, lastRefill }), {
		expirationTtl: 120,
	});

	return { allowed: true, remaining: tokens };
}

/**
 * GET /api/search?q=quiet+riverside+trail
 * Returns semantically similar trails from Vectorize
 */
searchRoutes.get("/", async (c) => {
	const query = c.req.query("q");
	if (!query || query.length < 3) {
		return c.json({
			error: "Search query too short",
			message: "Give Reki more to work with — at least 3 characters! 🦌",
		}, 400);
	}

	// Rate limit
	const ip = c.req.header("CF-Connecting-IP") || "unknown";
	const { allowed, remaining } = await checkRateLimit(c.env.RATE_LIMITS, ip);
	if (!allowed) {
		return c.json({
			error: "Too many searches",
			message: "Reki needs a breather. Try again in a minute. 🦌💨",
		}, 429, {
			"X-RateLimit-Remaining": "0",
			"Retry-After": "60",
		});
	}

	try {
		// Generate embedding for the query
		// TODO: Replace with actual embedding model (e.g., Workers AI or external)
		// For now, we use a placeholder vector
		const queryVector = new Array(768).fill(0).map(() => Math.random() * 0.1);

		// Query Vectorize
		const results = await c.env.TRAIL_SEARCH.query(queryVector, {
			topK: 10,
			returnValues: false,
			returnMetadata: "all",
		});

		// Also log the search to D1 for analytics
		c.executionCtx.waitUntil(
			c.env.DB.prepare(
				"INSERT INTO search_logs (query, result_count, ip_hash, created_at) VALUES (?, ?, ?, ?)"
			).bind(
				query,
				results.matches.length,
				await sha256Short(ip),
				new Date().toISOString()
			).run()
		);

		return c.json({
			query,
			results: results.matches.map((m) => ({
				id: m.id,
				score: m.score,
				metadata: m.metadata,
			})),
			remaining,
			reki_says: results.matches.length > 0
				? "🦌 Found some trails for you!"
				: "🦌 Hmm, Reki hasn't explored that area yet. Try different words?",
		}, 200, {
			"X-RateLimit-Remaining": String(remaining),
		});
	} catch (error) {
		console.error("Search error:", error);
		return c.json({
			error: "Search failed",
			message: "Reki got distracted by a butterfly. Try again. 🦋🦌",
		}, 500);
	}
});

async function sha256Short(data: string): Promise<string> {
	const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
	return Array.from(new Uint8Array(buf)).slice(0, 8)
		.map(b => b.toString(16).padStart(2, "0")).join("");
}
