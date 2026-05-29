/**
 * ValhallaContainer — Cloudflare Container running Valhalla routing engine
 *
 * Runs Valhalla in a Docker container on Cloudflare's edge.
 * Auto-sleeps after 5 minutes of inactivity.
 */

import { Container } from "@cloudflare/containers";

export class ValhallaContainer extends Container<Env> {
	// Valhalla listens on port 8002 by default
	defaultPort = 8002;

	// Sleep after 5 minutes of no requests
	sleepAfter = "5m";

	// Environment variables for Valhalla
	envVars = {
		// Use the bike costing model by default
		DEFAULT_COSTING: "bicycle",
		// Serve the Midwest region
		TILE_EXTRACT: "midwest-latest.osm.pbf",
	};

	override onStart(): void {
		console.log("🦌 Valhalla container started — ready to scout routes!");
	}

	override onStop(): void {
		console.log("🦌 Valhalla container sleeping — Reki's taking a nap.");
	}

	override onError(error: unknown): void {
		console.error("🦌 Valhalla container error:", error);
	}
}
