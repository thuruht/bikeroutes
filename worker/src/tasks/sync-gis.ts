/**
 * sync-gis.ts
 *
 * Fetches authoritative point-of-interest data from the MARC GIS server
 * and imports it into the D1 `pois` database for routing and search.
 */

interface GeoJSONFeature {
	geometry: {
		type: string;
		coordinates: [number, number];
	};
	properties: any;
}

interface GeoJSONFeatureCollection {
	features: GeoJSONFeature[];
}

export async function syncGisData(env: Env): Promise<void> {
	console.log("[SYNC] Starting MARC GIS sync...");

	const endpoints = [
		{
			url: "https://gis2.marc2.org/arcgis/rest/services/Recreation/PublicRestrooms/MapServer/0/query?where=1=1&outFields=*&f=geojson",
			category: "restroom",
			parseFunc: (feat: GeoJSONFeature) => ({
				name: feat.properties.ParkName ? `${feat.properties.ParkName} Restroom` : "Public Restroom",
				description: feat.properties.Address || "",
			}),
		},
		{
			url: "https://gis2.marc2.org/arcgis/rest/services/Recreation/RideKCBikehubs/MapServer/0/query?where=1=1&outFields=*&f=geojson",
			category: "bike_hub",
			parseFunc: (feat: GeoJSONFeature) => ({
				name: feat.properties.Name || "RideKC Bike Hub",
				description: feat.properties.PopupInfo ? "RideKC Bike Share Location" : "",
			}),
		},
		{
			url: "https://gis2.marc2.org/arcgis/rest/services/Temporary/WorldCup/MapServer/1/query?where=1=1&outFields=*&f=geojson",
			category: "food",
			parseFunc: (feat: GeoJSONFeature) => ({
				name: feat.properties.name || "Top KC BBQ",
				description: feat.properties.Address || "",
			}),
		},
		{
			url: "https://gis2.marc2.org/arcgis/rest/services/Temporary/WorldCup/MapServer/4/query?where=1=1&outFields=*&f=geojson",
			category: "stadium",
			parseFunc: (feat: GeoJSONFeature) => ({
				name: feat.properties.name || "Stadium",
				description: feat.properties.Facility_Type || "",
			}),
		},
	];

	let totalInserted = 0;

	for (const endpoint of endpoints) {
		try {
			console.log(`[SYNC] Fetching ${endpoint.category} from ${endpoint.url}`);
			const resp = await fetch(endpoint.url);
			if (!resp.ok) {
				console.error(`[SYNC] Failed to fetch ${endpoint.category}: ${resp.status}`);
				continue;
			}

			const data = await resp.json() as GeoJSONFeatureCollection;
			const features = data.features || [];
			console.log(`[SYNC] Found ${features.length} ${endpoint.category} features`);

			const now = new Date().toISOString();

			// Prepare bulk insert queries
			const queries = [];
			const stmt = env.DB.prepare(`
				INSERT OR IGNORE INTO pois (id, name, category, lat, lon, description, submitted_by, status, created_at)
				VALUES (?, ?, ?, ?, ?, ?, 'MARC_GIS', 'approved', ?)
			`);

			for (const feat of features) {
				if (feat.geometry?.type === "Point" && feat.geometry.coordinates) {
					const [lon, lat] = feat.geometry.coordinates;
					const parsed = endpoint.parseFunc(feat);
					// Generate a deterministic ID so we don't duplicate on re-runs
					const id = `marc_${endpoint.category}_${lat.toFixed(5)}_${lon.toFixed(5)}`;

					queries.push(stmt.bind(
						id,
						parsed.name,
						endpoint.category,
						lat,
						lon,
						parsed.description,
						now
					));
				}
			}

			// Execute in batches to avoid D1 limits
			const BATCH_SIZE = 50;
			for (let i = 0; i < queries.length; i += BATCH_SIZE) {
				const batch = queries.slice(i, i + BATCH_SIZE);
				await env.DB.batch(batch);
			}

			totalInserted += queries.length;
			console.log(`[SYNC] Successfully synced ${queries.length} ${endpoint.category} items`);

		} catch (e) {
			console.error(`[SYNC] Error processing ${endpoint.category}:`, e);
		}
	}

	console.log(`[SYNC] GIS sync complete. Total items processed: ${totalInserted}`);
}
