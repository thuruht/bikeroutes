/**
 * /api/donate — PayPal donation handling
 * Server-side order creation + capture (never expose secrets client-side)
 */

import { Hono } from "hono";
import { logger } from "../lib/logger";
import { checkRateLimit, getClientIP } from "../lib/rate-limit";

export const donateRoutes = new Hono<{ Bindings: Env }>();

function getPayPalBase(env: Env): string {
	return env.PAYPAL_ENVIRONMENT === "sandbox"
		? "https://api-m.sandbox.paypal.com"
		: "https://api-m.paypal.com";
}

/**
 * Get PayPal access token using client credentials
 */
async function getPayPalToken(env: Env): Promise<string> {
	const auth = btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`);
	const base = getPayPalBase(env);
	const resp = await fetch(`${base}/v1/oauth2/token`, {
		method: "POST",
		headers: {
			Authorization: `Basic ${auth}`,
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: "grant_type=client_credentials",
	});

	const data = await resp.json() as { access_token: string };
	return data.access_token;
}

/**
 * GET /api/donate/config
 * Public PayPal client ID for the frontend SDK (safe to expose).
 */
donateRoutes.get("/config", async (c) => {
	return c.json({
		clientId: c.env.PAYPAL_CLIENT_ID || null,
		currency: "USD",
		environment: c.env.PAYPAL_ENVIRONMENT === "sandbox" ? "sandbox" : "production",
	});
});

/**
 * POST /api/donate/create-order
 * Body: { amount: number, tier: string }
 */
donateRoutes.post("/create-order", async (c) => {
	const ip = getClientIP(c);
	const { allowed } = await checkRateLimit(c.env.RATE_LIMITS, `donate:${ip}`, 10, 60_000);
	if (!allowed) return c.json({ error: "Too many donation attempts. Slow down." }, 429);

	const { amount, tier } = await c.req.json<{ amount: number; tier: string }>();

	if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 5 || amount > 500) {
		return c.json({ error: "Invalid donation amount" }, 400);
	}
	if (!tier || typeof tier !== "string" || tier.length > 40) {
		return c.json({ error: "Invalid donation tier" }, 400);
	}

	try {
		const token = await getPayPalToken(c.env);
		const base = getPayPalBase(c.env);
		const resp = await fetch(`${base}/v2/checkout/orders`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				intent: "CAPTURE",
				purchase_units: [{
					amount: {
						currency_code: "USD",
						value: amount.toFixed(2),
					},
					description: `BikeRoutes.org Donation — ${tier}`,
				}],
			}),
		});

		const order = await resp.json() as { id: string };
		return c.json({ orderID: order.id });
	} catch (error) {
		console.error("PayPal create-order error:", error);
		return c.json({ error: "Failed to create order" }, 500);
	}
});

/**
 * POST /api/donate/capture-order
 * Body: { orderID: string, tier: string }
 */
donateRoutes.post("/capture-order", async (c) => {
	const { orderID, tier } = await c.req.json<{ orderID: string; tier: string }>();

	if (!orderID || typeof orderID !== "string" || orderID.length > 80) {
		return c.json({ error: "Invalid order ID" }, 400);
	}

	try {
		const token = await getPayPalToken(c.env);
		const base = getPayPalBase(c.env);
		const resp = await fetch(`${base}/v2/checkout/orders/${orderID}/capture`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
		});

		const capture = await resp.json() as {
			status: string;
			purchase_units: Array<{
				payments: { captures: Array<{ amount: { value: string } }> };
			}>;
		};

		if (capture.status === "COMPLETED") {
			const amountValue = capture.purchase_units[0]?.payments?.captures[0]?.amount?.value;

			// Record donation in D1
			await c.env.DB.prepare(
				`INSERT INTO donations (order_id, amount, tier, status, created_at)
				 VALUES (?, ?, ?, 'completed', ?)`
			).bind(orderID, amountValue, tier, new Date().toISOString()).run();

			// If $25+ tier, generate a merch claim token
			const parsedAmount = parseFloat(amountValue || "0");
			let claimToken: string | null = null;
			if (parsedAmount >= 25) {
				claimToken = crypto.randomUUID();
				await c.env.SESSIONS.put(`merch:${claimToken}`, JSON.stringify({
					orderID,
					tier,
					amount: parsedAmount,
					claimed: false,
					createdAt: new Date().toISOString(),
				}), { expirationTtl: 86400 * 30 }); // 30 days to claim
			}

			return c.json({
				status: "completed",
				message: "You're the best. Every donation keeps the trails mapped.",
				claimToken,
			});
		}

		return c.json({ status: capture.status, error: "Capture not completed" }, 400);
	} catch (error) {
		logger.error("PayPal capture-order failure", error, "PAYPAL");
		return c.json({ error: "Failed to capture order" }, 500);
	}
});

/**
 * GET /api/donate/merch-status/:token
 * Check merch claim status
 */
donateRoutes.get("/merch-status/:token", async (c) => {
	const token = c.req.param("token");
	const data = await c.env.SESSIONS.get(`merch:${token}`);

	if (!data) {
		return c.json({ error: "Token not found" }, 404);
	}

	return c.json(JSON.parse(data));
});

/**
 * GET /api/donate/stats
 * Public donation stats (no personal info)
 */
donateRoutes.get("/stats", async (c) => {
	const result = await c.env.DB.prepare(
		`SELECT COUNT(*) as total_donors, COALESCE(SUM(amount), 0) as total_raised
		 FROM donations WHERE status = 'completed'`
	).first<{ total_donors: number; total_raised: number }>();

	return c.json({
		total_donors: result?.total_donors || 0,
		total_raised: result?.total_raised || 0,
		note: "Every dollar keeps the trails mapped!",
	});
});
