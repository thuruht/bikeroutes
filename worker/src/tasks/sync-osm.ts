/**
 * OSM data sync task — fetches trails, bridges, rail from Overpass API
 * and upserts into D1 + Vectorize.
 *
 * Used by the daily cron to keep data fresh.
 */

import { logger } from "../lib/logger";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "bikeroutes.org/1.0 (contact@bikeroutes.org)";
const BBOX = "38.8,-95.0,39.4,-94.2";

const TRAIL_QUERIES = `
  way["highway"="cycleway"](${BBOX});
  way["highway"="path"]["bicycle"="yes"](${BBOX});
  way["highway"="path"]["route"="bicycle"](${BBOX});
  way["highway"="track"]["bicycle"="yes"](${BBOX});
  way["highway"="footway"]["bicycle"="yes"](${BBOX});
  way["highway"="footbridge"](${BBOX});
  way["bridge"="yes"]["highway"="path"](${BBOX});
  way["bridge"="yes"]["highway"="cycleway"](${BBOX});
  way["bridge"="yes"]["highway"="footway"]["bicycle"="yes"](${BBOX});
  way["highway"="construction"]["construction"="cycleway"](${BBOX});
  way["highway"="construction"]["construction"="path"](${BBOX});
  way["highway"="construction"]["construction"="footbridge"](${BBOX});
  relation["route"="bicycle"](${BBOX});
`;

const RAIL_QUERIES = `
  way["railway"="rail"](${BBOX});
  way["railway"="disused"](${BBOX});
  way["railway"="abandoned"](${BBOX});
  way["railway"="light_rail"](${BBOX});
  way["railway"="tram"](${BBOX});
  node["railway"="station"](${BBOX});
  node["railway"="halt"](${BBOX});
  node["railway"="junction"](${BBOX});
`;

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

function buildGeom(e: any): { geom: any; category: string } {
	const t = e.tags;
	let category = "trail";
	if (t.railway) {
		if (t.railway === "station" || t.railway === "halt" || t.railway === "junction") category = t.railway;
		else category = "railway";
	} else if (e.type === "relation") category = "route";
	else if (t.highway === "footbridge" || t.bridge === "yes") category = "bridge";
	else if (t.highway === "construction") category = "construction";
	else category = t.highway || "trail";

	if (e.type === "node") {
		return { geom: { type: "Point", coordinates: [e.lon, e.lat] }, category };
	}
	if (e.geometry && Array.isArray(e.geometry) && e.geometry.length >= 2) {
		const coords = e.geometry.map((n: any) => [n.lon, n.lat]);
		return { geom: { type: "LineString", coordinates: coords }, category };
	}
	const c = centroid(e);
	return { geom: { type: "Point", coordinates: [c?.lon ?? e.lon, c?.lat ?? e.lat] }, category };
}

export async function syncOsmData(env: Env, types = "trail,rail") {
	logger.info("Starting OSM data sync", { bbox: BBOX, types }, "CRON");

	const typeList = types.split(",").map(s => s.trim());

	const fetchOverpass = async (q: string, output: string) => {
		const query = `[out:json][timeout:180];(${q});${output};`;
		const res = await fetch(OVERPASS_URL, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
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
	if (typeList.includes("trail")) {
		allElements = allElements.concat(await fetchOverpass(TRAIL_QUERIES, "out center 500"));
	}
	if (typeList.includes("rail")) {
		allElements = allElements.concat(await fetchOverpass(RAIL_QUERIES, "out geom"));
	}

	// Rail features rarely have name tags — use fallback display names.
	// Trail features must have a name to be useful.
	const elements = allElements.filter((e: any) => {
		const t = e.tags || {};
		if (t.railway) return true;
		return !!t.name;
	});

	const seen = new Set<string>();
	const unique: any[] = [];
	for (const e of elements) {
		const c = centroid(e);
		if (!c) continue;
		const key = `${e.type}:${e.id}`;
		if (!seen.has(key)) { seen.add(key); unique.push(e); }
	}

	if (!unique.length) {
		logger.info("No new OSM features found", undefined, "CRON");
		return;
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

	// Batch embed
	const BATCH_AI = 100;
	const BATCH_VX = 100;
	let totalEmbedded = 0;

	for (let i = 0; i < docs.length; i += BATCH_AI) {
		const batch = docs.slice(i, i + BATCH_AI);
		const texts = batch.map((d) => d.text);
		const emb = await env.AI.run("@cf/baai/bge-base-en-v1.5", { text: texts }) as { data: number[][] };
		const vectors = emb.data.map((values, idx) => ({
			id: batch[idx].id,
			values,
			metadata: batch[idx].meta as Record<string, any>,
		}));
		for (let j = 0; j < vectors.length; j += BATCH_VX) {
			await env.TRAIL_SEARCH.upsert(vectors.slice(j, j + BATCH_VX));
		}
		totalEmbedded += vectors.length;
	}

	// Insert into D1 (replace so re-syncing updates geometries)
	const now = new Date().toISOString();
	const insertTrail = env.DB.prepare(
		"INSERT OR REPLACE INTO trails (id, source, source_type, source_id, name, category, geom, lat, lon, surface, length_m, difficulty, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
	);
	const insertPoi = env.DB.prepare(
		"INSERT OR IGNORE INTO pois (id, name, category, lat, lon, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
	);

	const BATCH_D1 = 100;
	let inserted = 0;
	for (let i = 0; i < docs.length; i += BATCH_D1) {
		const batch = docs.slice(i, i + BATCH_D1);
		const trailStmts = batch.map((d) =>
			insertTrail.bind(
				d.id, "osm", d.meta.source, d.id.replace("osm:", ""),
				d.meta.name, d.meta.category, d.geom,
				d.meta.lat, d.meta.lon,
				d.meta.surface, d.meta.length_m, d.meta.difficulty,
				d.meta.description, "approved", now
			)
		);
		const poiStmts = batch.map((d) =>
			insertPoi.bind(
				d.id, d.meta.name, d.meta.category,
				d.meta.lat, d.meta.lon, d.meta.description,
				"indexed", now
			)
		);
		try {
			await env.DB.batch([...trailStmts, ...poiStmts]);
			inserted += batch.length;
		} catch (error) {
			logger.error("D1 batch insert failed", { error, batch: i }, "CRON");
		}
	}

	logger.info("OSM sync complete", {
		found: elements.length,
		deduplicated: unique.length,
		indexed: totalEmbedded,
		inserted,
	}, "CRON");
}
