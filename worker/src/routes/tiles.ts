/**
 * /api/tiles — Tile proxy routes
 *
 * 1. GET /api/tiles/:filename.pmtiles — byte-range proxy from R2 for direct PMTiles downloads.
 * 2. GET /api/tiles/vector/:layer/:z/:x/:y.mvt — vector tile endpoint backed by a PMTiles file in R2.
 */

import { Hono } from "hono";
import { PMTiles, ResolvedValueCache, type Source, type RangeResponse } from "pmtiles";

export const tileRoutes = new Hono<{ Bindings: Env }>();

/**
 * Adapter that lets the pmtiles library read from an R2 bucket via byte ranges.
 * We create a fresh cache per request because Cloudflare Workers should not share
 * promises/state across requests outside a Durable Object.
 */
class R2Source implements Source {
	constructor(
		private bucket: R2Bucket,
		private key: string
	) {}

	getKey(): string {
		return `r2://bikeroutes-tiles/${this.key}`;
	}

	async getBytes(
		offset: number,
		length: number,
		signal?: AbortSignal,
		etag?: string
	): Promise<RangeResponse> {
		const options: R2GetOptions = { range: { offset, length } };
		if (etag) {
			options.onlyIf = { etagMatches: etag };
		}
		const object = await this.bucket.get(this.key, options);
		if (!object) {
			throw new Error(`R2 object not found: ${this.key}`);
		}
		const data = await object.arrayBuffer();
		return {
			data,
			etag: object.etag,
			cacheControl: object.httpMetadata?.cacheControl ?? undefined,
			expires: object.httpMetadata?.cacheExpiry?.toISOString() ?? undefined,
		};
	}
}

function notFound(c: any, message: string) {
	return c.json({ error: message }, 404);
}

/**
 * GET /api/tiles/:filename.pmtiles
 * Proxies range requests to R2 for direct PMTiles consumption.
 */
tileRoutes.get("/:filename{.+\\.pmtiles}", async (c) => {
	const filename = c.req.param("filename");
	const rangeHeader = c.req.header("Range");

	let range: { offset: number; length?: number } | undefined;
	if (rangeHeader && rangeHeader.startsWith("bytes=")) {
		const parts = rangeHeader.split("=")[1].split("-");
		const offset = parseInt(parts[0]);
		if (!isNaN(offset)) {
			range = { offset };
			const end = parseInt(parts[1]);
			if (!isNaN(end)) {
				range.length = end - offset + 1;
			}
		}
	}

	const object = await c.env.TILES.get(filename, { range });

	if (!object) {
		return notFound(c, "Tile archive not found");
	}

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set("Content-Type", "application/vnd.pmtiles");
	headers.set("Accept-Ranges", "bytes");

	if (object.range) {
		const { offset, length } = object.range as { offset: number; length: number };
		headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
	}

	return new Response(object.body, {
		status: object.range ? 206 : 200,
		headers,
	});
});

/**
 * GET /api/tiles/vector/:layer/:z/:x/:y.mvt
 * Serves individual vector tiles from a PMTiles archive stored in R2.
 */
tileRoutes.get("/vector/:layer/:z/:x/:y.mvt", async (c) => {
	const layer = c.req.param("layer");
	const z = parseInt(c.req.param("z") || "");
	const x = parseInt(c.req.param("x") || "");
	const y = parseInt(c.req.param("y") || "");

	if (!layer || isNaN(z) || isNaN(x) || isNaN(y)) {
		return c.json({ error: "Invalid tile parameters" }, 400);
	}

	const key = `${layer}.pmtiles`;
	const source = new R2Source(c.env.TILES, key);
	const pmtiles = new PMTiles(source, new ResolvedValueCache());

	try {
		const tile = await pmtiles.getZxy(z, x, y, c.req.raw.signal);
		if (!tile) {
			return new Response(null, { status: 204 });
		}
		return new Response(tile.data, {
			status: 200,
			headers: {
				"Content-Type": "application/vnd.mapbox-vector-tile",
				"Cache-Control": "public, max-age=3600",
			},
		});
	} catch (error) {
		console.error(`Vector tile error: layer=${layer} z=${z} x=${x} y=${y}`, error);
		return c.json({ error: "Tile not available" }, 404);
	}
});
