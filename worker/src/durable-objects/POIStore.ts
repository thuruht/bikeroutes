/**
 * POIStore — Durable Object for geo-cell moderation queues
 *
 * One instance per geohash cell (precision 4 ≈ 40km²).
 * Stores pending POI submissions in SQLite, supports WebSocket for real-time moderation UI.
 */

import { DurableObject } from "cloudflare:workers";

interface POISubmission {
	id: string;
	name: string;
	category: string;
	lat: number;
	lon: number;
	description?: string;
	geohash: string;
	submittedAt: string;
	ip: string;
	status: "pending" | "approved" | "rejected";
}

export class POIStore extends DurableObject<Env> {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);

		// Create the submissions table on first access
		this.ctx.storage.sql.exec(`
			CREATE TABLE IF NOT EXISTS submissions (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				category TEXT NOT NULL,
				lat REAL NOT NULL,
				lon REAL NOT NULL,
				description TEXT,
				geohash TEXT NOT NULL,
				submitted_at TEXT NOT NULL,
				ip_hash TEXT NOT NULL,
				status TEXT DEFAULT 'pending'
			)
		`);
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/submit" && request.method === "POST") {
			return this.handleSubmit(request);
		}

		if (url.pathname === "/queue" && request.method === "GET") {
			return this.handleGetQueue();
		}

		if (url.pathname === "/moderate" && request.method === "POST") {
			return this.handleModerate(request);
		}

		return new Response("Not found", { status: 404 });
	}

	private async handleSubmit(request: Request): Promise<Response> {
		const data = await request.json() as POISubmission & { ip: string };
		const id = crypto.randomUUID();

		// Hash the IP for privacy
		const ipBuf = await crypto.subtle.digest("SHA-256",
			new TextEncoder().encode(data.ip));
		const ipHash = Array.from(new Uint8Array(ipBuf)).slice(0, 8)
			.map(b => b.toString(16).padStart(2, "0")).join("");

		// Rate limit: max 10 submissions per IP hash per day
		const today = new Date().toISOString().slice(0, 10);
		const countResult = this.ctx.storage.sql.exec(
			`SELECT COUNT(*) as cnt FROM submissions
			 WHERE ip_hash = ? AND submitted_at LIKE ?`,
			ipHash, `${today}%`
		).one() as { cnt: number };

		if (countResult.cnt >= 10) {
			return new Response(JSON.stringify({
				error: "Daily submission limit reached",
				message: "🦌 Reki says slow down — 10 POIs per day is the limit!",
			}), { status: 429, headers: { "Content-Type": "application/json" } });
		}

		// Insert
		this.ctx.storage.sql.exec(
			`INSERT INTO submissions (id, name, category, lat, lon, description, geohash, submitted_at, ip_hash, status)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
			id, data.name, data.category, data.lat, data.lon,
			data.description || "", data.geohash, data.submittedAt, ipHash
		);

		return new Response(JSON.stringify({
			id,
			status: "pending",
			message: "🦌 POI submitted! A Trail Steward will review it soon.",
		}), { status: 201, headers: { "Content-Type": "application/json" } });
	}

	private async handleGetQueue(): Promise<Response> {
		const pending = this.ctx.storage.sql.exec(
			`SELECT * FROM submissions WHERE status = 'pending' ORDER BY submitted_at DESC LIMIT 50`
		).toArray();

		return new Response(JSON.stringify({ queue: pending }), {
			headers: { "Content-Type": "application/json" },
		});
	}

	private async handleModerate(request: Request): Promise<Response> {
		const { id, action } = await request.json() as { id: string; action: "approve" | "reject" };

		this.ctx.storage.sql.exec(
			`UPDATE submissions SET status = ? WHERE id = ?`,
			action === "approve" ? "approved" : "rejected", id
		);

		// If approved, also write to the main D1 database
		if (action === "approve") {
			const poi = this.ctx.storage.sql.exec(
				`SELECT * FROM submissions WHERE id = ?`, id
			).one() as POISubmission | null;

			if (poi) {
				await this.env.DB.prepare(
					`INSERT INTO pois (id, name, category, lat, lon, description, submitted_by, status, created_at)
					 VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?)`
				).bind(poi.id, poi.name, poi.category, poi.lat, poi.lon,
					poi.description, "community", poi.submittedAt).run();
			}
		}

		return new Response(JSON.stringify({
			id,
			action,
			message: action === "approve"
				? "🦌 POI approved! It's now on the map."
				: "🦌 POI rejected.",
		}), { headers: { "Content-Type": "application/json" } });
	}
}
