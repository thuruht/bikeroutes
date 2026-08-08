/**
 * RouteSession — Durable Object for in-progress route state
 *
 * Persists waypoints, selected filters, and partial route data
 * so users can resume route planning across page reloads.
 */

import { DurableObject } from "cloudflare:workers";

interface Waypoint {
	lat: number;
	lon: number;
	label?: string;
}

interface SessionState {
	waypoints: Waypoint[];
	filters: string[];
	routeGeoJSON?: object;
	updatedAt: string;
}

export class RouteSession extends DurableObject<Env> {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		switch (url.pathname) {
			case "/get":
				return this.getSession();
			case "/update":
				return this.updateSession(request);
			case "/clear":
				return this.clearSession();
			default:
				return new Response("Not found", { status: 404 });
		}
	}

	private async getSession(): Promise<Response> {
		const state = await this.ctx.storage.get<SessionState>("session");
		return Response.json(state || {
			waypoints: [],
			filters: ["paved", "gravel", "dirt", "mtb"],
			routeGeoJSON: null,
			updatedAt: null,
		});
	}

	private async updateSession(request: Request): Promise<Response> {
		const update = await request.json() as Partial<SessionState>;
		const current = await this.ctx.storage.get<SessionState>("session") || {
			waypoints: [],
			filters: ["paved", "gravel", "dirt", "mtb"],
		};

		const merged: SessionState = {
			...current,
			...update,
			updatedAt: new Date().toISOString(),
		};

		await this.ctx.storage.put("session", merged);
		return Response.json({ status: "saved", session: merged });
	}

	private async clearSession(): Promise<Response> {
		await this.ctx.storage.delete("session");
		return Response.json({
			status: "cleared",
			message: " Route cleared. Ready for a new adventure!",
		});
	}
}
