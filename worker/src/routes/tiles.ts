/**
 * /api/tiles — PMTiles proxy from R2
 * Serves map tiles from R2 bucket using byte-range requests
 */

import { Hono } from "hono";

export const tileRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /api/tiles/:filename.pmtiles
 * Proxies range requests to R2
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
		return c.json({ error: "File not found" }, 404);
	}

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set("Content-Type", "application/octet-stream");
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
