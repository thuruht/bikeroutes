import { logger } from "../lib/logger";

interface ArcGISFeature {
	geometry: { type: string; coordinates: any };
	properties: Record<string, any>;
}

interface ArcGISResponse {
	features?: ArcGISFeature[];
	exceededTransferLimit?: boolean;
}

const MARC_SERVER = "https://gis2.marc2.org/arcgis/rest/services";

async function fetchArcGISPage(
	url: string, offset = 0, limit = 1000
): Promise<ArcGISResponse> {
	const sep = url.includes("?") ? "&" : "?";
	const pageUrl = `${url}${sep}resultOffset=${offset}&resultRecordCount=${limit}`;
	const res = await fetch(pageUrl);
	if (!res.ok) throw new Error(`ArcGIS fetch failed: ${res.status} for ${pageUrl}`);
	return res.json() as Promise<ArcGISResponse>;
}

async function fetchAllPages(
	baseUrl: string, pageSize = 1000
): Promise<ArcGISFeature[]> {
	let all: ArcGISFeature[] = [];
	let offset = 0;
	while (true) {
		const data = await fetchArcGISPage(baseUrl, offset, pageSize);
		const features = data.features || [];
		if (!features.length) break;
		all = all.concat(features);
		if (!data.exceededTransferLimit) break;
		offset += features.length;
	}
	return all;
}

function computeCentroid(geom: { type: string; coordinates: any }): { lat: number; lon: number } {
	if (geom.type === "Point") {
		const [lon, lat] = geom.coordinates;
		return { lat, lon };
	}
	if (geom.type === "MultiLineString") {
		let sumLat = 0, sumLon = 0, count = 0;
		for (const line of geom.coordinates) {
			for (const [lon, lat] of line) {
				sumLon += lon; sumLat += lat; count++;
			}
		}
		return count > 0 ? { lat: sumLat / count, lon: sumLon / count } : { lat: 0, lon: 0 };
	}
	// LineString
	let sumLat = 0, sumLon = 0, count = 0;
	for (const [lon, lat] of geom.coordinates || []) {
		sumLon += lon; sumLat += lat; count++;
	}
	return count > 0 ? { lat: sumLat / count, lon: sumLon / count } : { lat: 0, lon: 0 };
}

function slugify(s: string): string {
	return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

type BikewayType = "shared_use_path" | "separated_bike_lane" | "bike_lane" | "paved_shoulder" | "marked_bike_route" | "walking_trail" | "mountain_bike" | "equestrian_trail" | "national_historic_trail" | "share_the_road" | "bikeway";

const FACILITY_MAP: Record<string, BikewayType> = {
	"Shared Use Path": "shared_use_path",
	"Separated Bike Lanes": "separated_bike_lane",
	"Bike Lanes": "bike_lane",
	"Paved Shoulders": "paved_shoulder",
	"Marked Bike Route": "marked_bike_route",
	"Walking Trail": "walking_trail",
	"Mountain Bike Trail": "mountain_bike",
	"Equestrian Trail": "equestrian_trail",
	"National Historic Trail": "national_historic_trail",
	"Share the Road Signage": "share_the_road",
};

function classifyBikeway(props: Record<string, any>): BikewayType {
	const ft = props.FacilityType;
	return FACILITY_MAP[ft] || "bikeway";
}

function buildBikewayDocs(features: ArcGISFeature[]): Array<{
	id: string; text: string; geom: string; meta: Record<string, any>;
}> {
	const docs: Array<{
		id: string; text: string; geom: string; meta: Record<string, any>;
	}> = [];
	for (const feat of features) {
		const p = feat.properties;
		const geom = feat.geometry;
		if (!geom) continue;
		const centroid = computeCentroid(geom);
		if (!centroid.lat || !centroid.lon) continue;
		const name = p.RouteName || p.FacilityType || "Unnamed Bikeway";
		const category = classifyBikeway(p);
		const surface = p.SurfaceType || "";
		const lengthMiles = parseFloat(p.LengthInMiles) || 0;
		const widthFeet = parseFloat(p.WidthInFeet) || null;
		const status = p.Status || "";
		const park = p.ParkName || "";
		const jurisdiction = p.Jurisdiction || "";
		const county = p.County || "";
		const descParts = [
			park ? `Located in ${park}` : "",
			jurisdiction ? `Jurisdiction: ${jurisdiction}` : "",
			county ? `County: ${county}` : "",
			p.OnOffRoad === "Off Road" ? "Off-road facility" : "",
			widthFeet ? `Width: ${widthFeet}ft` : "",
		].filter(Boolean);
		const description = descParts.join(". ");
		const idBase = `${p.RouteName || "bikeway"}_${p.FacilityType || "unknown"}`;
		const id = `marc:bikeway:${slugify(idBase)}_${centroid.lat.toFixed(5)}_${centroid.lon.toFixed(5)}`;
		const text = `${name}. ${category}. ${surface ? `Surface: ${surface}.` : ""} ${lengthMiles ? `${lengthMiles.toFixed(1)} miles.` : ""} ${status}. ${description}`.trim().slice(0, 512);
		docs.push({
			id,
			text,
			geom: JSON.stringify(geom),
			meta: {
				name,
				category,
				lat: centroid.lat,
				lon: centroid.lon,
				surface,
				length_m: lengthMiles ? Math.round(lengthMiles * 1609.34) : null,
				status: status.toLowerCase(),
				description,
				source: "marc_bikeway",
				facility_type: category,
				width_ft: widthFeet,
				county,
				jurisdiction,
				park,
			},
		});
	}
	return docs;
}

function buildMetrogreenDocs(features: ArcGISFeature[]): Array<{
	id: string; text: string; geom: string; meta: Record<string, any>;
}> {
	const docs: Array<{
		id: string; text: string; geom: string; meta: Record<string, any>;
	}> = [];
	for (const feat of features) {
		const p = feat.properties;
		const geom = feat.geometry;
		if (!geom) continue;
		const centroid = computeCentroid(geom);
		if (!centroid.lat || !centroid.lon) continue;
		const name = p.Name || p.Label || "MetroGreen Corridor";
		const phase = p.Phase || "";
		const miles = parseFloat(p.Miles) || 0;
		const county = p.County || "";
		const corridor = p.Corridor || "";
		const notes = p.Notes || "";
		const descParts = [
			corridor ? `Corridor: ${corridor}` : "",
			county ? `County: ${county}` : "",
			notes,
		].filter(Boolean);
		const description = descParts.join(". ");
		const id = `marc:metrogreen:${slugify(name)}_${centroid.lat.toFixed(5)}_${centroid.lon.toFixed(5)}`;
		const text = `${name}. MetroGreen corridor. ${phase ? `Phase: ${phase}.` : ""} ${miles ? `${miles.toFixed(1)} miles.` : ""} ${description}`.trim().slice(0, 512);
		docs.push({
			id,
			text,
			geom: JSON.stringify(geom),
			meta: {
				name,
				category: "metro_green",
				lat: centroid.lat,
				lon: centroid.lon,
				surface: "",
				length_m: miles ? Math.round(miles * 1609.34) : null,
				status: phase ? phase.toLowerCase() : "unknown",
				description,
				source: "marc_metrogreen",
				county,
				corridor,
			},
		});
	}
	return docs;
}

function buildTrailAccessDocs(features: ArcGISFeature[]): Array<{
	id: string; text: string; geom: string; meta: Record<string, any>;
}> {
	const docs: Array<{
		id: string; text: string; geom: string; meta: Record<string, any>;
	}> = [];
	for (const feat of features) {
		const p = feat.properties;
		const geom = feat.geometry;
		// Trail_Address has lat/lon fields directly, but also geometry
		const lat = p.Latitude ?? feat.geometry?.coordinates[1];
		const lon = p.Longitude ?? feat.geometry?.coordinates[0];
		if (!lat || !lon) continue;
		const name = p.TrailName || "Trail Access Point";
		const address = p.Address || "";
		const county = p.County || "";
		const descParts = [address, county ? `County: ${county}` : ""].filter(Boolean);
		const description = descParts.join(". ");
		const id = `marc:trail_access:${slugify(name)}_${Number(lat).toFixed(5)}_${Number(lon).toFixed(5)}`;
		const text = `${name}. Trail access point. ${address ? `Address: ${address}.` : ""} ${county}`.trim().slice(0, 512);
		const pointGeom = geom ? JSON.stringify(geom) : JSON.stringify({ type: "Point", coordinates: [lon, lat] });
		docs.push({
			id,
			text,
			geom: pointGeom,
			meta: {
				id,
				name,
				category: "trail_access",
				lat: Number(lat),
				lon: Number(lon),
				description,
				source: "marc_trail_access",
				address,
				county,
			},
		});
	}
	return docs;
}

async function upsertVectors(env: Env, docs: Array<{ id: string; text: string; meta: Record<string, any> }>, label: string) {
	const BATCH_AI = 100;
	const BATCH_VX = 100;
	let total = 0;
	for (let i = 0; i < docs.length; i += BATCH_AI) {
		const batch = docs.slice(i, i + BATCH_AI);
		let emb;
		try {
			emb = await env.AI.run("@cf/baai/bge-base-en-v1.5", { text: batch.map(d => d.text) }) as { data: number[][] };
		} catch (e) {
			logger.error(`AI embed failed for ${label} at offset ${i}`, e, "SYNC");
			continue;
		}
		const vectors = emb.data.map((values, idx) => ({
			id: batch[idx].id,
			values,
			metadata: batch[idx].meta,
		}));
		for (let j = 0; j < vectors.length; j += BATCH_VX) {
			try {
				await env.TRAIL_SEARCH.upsert(vectors.slice(j, j + BATCH_VX));
			} catch (e) {
				logger.error(`Vectorize upsert failed for ${label}`, e, "SYNC");
			}
		}
		total += vectors.length;
	}
	logger.info(`Indexed ${total} vectors for ${label}`, undefined, "SYNC");
	return total;
}

export async function syncMarcBikeways(env: Env): Promise<{
	trailsInserted: number;
	poisInserted: number;
}> {
	logger.info("Starting MARC bikeway sync", undefined, "SYNC");
	let trailsInserted = 0;
	let poisInserted = 0;
	const now = new Date().toISOString();

	// ── 1. BikewaysAndTrails (layer 10: combined) ──
	logger.info("Fetching BikewaysAndTrails layer 10", undefined, "SYNC");
	try {
		const base = `${MARC_SERVER}/Recreation/BikewaysAndTrails/MapServer/10/query?where=1%3D1&outFields=RouteName,FacilityType,FacilitySubType,SurfaceType,Status,LengthInMiles,WidthInFeet,County,Jurisdiction,ParkName,OnOffRoad,City,RegionalBikewayPlan,MetroGreen&returnGeometry=true&f=geojson&outSR=4326`;
		const features = await fetchAllPages(base, 5000);
		logger.info(`Got ${features.length} bikeway features`, undefined, "SYNC");
		const docs = buildBikewayDocs(features);
		logger.info(`Built ${docs.length} bikeway docs`, undefined, "SYNC");

		// Embed to Vectorize
		await upsertVectors(env, docs, "bikeways");

		// Insert into trails table
		const stmt = env.DB.prepare(
			"INSERT OR IGNORE INTO trails (id, source, source_type, source_id, name, category, geom, lat, lon, surface, length_m, difficulty, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
		);
		const queries: D1PreparedStatement[] = [];
		for (const d of docs) {
			queries.push(stmt.bind(
				d.id, "marc", "bikeway", d.id,
				d.meta.name, d.meta.category, d.geom,
				d.meta.lat, d.meta.lon,
				d.meta.surface, d.meta.length_m, "",
				d.meta.description.slice(0, 256), d.meta.status || "approved", now
			));
		}
		for (let i = 0; i < queries.length; i += 50) {
			await env.DB.batch(queries.slice(i, i + 50));
		}
		trailsInserted += queries.length;
		logger.info(`Inserted ${queries.length} bikeways to trails table`, undefined, "SYNC");
	} catch (e) {
		logger.error("BikewaysAndTrails sync failed", e, "SYNC");
	}

	// ── 2. Metrogreen_Corridors (layer 0) ──
	logger.info("Fetching Metrogreen_Corridors layer 0", undefined, "SYNC");
	try {
		const base = `${MARC_SERVER}/Recreation/Metrogreen_Corridors/MapServer/0/query?where=1%3D1&outFields=Name,Label,Phase,Miles,County,Corridor,Notes&returnGeometry=true&f=geojson&outSR=4326`;
		const features = await fetchAllPages(base, 1000);
		logger.info(`Got ${features.length} metrogreen features`, undefined, "SYNC");
		const docs = buildMetrogreenDocs(features);
		logger.info(`Built ${docs.length} metrogreen docs`, undefined, "SYNC");

		await upsertVectors(env, docs, "metrogreen");

		const stmt = env.DB.prepare(
			"INSERT OR IGNORE INTO trails (id, source, source_type, source_id, name, category, geom, lat, lon, surface, length_m, difficulty, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
		);
		const queries: D1PreparedStatement[] = [];
		for (const d of docs) {
			queries.push(stmt.bind(
				d.id, "marc", "metro_green", d.id,
				d.meta.name, d.meta.category, d.geom,
				d.meta.lat, d.meta.lon,
				"", d.meta.length_m, "",
				d.meta.description.slice(0, 256), d.meta.status, now
			));
		}
		for (let i = 0; i < queries.length; i += 50) {
			await env.DB.batch(queries.slice(i, i + 50));
		}
		trailsInserted += queries.length;
		logger.info(`Inserted ${queries.length} metrogreen to trails table`, undefined, "SYNC");
	} catch (e) {
		logger.error("Metrogreen sync failed", e, "SYNC");
	}

	// ── 3. Trail_Address (layer 0) → pois table ──
	logger.info("Fetching Trail_Address layer 0", undefined, "SYNC");
	try {
		const base = `${MARC_SERVER}/Recreation/Trail_Address/MapServer/0/query?where=1%3D1&outFields=TrailName,Address,County,Latitude,Longitude&returnGeometry=true&f=geojson&outSR=4326`;
		const features = await fetchAllPages(base, 1000);
		logger.info(`Got ${features.length} trail access features`, undefined, "SYNC");
		const docs = buildTrailAccessDocs(features);
		logger.info(`Built ${docs.length} trail access docs`, undefined, "SYNC");

		await upsertVectors(env, docs, "trail_access");

		const stmt = env.DB.prepare(
			"INSERT OR IGNORE INTO pois (id, name, category, lat, lon, description, submitted_by, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'MARC_GIS', 'approved', ?)"
		);
		const queries: D1PreparedStatement[] = [];
		for (const d of docs) {
			queries.push(stmt.bind(
				d.meta.id || d.id,
				d.meta.name,
				"trail_access",
				d.meta.lat,
				d.meta.lon,
				d.meta.description.slice(0, 256),
				now
			));
		}
		for (let i = 0; i < queries.length; i += 50) {
			await env.DB.batch(queries.slice(i, i + 50));
		}
		poisInserted += queries.length;
		logger.info(`Inserted ${queries.length} trail access points to pois table`, undefined, "SYNC");
	} catch (e) {
		logger.error("Trail_Address sync failed", e, "SYNC");
	}

	logger.info("MARC bikeway sync complete", { trailsInserted, poisInserted }, "SYNC");
	return { trailsInserted, poisInserted };
}
