/**
 * /api/search — Semantic trail search via Vectorize
 * Rate-limited with KV token bucket
 */

import { Hono } from "hono";
import { logger } from "../lib/logger";

export const searchRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /api/geocode?q=query
 * Proxies Nominatim search with KV caching
 */
searchRoutes.get("/geocode", async (c) => {
	const query = c.req.query("q");
	if (!query || query.length < 2) {
		return c.json({ error: "Query too short" }, 400);
	}

	const cacheKey = `geo:${await sha256Short(query)}`;
	const cached = await c.env.ROUTE_CACHE.get(cacheKey, "json");
	if (cached) {
		return c.json(cached, 200, { "X-Cache": "HIT" });
	}

	try {
		const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
			q: query,
			format: "json",
			limit: "5",
			bounded: "1",
			viewbox: "-102.0,40.6,-89.0,36.0",
		})}`;
		const resp = await fetch(url, {
			headers: { "User-Agent": "BikeRoutes.org/1.0 (bikeroutes.org)" },
		});
		const data = await resp.json() as Array<{
			place_id: number;
			display_name: string;
			lat: string;
			lon: string;
		}>;

		const result = {
			query,
			results: data.map((item) => ({
				id: item.place_id,
				name: item.display_name.split(",")[0],
				description: item.display_name,
				coords: [parseFloat(item.lon), parseFloat(item.lat)],
			})),
			reki_says: data.length > 0
				? `🦌 Reki scouted ${data.length} spots for you!`
				: "🦌 Hmm, Reki hasn't explored that area yet. Try different words?",
		};

		c.executionCtx.waitUntil(
			c.env.ROUTE_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 86400 })
		);

		return c.json(result, 200, { "X-Cache": "MISS" });
	} catch (error) {
		logger.error("Geocode proxy failed", error, "SEARCH");
		return c.json({ error: "Geocode failed", message: "Reki got distracted by a butterfly. Try again. 🦋🦌" }, 500);
	}
});

/**
 * GET /api/reverse?lat=...&lon=...
 * Proxies Nominatim reverse geocoding with KV caching
 */
searchRoutes.get("/reverse", async (c) => {
	const lat = parseFloat(c.req.query("lat") || "0");
	const lon = parseFloat(c.req.query("lon") || "0");

	if (!lat || !lon) {
		return c.json({ error: "lat and lon are required" }, 400);
	}

	const cacheKey = `rev:${await sha256Short(`${lat.toFixed(4)},${lon.toFixed(4)}`)}`;
	const cached = await c.env.ROUTE_CACHE.get(cacheKey, "json");
	if (cached) {
		return c.json(cached, 200, { "X-Cache": "HIT" });
	}

	try {
		const url = `https://nominatim.openstreetmap.org/reverse?${new URLSearchParams({
			lat: lat.toString(),
			lon: lon.toString(),
			format: "json",
		})}`;
		const resp = await fetch(url, {
			headers: { "User-Agent": "BikeRoutes.org/1.0 (bikeroutes.org)" },
		});
		const data = await resp.json() as {
			display_name: string;
			lat: string;
			lon: string;
		};

		const result = {
			name: data.display_name.split(",")[0],
			description: data.display_name,
			coords: [parseFloat(data.lon), parseFloat(data.lat)],
			reki_says: "🦌 Found it!",
		};

		c.executionCtx.waitUntil(
			c.env.ROUTE_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 86400 })
		);

		return c.json(result, 200, { "X-Cache": "MISS" });
	} catch (error) {
		logger.error("Reverse geocode proxy failed", error, "SEARCH");
		return c.json({ error: "Reverse geocode failed", message: "Reki couldn't place that spot. Try again. 🦌" }, 500);
	}
});

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

interface EmbedResponse {
	data: number[][];
}

interface ChatResponse {
	response: string;
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
		// Generate embedding using Cloudflare Workers AI
		const embedResponse = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", {
			text: [query]
		}) as EmbedResponse;
		// The model returns an array of vectors (one for each input string)
		const queryVector = embedResponse.data[0];

		// Query Vectorize
		const results = await c.env.TRAIL_SEARCH.query(queryVector, {
			topK: 5,
			returnValues: false,
			returnMetadata: "all",
		});

		let rekiResponse = "🦌 Hmm, Reki hasn't explored that area yet. Try different words?";

		if (results.matches.length > 0) {
			const contextText = results.matches.map((m, i) => {
				const meta = m.metadata || {};
				return `[${i+1}] ${meta.name || 'Unknown Location'} - ${meta.description || ''}`;
			}).join("\n");

			const systemPrompt = `You are Reki, a helpful scout deer mascot for BikeRoutes.org. 
Your job is to recommend bike trails and locations based on the user's search query and the provided database results.
RULES:
1. Keep your response very short (1-3 sentences maximum).
2. Be friendly and use subtle deer/nature puns (like 'hoofing it', 'scouted this path', etc.).
3. End with a deer emoji 🦌.
4. ONLY recommend places from the provided context. If nothing fits perfectly, pick the closest match.

Context trails found:
${contextText}`;

			const chatResponse = await c.env.AI.run("@cf/meta/llama-3-8b-instruct", {
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: `User query: "${query}"\nWhat do you recommend?` }
				],
				max_tokens: 150
			}) as ChatResponse;

			rekiResponse = chatResponse.response;
		}

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
			reki_says: rekiResponse,
		}, 200, {
			"X-RateLimit-Remaining": String(remaining),
		});
	} catch (error) {
		logger.error("Semantic search failed", error, "SEARCH");
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
