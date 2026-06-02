/**
 * /api/donate — PayPal donation handling
 * Server-side order creation + capture (never expose secrets client-side)
 */

import { Hono } from "hono";

export const donateRoutes = new Hono<{ Bindings: Env }>();

const PAYPAL_API = "https://api-m.paypal.com"; // Use sandbox for dev

/**
 * Get PayPal access token using client credentials
 */
async function getPayPalToken(env: Env): Promise<string> {
	const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = env as any;
	const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
	const resp = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
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
 * POST /api/donate/create-order
 * Body: { amount: number, tier: string }
 */
donateRoutes.post("/create-order", async (c) => {
	const { amount, tier } = await c.req.json<{ amount: number; tier: string }>();

	if (!amount || amount < 5 || amount > 500) {
		return c.json({ error: "Invalid donation amount" }, 400);
	}

	try {
		const token = await getPayPalToken(c.env);
		const resp = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
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

	try {
		const token = await getPayPalToken(c.env);
		const resp = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`, {
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
				message: "🦌 You're the best. Reki's doing a happy tail-wag right now!",
				claimToken,
			});
		}

		return c.json({ status: capture.status, error: "Capture not completed" }, 400);
	} catch (error) {
		console.error("PayPal capture error:", error);
		return c.json({ error: "Failed to capture order" }, 500);
	}
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
		reki_says: "🦌 Every dollar keeps the trails mapped!",
	});
});
