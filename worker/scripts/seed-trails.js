#!/usr/bin/env node
/* ============================================================
   seed-trails.js — Ingest trail data into Vectorize + D1
   ============================================================
   Usage:
     cd worker && node scripts/seed-trails.js --from-d1
     cd worker && node scripts/seed-trails.js --from-osm
     cd worker && node scripts/seed-trails.js --from-osm --bbox="39.0,-94.9,39.4,-94.2"

   Requires .dev.vars with:
     CLOUDFLARE_ACCOUNT_ID=...
     CLOUDFLARE_API_TOKEN=...      # Needs D1:Read, Vectorize:Edit, AI:Run
   ============================================================ */

const https = require("https");
const { URL } = require("url");

// ------------------------------------------------------------------
// Config (reads from .dev.vars or env)
// ------------------------------------------------------------------
function loadEnv() {
  const fs = require("fs");
  const path = require("path");
  const envFile = path.join(__dirname, "../.dev.vars");
  const out = {};
  if (fs.existsSync(envFile)) {
    fs.readFileSync(envFile, "utf8")
      .split(/\r?\n/)
      .forEach((line) => {
        const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
        if (m) out[m[1]] = m[2];
      });
  }
  return { ...process.env, ...out };
}

const ENV = loadEnv();
const ACCOUNT_ID = ENV.CF_ACCOUNT_ID || ENV.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = ENV.CF_API_TOKEN || ENV.CLOUDFLARE_API_TOKEN;
const DB_ID = "a62046a7-4193-49c1-910f-9e7dbc209009";     // bikeroutes-db
const VX_INDEX = "bikeroutes-trails";                      // TRAIL_SEARCH
const AI_MODEL = "@cf/baai/bge-base-en-v1.5";

if (!ACCOUNT_ID || !API_TOKEN) {
  console.error("❌ Need CF_ACCOUNT_ID and CF_API_TOKEN in .dev.vars or env");
  process.exit(1);
}

// ------------------------------------------------------------------
// HTTP helpers
// ------------------------------------------------------------------
function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}${path}`);
    const opts = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const j = JSON.parse(data);
          if (!j.success) reject(new Error(JSON.stringify(j.errors || j.messages, null, 2)));
          else resolve(j.result);
        } catch { resolve(data); }
      });
    });
    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

// ------------------------------------------------------------------
// Workers AI — embeddings
// ------------------------------------------------------------------
async function embed(texts) {
  const batch = Array.isArray(texts) ? texts : [texts];
  const r = await api("POST", `/ai/run/${AI_MODEL}`, { text: batch });
  // Response: { data: [ { embedding: [...] }, ... ] }
  const out = r.data || r;
  return Array.isArray(out) ? out.map((x) => x.embedding || x) : [out.embedding || out];
}

// ------------------------------------------------------------------
// Vectorize upsert (batch 100)
// ------------------------------------------------------------------
async function vxUpsert(vectors) {
  const BATCH = 100;
  for (let i = 0; i < vectors.length; i += BATCH) {
    const chunk = vectors.slice(i, i + BATCH);
    await api("POST", `/vectorize/v2/indexes/${VX_INDEX}/upsert`, {
      vectors: chunk,
      namespace: "production",
    });
    console.log(`  Vectorize upsert ${i + 1}…${Math.min(i + BATCH, vectors.length)} / ${vectors.length}`);
  }
}

// ------------------------------------------------------------------
// D1 query helper
// ------------------------------------------------------------------
async function d1Query(sql, params = []) {
  const r = await api("POST", `/d1/database/${DB_ID}/query`, { sql, params });
  return r[0]?.results || [];
}

async function d1Exec(sql, binds) {
  const r = await api("POST", `/d1/database/${DB_ID}/query`, { sql, params: binds || [] });
  return r;
}

// ------------------------------------------------------------------
// Phase 1 — Seed from existing D1 POIs
// ------------------------------------------------------------------
async function fromD1() {
  console.log("\n Phase 1 — Seeding from existing D1 POIs…");
  const rows = await d1Query("SELECT id, name, category, lat, lon, description FROM pois");
  console.log(`  Found ${rows.length} POIs in D1`);

  if (!rows.length) return;

  // Build texts + metadata
  const docs = rows.map((r) => ({
    id: String(r.id),
    text: `${r.name}. ${r.category}. ${r.description || ""}`.trim(),
    meta: {
      name: r.name,
      category: r.category,
      lat: r.lat,
      lon: r.lon,
      description: r.description || "",
      source: "d1_poi",
    },
  }));

  // Batch embed (10 at a time to avoid Worker AI limits)
  const vectors = [];
  const EMBED_BATCH = 10;
  for (let i = 0; i < docs.length; i += EMBED_BATCH) {
    const batch = docs.slice(i, i + EMBED_BATCH);
    const emb = await embed(batch.map((d) => d.text));
    batch.forEach((d, idx) => {
      vectors.push({ id: d.id, values: emb[idx], metadata: d.meta });
    });
    process.stdout.write(`  Embedded ${Math.min(i + EMBED_BATCH, docs.length)} / ${docs.length}\r`);
  }
  console.log(); // newline

  await vxUpsert(vectors);

  // Mark D1 rows as vectorized
  for (const d of docs) {
    await d1Exec("UPDATE pois SET status = 'indexed' WHERE id = ?", [d.id]);
  }

  console.log(`✅ Indexed ${vectors.length} D1 POIs into Vectorize`);
}

// ------------------------------------------------------------------
// Phase 2 — Fetch OSM Overpass + ingest
// ------------------------------------------------------------------
async function overpass(query) {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(query);
    const opts = {
      hostname: "overpass-api.de",
      path: `/api/interpreter?data=${encoded}`,
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": "BikeRoutes.org/1.0" },
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error("Overpass JSON parse: " + data.slice(0, 200))); }
      });
    });
    req.on("error", reject);
    req.setTimeout(60000, () => reject(new Error("Overpass timeout")));
    req.end();
  });
}

async function fromOSM(bbox) {
  console.log("\n Phase 2 — Fetching OSM cycleways & trails…");
  console.log(`  BBox: ${bbox}`);

  // Query: cycleways, paths, tracks suitable for bicycles
  const query = `
    [out:json][timeout:60];
    (
      way["highway"="cycleway"](${bbox});
      way["highway"="path"]["bicycle"="yes"](${bbox});
      way["highway"="path"]["route"="bicycle"](${bbox});
      way["highway"="track"]["bicycle"="yes"](${bbox});
      way["route"="bicycle"](${bbox});
      relation["route"="bicycle"](${bbox});
    );
    out center tags 50;
  `;

  const data = await overpass(query);
  const elements = (data.elements || []).filter((e) => e.tags && e.tags.name);
  console.log(`  Got ${elements.length} named trail elements from OSM`);

  if (!elements.length) return;

  // Deduplicate by name+lat+lon rounded to 3 decimals
  const seen = new Set();
  const unique = [];
  for (const e of elements) {
    const lat = e.center?.lat ?? e.lat;
    const lon = e.center?.lon ?? e.lon;
    const key = `${e.tags.name}|${lat?.toFixed(3)}|${lon?.toFixed(3)}`;
    if (!seen.has(key)) { seen.add(key); unique.push(e); }
  }
  console.log(`  Deduplicated to ${unique.length}`);

  // Convert to docs
  const docs = unique.map((e) => {
    const t = e.tags;
    const lat = e.center?.lat ?? e.lat;
    const lon = e.center?.lon ?? e.lon;
    const surface = t.surface || t.tracktype || "";
    const length = t.length || t.distance || "";
    const difficulty = t.mtb_scale || t.sac_scale || t.trail_visibility || "";
    const text = `${t.name}. ${surface ? `Surface: ${surface}.` : ""} ${length ? `Length: ${length}.` : ""} ${difficulty ? `Difficulty: ${difficulty}.` : ""} ${t.description || ""}`.trim();
    const id = `osm:${e.type}:${e.id}`;
    return {
      id,
      text,
      meta: {
        name: t.name,
        category: e.type === "relation" ? "route" : (t.highway || "trail"),
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

  // Embed
  const vectors = [];
  const EMBED_BATCH = 10;
  for (let i = 0; i < docs.length; i += EMBED_BATCH) {
    const batch = docs.slice(i, i + EMBED_BATCH);
    const emb = await embed(batch.map((d) => d.text));
    batch.forEach((d, idx) => {
      vectors.push({ id: d.id, values: emb[idx], metadata: d.meta });
    });
    process.stdout.write(`  Embedded ${Math.min(i + EMBED_BATCH, docs.length)} / ${docs.length}\r`);
  }
  console.log();

  await vxUpsert(vectors);

  // Insert into D1 as new POIs (skip if ID already exists)
  let inserted = 0, skipped = 0;
  for (const d of docs) {
    const exists = await d1Query("SELECT 1 FROM pois WHERE id = ?", [d.id]);
    if (exists.length) { skipped++; continue; }
    await d1Exec(
      "INSERT INTO pois (id, name, category, lat, lon, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [d.id, d.meta.name, d.meta.category, d.meta.lat, d.meta.lon, d.meta.description, "indexed", new Date().toISOString()]
    );
    inserted++;
  }

  console.log(`✅ OSM: Inserted ${inserted} new POIs, skipped ${skipped} duplicates. Indexed ${vectors.length} vectors.`);
}

// ------------------------------------------------------------------
// Phase 3 — Ingest from GeoJSON file (optional user data)
// ------------------------------------------------------------------
async function fromGeoJSON(filePath) {
  const fs = require("fs");
  console.log(`\n Phase 3 — Loading GeoJSON from ${filePath}…`);
  const gj = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const features = (gj.features || []).filter((f) => f.properties?.name);
  console.log(`  Found ${features.length} named features`);

  const docs = features.map((f, i) => {
    const p = f.properties;
    const [lon, lat] = f.geometry?.type === "Point" ? f.geometry.coordinates : (f.geometry?.coordinates?.[0]?.[0] || [0, 0]);
    const text = `${p.name}. ${p.description || ""} ${p.surface || ""} ${p.type || ""}`.trim();
    const id = p.id || `geojson:${i}`;
    return {
      id,
      text,
      meta: { name: p.name, category: p.type || "trail", lat, lon, description: p.description || "", source: "geojson" },
    };
  });

  const vectors = [];
  for (let i = 0; i < docs.length; i += 10) {
    const batch = docs.slice(i, i + 10);
    const emb = await embed(batch.map((d) => d.text));
    batch.forEach((d, idx) => vectors.push({ id: d.id, values: emb[idx], metadata: d.meta }));
    process.stdout.write(`  Embedded ${Math.min(i + 10, docs.length)} / ${docs.length}\r`);
  }
  console.log();

  await vxUpsert(vectors);
  console.log(`✅ Indexed ${vectors.length} GeoJSON features`);
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const flags = {
    fromD1: args.includes("--from-d1"),
    fromOSM: args.includes("--from-osm"),
    fromGeo: args.find((a) => a.startsWith("--geojson=")),
    bbox: (args.find((a) => a.startsWith("--bbox=")) || "--bbox=38.8,-95.0,39.4,-94.2").replace("--bbox=", ""),
    deleteAll: args.includes("--delete-all"),
  };

  if (flags.deleteAll) {
    console.log("⚠️  Deleting all vectors…");
    // Vectorize doesn't have a bulk delete, but we can query and delete by ID
    const all = await api("POST", `/vectorize/v2/indexes/${VX_INDEX}/query`, {
      vector: new Array(768).fill(0),
      top_k: 1000,
      return_values: false,
      return_metadata: false,
    });
    const ids = (all.results || []).map((r) => r.id);
    if (ids.length) {
      await api("POST", `/vectorize/v2/indexes/${VX_INDEX}/delete_by_ids`, { ids });
      console.log(`  Deleted ${ids.length} vectors`);
    }
  }

  if (!flags.fromD1 && !flags.fromOSM && !flags.fromGeo) {
    console.log(`
Usage:
  node scripts/seed-trails.js --from-d1
  node scripts/seed-trails.js --from-osm [--bbox="lat1,lng1,lat2,lng2"]
  node scripts/seed-trails.js --geojson=./trails.geojson
  node scripts/seed-trails.js --delete-all
`);
    process.exit(0);
  }

  if (flags.fromD1) await fromD1();
  if (flags.fromOSM) await fromOSM(flags.bbox);
  if (flags.fromGeo) await fromGeoJSON(flags.fromGeo.replace("--geojson=", ""));

  console.log("\n All done! Your search bar is now loaded with trail smarts.\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
