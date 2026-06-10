/**
 * /api/admin/ingest — Trigger trail ingestion into Vectorize + D1
 *
 * Methods:
 *   POST /api/admin/ingest?source=d1          — Embed all D1 pois into Vectorize
 *   POST /api/admin/ingest?source=osm&bbox=…  — Fetch OSM trails + embed
 *   DELETE /api/admin/ingest?wipe=true        — Clear Vectorize index (careful!)
 *
 * Protected by ADMIN_SECRET in .dev.vars / secrets.
 */

import { Hono } from "hono";
import { logger } from "../lib/logger";

export const ingestRoutes = new Hono<{ Bindings: Env }>();

// Admin auth helper
async function checkAdmin(c: any) {
	const secret = c.req.header("X-Admin-Secret");
	const expected = c.env.ADMIN_SECRET;
	if (!expected) {
		logger.warn("ADMIN_SECRET not configured — rejecting ingest request", undefined, "ADMIN");
		return false;
	}
	return secret === expected;
}

// ─── D1 → Vectorize ──────────────────────────────────
ingestRoutes.post("/", async (c) => {
	if (!(await checkAdmin(c))) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	const url = new URL(c.req.url);
	const source = url.searchParams.get("source") || "d1";
	const wipe = url.searchParams.get("wipe") === "true";

	if (wipe) {
		logger.warn("Wiping Vectorize index", undefined, "ADMIN");
		// Vectorize delete — query all and delete by IDs
		const dummy = new Array(768).fill(0);
		let deletedTotal = 0;
		let runs = 0;
		while (runs < 20) {
			const all = await c.env.TRAIL_SEARCH.query(dummy, {
				topK: 1000,
			});
			const ids = all.matches.map((m: any) => m.id);
			if (!ids.length) break;
			await c.env.TRAIL_SEARCH.deleteByIds(ids);
			deletedTotal += ids.length;
			runs++;
		}
		return c.json({ message: `Wiped ${deletedTotal} vectors from index`, runs });
	}

	// ── Source: D1 ───────────────────────────────
	if (source === "d1") {
		logger.info("Ingesting from D1 POIs into Vectorize", undefined, "ADMIN");

		const { results } = await c.env.DB.prepare(
			"SELECT id, name, category, lat, lon, description FROM pois WHERE status != 'deleted'"
		).all();

		const rows = (results || []) as Array<{ id: string; name: string; category: string; lat: number; lon: number; description: string | null }>;
		if (!rows.length) return c.json({ message: "No POIs found in D1" }, 200);

		const BATCH_AI = 100; // Workers AI max batch
		const BATCH_VX = 100; // Vectorize max batch
		let totalEmbedded = 0;

		for (let i = 0; i < rows.length; i += BATCH_AI) {
			const batch = rows.slice(i, i + BATCH_AI);
			const texts = batch.map((r) =>
				`${r.name}. ${r.category}. ${r.description || ""}`.trim().slice(0, 512)
			);

			const emb = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", { text: texts }) as { data: number[][] };

			const vectors = emb.data.map((values, idx) => ({
				id: String(batch[idx].id),
				values,
				metadata: {
					name: batch[idx].name,
					category: batch[idx].category,
					lat: batch[idx].lat,
					lon: batch[idx].lon,
					description: batch[idx].description || "",
					source: "d1_poi",
				} as Record<string, any>,
			}));

			// Upsert in chunks of 100
			for (let j = 0; j < vectors.length; j += BATCH_VX) {
				await c.env.TRAIL_SEARCH.upsert(vectors.slice(j, j + BATCH_VX));
			}

			totalEmbedded += vectors.length;
			logger.info(`Embedded batch ${i / BATCH_AI + 1}`, { count: vectors.length }, "ADMIN");
		}

		// Mark as indexed
		const stmt = c.env.DB.prepare("UPDATE pois SET status = 'indexed' WHERE id = ?");
		for (const row of rows) {
			c.executionCtx.waitUntil(stmt.bind(row.id).run());
		}

		return c.json({
			message: `Indexed ${totalEmbedded} D1 POIs into Vectorize 🦌`,
			total: rows.length,
		});
	}

	// ── Source: OSM Overpass ─────────────────────
	if (source === "osm") {
		const bbox = url.searchParams.get("bbox") || "38.8,-95.0,39.4,-94.2";
		const osmTypes = url.searchParams.get("types") || "trail"; // trail, rail, or both comma-sep
		logger.info("Fetching OSM features", { bbox, types: osmTypes }, "ADMIN");

		const queries: string[] = [];
		const types = osmTypes.split(",").map(s => s.trim());

		if (types.includes("trail")) {
			queries.push(`
  way["highway"="cycleway"](${bbox});
  way["highway"="path"]["bicycle"="yes"](${bbox});
  way["highway"="path"]["route"="bicycle"](${bbox});
  way["highway"="track"]["bicycle"="yes"](${bbox});
  relation["route"="bicycle"](${bbox});
`);
		}
		if (types.includes("rail")) {
			queries.push(`
  way["railway"="rail"](${bbox});
  way["railway"="disused"](${bbox});
  way["railway"="abandoned"](${bbox});
  way["railway"="light_rail"](${bbox});
  way["railway"="tram"](${bbox});
  node["railway"="station"](${bbox});
  node["railway"="halt"](${bbox});
  node["railway"="junction"](${bbox});
`);
		}

		if (!queries.length) {
			return c.json({ error: "No valid types specified. Use 'trail', 'rail', or both." }, 400);
		}

		const query = `[out:json][timeout:120];(${queries.join("")});out center 500;`;

		const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "bikeroutes.org/1.0 (contact@bikeroutes.org)" },
			body: new URLSearchParams({ data: query }),
		});

		if (!overpassRes.ok) {
			return c.json({ error: "Overpass API failed", status: overpassRes.status }, 502);
		}

		const overpassData = await overpassRes.json() as { elements?: any[] };
		const allElements = (overpassData.elements || []);

		// Rail features rarely have name tags — use fallback display names.
		// Trail features must have a name to be useful.
		const elements = allElements.filter((e: any) => {
			const t = e.tags || {};
			if (t.railway) return true; // include all rail features
			return !!t.name;
		});

		// Deduplicate by source type + id
		const seen = new Set<string>();
		const unique: any[] = [];
		for (const e of elements) {
			const lat = e.center?.lat ?? e.lat;
			const lon = e.center?.lon ?? e.lon;
			if (!lat || !lon) continue;
			const key = `${e.type}:${e.id}`;
			if (!seen.has(key)) { seen.add(key); unique.push(e); }
		}

		if (!unique.length) {
			return c.json({ message: "No features found in OSM bbox", bbox, types: osmTypes }, 200);
		}

		// Build GeoJSON geometry from OSM element
		function buildGeom(e: any): { geom: any; category: string } {
			const t = e.tags;
			let category = "trail";
			if (t.railway) {
				if (t.railway === "station" || t.railway === "halt" || t.railway === "junction") category = t.railway;
				else category = "railway";
			} else if (e.type === "relation") category = "route";
			else category = t.highway || "trail";

			if (e.type === "node") {
				return { geom: { type: "Point", coordinates: [e.lon, e.lat] }, category };
			}
			// way or relation — build LineString from geometry nodes
			if (e.geometry && Array.isArray(e.geometry) && e.geometry.length >= 2) {
				const coords = e.geometry.map((n: any) => [n.lon, n.lat]);
				return { geom: { type: "LineString", coordinates: coords }, category };
			}
			// fallback: point geometry from center
			const lat = e.center?.lat ?? e.lat;
			const lon = e.center?.lon ?? e.lon;
			return { geom: { type: "Point", coordinates: [lon, lat] }, category };
		}

		// Build docs for Vectorize + D1
		const docs = unique.map((e) => {
			const t = e.tags;
			const lat = e.center?.lat ?? e.lat;
			const lon = e.center?.lon ?? e.lon;
			const { geom, category } = buildGeom(e);
			const surface = t.surface || t.tracktype || "";
			const length = t.length || t.distance || "";
			const difficulty = t.mtb_scale || t.sac_scale || t.trail_visibility || "";
			const fallbackName = t.name || t.ref || t.operator || `${t.railway || t.highway || ""} line`.trim();
			const name = fallbackName || "unnamed";
			const text = `${name}. ${surface ? `Surface: ${surface}.` : ""} ${length ? `Length: ${length}.` : ""} ${difficulty ? `Difficulty: ${difficulty}.` : ""} ${t.description || ""}`.trim().slice(0, 512);
			const id = `osm:${e.type}:${e.id}`;
			return {
				id,
				text,
				geom: JSON.stringify(geom),
				meta: {
					name,
					category,
					lat,
					lon,
					description: t.description || "",
					surface,
					length_m: parseFloat(length) || null,
					difficulty,
					source: "osm_overpass",
				},
			};
		});

		// Batch embed + upsert to Vectorize
		const BATCH_AI = 100;
		const BATCH_VX = 100;
		let totalEmbedded = 0;
		let insertedD1 = 0;

		for (let i = 0; i < docs.length; i += BATCH_AI) {
			const batch = docs.slice(i, i + BATCH_AI);
			const texts = batch.map((d) => d.text);
			const emb = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", { text: texts }) as { data: number[][] };

			const vectors = emb.data.map((values, idx) => ({
				id: batch[idx].id,
				values,
				metadata: batch[idx].meta as Record<string, any>,
			}));

			for (let j = 0; j < vectors.length; j += BATCH_VX) {
				await c.env.TRAIL_SEARCH.upsert(vectors.slice(j, j + BATCH_VX));
			}
			totalEmbedded += vectors.length;
		}

		// Insert into trails table + pois table (skip duplicates)
		const insertTrail = c.env.DB.prepare(
			"INSERT OR IGNORE INTO trails (id, source, source_type, source_id, name, category, geom, lat, lon, surface, length_m, difficulty, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
		);
		const insertPoi = c.env.DB.prepare(
			"INSERT OR IGNORE INTO pois (id, name, category, lat, lon, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
		);

		const now = new Date().toISOString();
		for (const d of docs) {
			const osmId = d.id.split(":").pop() || "";
			try {
				await insertTrail.bind(
					d.id, "osm", d.meta.source, osmId,
					d.meta.name, d.meta.category, d.geom,
					d.meta.lat, d.meta.lon,
					d.meta.surface, d.meta.length_m, d.meta.difficulty,
					d.meta.description, "approved", now
				).run();
				insertedD1++;
			} catch (e) {
				// duplicate id, ignore
			}
			// Also insert into pois for backward compatibility (point-based search)
			try {
				await insertPoi.bind(
					d.id, d.meta.name, d.meta.category,
					d.meta.lat, d.meta.lon, d.meta.description,
					"indexed", now
				).run();
			} catch { /* ignore dupes */ }
		}

		return c.json({
			message: `OSM ${osmTypes} ingestion complete 🦌`,
			found: elements.length,
			deduplicated: unique.length,
			indexed: totalEmbedded,
			insertedToD1: insertedD1,
			bbox,
			types: osmTypes,
		});
	}

	return c.json({ error: `Unknown source: ${source}. Use 'd1' or 'osm'.` }, 400);
});
