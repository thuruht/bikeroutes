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

interface GeoJSONGeometry {
	type: string;
	coordinates?: any;
	geometries?: GeoJSONGeometry[];
}

interface GeoJSONFeature {
	type: "Feature";
	geometry: GeoJSONGeometry | null;
	properties: Record<string, any>;
}

interface GeoJSONFeatureCollection {
	type: "FeatureCollection";
	features: GeoJSONFeature[];
}

function centroidOfGeometry(geom: GeoJSONGeometry | null): { lat: number; lon: number } | null {
	if (!geom) return null;
	if (geom.type === "Point") {
		const [lon, lat] = geom.coordinates as number[];
		return { lat, lon };
	}

	const coords: number[][] = [];
	function walk(g: GeoJSONGeometry) {
		if (g.type === "Point") coords.push(g.coordinates as number[]);
		else if (g.type === "LineString") (g.coordinates as number[][]).forEach(p => coords.push(p));
		else if (g.type === "MultiLineString" || g.type === "Polygon") (g.coordinates as number[][][]).forEach(r => r.forEach(p => coords.push(p)));
		else if (g.type === "MultiPolygon") (g.coordinates as number[][][][]).forEach(p => p.forEach(r => r.forEach(q => coords.push(q))));
		else if (g.type === "GeometryCollection" && g.geometries) g.geometries.forEach(walk);
	}
	walk(geom);

	if (!coords.length) return null;
	let sumLon = 0, sumLat = 0;
	for (const [lon, lat] of coords) { sumLon += lon; sumLat += lat; }
	return { lat: sumLat / coords.length, lon: sumLon / coords.length };
}

function hashFeature(region: string, feat: GeoJSONFeature): string {
	const c = centroidOfGeometry(feat.geometry);
	const key = `${region}:${feat.properties?.name || ""}:${feat.properties?.facility_type || ""}:${c?.lat ?? 0}:${c?.lon ?? 0}`;
	// Simple stable numeric hash
	let h = 0;
	for (let i = 0; i < key.length; i++) h = (h << 5) - h + key.charCodeAt(i);
	return Math.abs(h).toString(16).padStart(8, "0");
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
			message: `Indexed ${totalEmbedded} D1 POIs into Vectorize `,
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

		// Trails use center points to keep response small; rails need full LineString geometry.
		const fetchOverpass = async (q: string, output: string) => {
			const query = `[out:json][timeout:180];(${q});${output};`;
			const res = await fetch("https://overpass-api.de/api/interpreter", {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "bikeroutes.org/1.0 (contact@bikeroutes.org)" },
				body: new URLSearchParams({ data: query }),
			});
			if (!res.ok) {
				const text = await res.text().catch(() => "");
				throw new Error(`Overpass API failed: ${res.status} ${text.slice(0, 200)}`);
			}
			const data = await res.json() as { elements?: any[] };
			return data.elements || [];
		};

		let allElements: any[] = [];
		if (types.includes("trail")) {
			allElements = allElements.concat(await fetchOverpass(queries.filter((_, i) => i === 0).join(""), "out center 500"));
		}
		if (types.includes("rail")) {
			allElements = allElements.concat(await fetchOverpass(queries.filter((_, i) => (types.includes("trail") ? i === 1 : i === 0)).join(""), "out geom"));
		}

		// Rail features rarely have name tags — use fallback display names.
		// Trail features must have a name to be useful.
		const elements = allElements.filter((e: any) => {
			const t = e.tags || {};
			if (t.railway) return true; // include all rail features
			return !!t.name;
		});

		// Deduplicate by source type + id (derive a centroid for ways with full geometry)
		const seen = new Set<string>();
		const unique: any[] = [];
		for (const e of elements) {
			let lat = e.center?.lat ?? e.lat;
			let lon = e.center?.lon ?? e.lon;
			if ((lat == null || lon == null) && e.geometry && Array.isArray(e.geometry) && e.geometry.length) {
				let sumLat = 0, sumLon = 0;
				for (const n of e.geometry) { sumLon += n.lon; sumLat += n.lat; }
				lon = sumLon / e.geometry.length;
				lat = sumLat / e.geometry.length;
			}
			if (lat == null || lon == null) continue;
			const key = `${e.type}:${e.id}`;
			if (!seen.has(key)) { seen.add(key); unique.push(e); }
		}

		if (!unique.length) {
			return c.json({ message: "No features found in OSM bbox", bbox, types: osmTypes }, 200);
		}

		// Derive a representative lat/lon for an OSM element
		function centroid(e: any): { lat: number; lon: number } | null {
			let lat = e.center?.lat ?? e.lat;
			let lon = e.center?.lon ?? e.lon;
			if (lat == null || lon == null) {
				if (e.geometry && Array.isArray(e.geometry) && e.geometry.length) {
					let sumLat = 0, sumLon = 0;
					for (const n of e.geometry) { sumLon += n.lon; sumLat += n.lat; }
					lon = sumLon / e.geometry.length;
					lat = sumLat / e.geometry.length;
				}
			}
			if (lat == null || lon == null) return null;
			return { lat, lon };
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
			const c = centroid(e);
			return { geom: { type: "Point", coordinates: [c?.lon ?? e.lon, c?.lat ?? e.lat] }, category };
		}

		// Build docs for Vectorize + D1
		const docs = unique.map((e) => {
			const t = e.tags;
			const c = centroid(e) || { lat: e.lat, lon: e.lon };
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
					lat: c.lat,
					lon: c.lon,
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

		// Insert into trails table + pois table (replace so re-ingesting updates geometries)
		const insertTrail = c.env.DB.prepare(
			"INSERT OR REPLACE INTO trails (id, source, source_type, source_id, name, category, geom, lat, lon, surface, length_m, difficulty, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
		);
		const insertPoi = c.env.DB.prepare(
			"INSERT OR IGNORE INTO pois (id, name, category, lat, lon, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
		);

		const now = new Date().toISOString();
		const d1Errors: string[] = [];
		const BATCH_D1 = 100;
		for (let i = 0; i < docs.length; i += BATCH_D1) {
			const batch = docs.slice(i, i + BATCH_D1);
			const trailStmts = batch.map((d) => {
				const osmId = d.id.split(":").pop() || "";
				return insertTrail.bind(
					d.id, "osm", d.meta.source, osmId,
					d.meta.name, d.meta.category, d.geom,
					d.meta.lat, d.meta.lon,
					d.meta.surface, d.meta.length_m, d.meta.difficulty,
					d.meta.description, "approved", now
				);
			});
			const poiStmts = batch.map((d) =>
				insertPoi.bind(
					d.id, d.meta.name, d.meta.category,
					d.meta.lat, d.meta.lon, d.meta.description,
					"indexed", now
				)
			);
			try {
				await c.env.DB.batch([...trailStmts, ...poiStmts]);
				insertedD1 += batch.length;
			} catch (e: any) {
				if (d1Errors.length < 5) d1Errors.push(`batch ${i}: ${e.message || String(e)}`);
			}
		}

		return c.json({
			message: `OSM ${osmTypes} ingestion complete `,
			found: elements.length,
			deduplicated: unique.length,
			indexed: totalEmbedded,
			insertedToD1: insertedD1,
			d1Errors,
			bbox,
			types: osmTypes,
		});
	}

	// ── Source: GeoJSON (from CI pipeline) ─────────
	if (source === "geojson") {
		const region = url.searchParams.get("region") || "";
		if (!region) {
			return c.json({ error: "Missing region param. Use ?source=geojson&region=midwest" }, 400);
		}

		logger.info("Ingesting GeoJSON features", { region }, "ADMIN");
		const startedAt = new Date().toISOString();

		const jobId = crypto.randomUUID();
		await c.env.DB.prepare(
			`INSERT INTO import_jobs (id, source, region, job_type, started_at, status) VALUES (?, ?, ?, ?, ?, ?)`
		).bind(jobId, "geojson", region, "d1", startedAt, "running").run();

		let collection: GeoJSONFeatureCollection;
		try {
			collection = await c.req.json() as GeoJSONFeatureCollection;
			if (!Array.isArray(collection.features)) {
				throw new Error("Invalid GeoJSON: features array missing");
			}
		} catch (parseErr) {
			await c.env.DB.prepare("UPDATE import_jobs SET status = ?, error_message = ?, finished_at = ? WHERE id = ?")
				.bind("failed", String(parseErr), new Date().toISOString(), jobId).run();
			return c.json({ error: "Invalid GeoJSON", message: String(parseErr) }, 400);
		}

		const now = new Date().toISOString();
		const BATCH_AI = 100;
		const BATCH_VX = 100;
		const BATCH_D1 = 100;

		// Build docs
		interface IngestDoc {
			id: string;
			text: string;
			geom: string;
			meta: Record<string, any>;
		}
		const docs: IngestDoc[] = [];

		for (const feat of collection.features) {
			if (!feat.geometry) continue;
			const p = feat.properties || {};
			const c = centroidOfGeometry(feat.geometry);
			if (!c) continue;
			const id = p.id || `pipeline:${region}:${hashFeature(region, feat)}`;
			const name = p.name || p.ref || p.route_ref || "Unnamed feature";
			const category = p.facility_type || p.category || "trail";
			const text = `${name}. ${category}. ${p.surface || ""} ${p.description || ""}`.trim().slice(0, 512);
			docs.push({
				id,
				text,
				geom: JSON.stringify(feat.geometry),
				meta: {
					name,
					category,
					facility_type: p.facility_type || "",
					region,
					network: p.network || "",
					route_ref: p.route_ref || "",
					lat: c.lat,
					lon: c.lon,
					description: p.description || "",
					surface: p.surface || "",
					length_m: typeof p.length_m === "number" ? p.length_m : null,
					difficulty: p.difficulty || "",
					source: `pipeline:${region}`,
					is_searchable: 1,
					tile_layer: `osm-${region}-bike`,
				},
			});
		}

		// Embed + upsert to Vectorize
		let totalEmbedded = 0;
		for (let i = 0; i < docs.length; i += BATCH_AI) {
			const batch = docs.slice(i, i + BATCH_AI);
			const texts = batch.map(d => d.text);
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

		// Insert into D1 trails + pois
		const insertTrail = c.env.DB.prepare(
			`INSERT OR REPLACE INTO trails
			 (id, source, source_type, source_id, name, category, facility_type, geom, lat, lon,
			  region, network, route_ref, surface, length_m, difficulty, description,
			  is_searchable, tile_layer, status, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		);
		const insertPoi = c.env.DB.prepare(
			`INSERT OR IGNORE INTO pois (id, name, category, lat, lon, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		);

		let insertedD1 = 0;
		const errors: string[] = [];
		for (let i = 0; i < docs.length; i += BATCH_D1) {
			const batch = docs.slice(i, i + BATCH_D1);
			const trailStmts = batch.map(d =>
				insertTrail.bind(
					d.id, "pipeline", "geojson", d.id.replace(/^pipeline:[^:]+:/, ""),
					d.meta.name, d.meta.category, d.meta.facility_type, d.geom,
					d.meta.lat, d.meta.lon, d.meta.region, d.meta.network, d.meta.route_ref,
					d.meta.surface, d.meta.length_m, d.meta.difficulty, d.meta.description,
					d.meta.is_searchable, d.meta.tile_layer, "approved", now
				)
			);
			const poiStmts = batch.map(d =>
				insertPoi.bind(
					d.id, d.meta.name, d.meta.category,
					d.meta.lat, d.meta.lon, d.meta.description,
					"indexed", now
				)
			);
			try {
				await c.env.DB.batch([...trailStmts, ...poiStmts]);
				insertedD1 += batch.length;
			} catch (e: any) {
				if (errors.length < 5) errors.push(`batch ${i}: ${e.message || String(e)}`);
			}
		}

		await c.env.DB.prepare(
			`UPDATE import_jobs SET status = ?, finished_at = ?, features_found = ?, features_inserted = ?, vectors_inserted = ?, error_message = ? WHERE id = ?`
		).bind(
			errors.length ? "completed_with_errors" : "completed",
			new Date().toISOString(),
			docs.length,
			insertedD1,
			totalEmbedded,
			errors.join("; ") || null,
			jobId
		).run();

		return c.json({
			message: `GeoJSON ${region} ingestion complete`,
			region,
			features: docs.length,
			indexed: totalEmbedded,
			insertedToD1: insertedD1,
			errors: errors.length ? errors : undefined,
		});
	}

	return c.json({ error: `Unknown source: ${source}. Use 'd1', 'osm', or 'geojson'.` }, 400);
});
