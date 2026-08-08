/**
 * Generic token-bucket rate limiter backed by KV.
 */

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
}

export async function checkRateLimit(
	kv: KVNamespace,
	key: string,
	maxTokens: number,
	windowMs: number,
	ttlSeconds?: number,
): Promise<RateLimitResult> {
	const now = Date.now();
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

	await kv.put(key, JSON.stringify({ tokens, lastRefill }), {
		expirationTtl: ttlSeconds ?? Math.ceil(windowMs / 1000) + 60,
	});

	return { allowed: true, remaining: tokens };
}

export function getClientIP(c: { req: { header: (name: string) => string | undefined } }): string {
	return c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() || "unknown";
}
