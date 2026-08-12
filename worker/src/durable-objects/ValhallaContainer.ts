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
		// Tiles are baked into the container image at /data/valhalla/tiles.tar
		VALHALLA_CONFIG: "/data/valhalla/valhalla.json",
	};

	override async onStart(): Promise<void> {
		console.log(" Valhalla container started — ready to scout routes!");
		// Implement keepalive ping every 4 minutes (240s) because sleepAfter is 5m
		await this.schedule(240, "keepalivePing");
	}

	async keepalivePing() {
		// Reset the activity timeout so it doesn't sleep
		this.renewActivityTimeout();
		// Reschedule
		await this.schedule(240, "keepalivePing");
	}

	override onStop(): void {
		console.log("Valhalla container sleeping");
	}

	override onError(error: unknown): void {
		console.error(" Valhalla container error:", error);
	}
}
