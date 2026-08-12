#!/usr/bin/env node
// classify-features.mjs — read OSM GeoJSON, assign facility_type and search props,
// emit a classified GeoJSON plus a named-features GeoJSON for D1/Vectorize ingestion.
import { readFileSync, writeFileSync } from "node:fs";

const [inputPath, classifiedOut, namedOut] = process.argv.slice(2);
if (!inputPath || !classifiedOut || !namedOut) {
  console.error("Usage: node classify-features.mjs input.geojson classified.geojson named.geojson");
  process.exit(1);
}

const PAVED = new Set([
  "asphalt", "concrete", "paved", "chipseal", "sett", "cobblestone",
]);
const UNPAVED = new Set([
  "unpaved", "gravel", "fine_gravel", "pebblestone", "ground", "dirt", "grass",
  "mud", "sand", "woodchips", "compacted",
]);

function classify(tags = {}) {
  const h = tags.highway || "";
  const r = tags.railway || "";

  if (r) return r === "station" || r === "halt" || r === "junction" ? r : "railway";
  if (tags.route === "mtb") return "mtb_route";
  if (tags.route === "bicycle") return "cycle_route";
  if (h === "construction") return "construction";

  const cycleway = tags.cycleway || "";
  const left = tags["cycleway:left"] || "";
  const right = tags["cycleway:right"] || "";

  // Protected / separated cycletrack
  if (
    cycleway === "track" ||
    left === "track" || right === "track" ||
    tags.bicycle_road === "yes" ||
    tags.cyclestreet === "yes"
  ) {
    return "protected_bikelane";
  }

  // Painted / conventional bike lanes
  if (
    cycleway === "lane" || cycleway === "opposite_lane" ||
    left === "lane" || right === "lane" ||
    tags.bicycle === "designated" && h.match(/^(residential|tertiary|secondary|primary|service|unclassified)$/)
  ) {
    return "bike_lane";
  }

  // Shared-use paths and multi-use trails
  if (h === "cycleway") {
    if (tags.segregated === "yes" || tags.foot === "no") return "separated_bikelane";
    return "shared_use_path";
  }
  if (h === "path") {
    if (tags.bicycle === "designated" || tags.bicycle === "yes") return "shared_use_path";
    return "path";
  }
  if (h === "footway" && tags.bicycle && tags.bicycle !== "no") return "shared_use_path";
  if (h === "track" && tags.bicycle && tags.bicycle !== "no") return "track";
  if (h === "bridleway") return "equestrian_trail";

  return h || "trail";
}

function surfaceKind(tags) {
  const s = (tags.surface || tags.tracktype || "").toLowerCase();
  if (PAVED.has(s)) return "paved";
  if (UNPAVED.has(s)) return "unpaved";
  return "unknown";
}

function isSeasonal(tags) {
  return /^(yes|winter_only|summer_only)$/.test(tags.seasonal || "");
}

function accessList(tags) {
  return Object.entries(tags)
    .filter(([k]) => k.startsWith("access") || k === "motor_vehicle" || k === "bicycle" || k === "foot")
    .map(([k, v]) => `${k}=${v}`);
}

function networkTier(tags) {
  return tags.network || ""; // ncn, rcn, lcn
}

function routeRef(tags) {
  return tags.ref || "";
}

function shouldIndex(tags) {
  // Only named routes and named trails get embedded in Vectorize and D1 searchable tables
  return !!(tags.name || tags.ref || tags.route === "bicycle" || tags.route === "mtb");
}

function lengthM(geom) {
  if (!geom || geom.type !== "LineString" || !Array.isArray(geom.coordinates)) return null;
  let m = 0;
  const coords = geom.coordinates;
  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1];
    const [lon2, lat2] = coords[i];
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    m += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return m;
}

const raw = JSON.parse(readFileSync(inputPath, "utf8"));
const features = raw.features || [];

const classifiedFeatures = [];
const namedFeatures = [];

for (const f of features) {
  const tags = f.properties || {};
  const facility = classify(tags);
  const surface = surfaceKind(tags);
  const len = lengthM(f.geometry);

  const outProps = {
    ...tags,
    facility_type: facility,
    surface_kind: surface,
    is_paved: surface === "paved" ? 1 : surface === "unpaved" ? 0 : null,
    is_seasonal: isSeasonal(tags) ? 1 : 0,
    access_tags: JSON.stringify(accessList(tags)),
    network: networkTier(tags),
    route_ref: routeRef(tags),
    length_m: len,
    source_date: tags["source:date"] || "",
  };

  classifiedFeatures.push({
    type: "Feature",
    geometry: f.geometry,
    properties: outProps,
  });

  if (shouldIndex(tags)) {
    namedFeatures.push({
      type: "Feature",
      geometry: f.geometry,
      properties: outProps,
    });
  }
}

writeFileSync(classifiedOut, JSON.stringify({ type: "FeatureCollection", features: classifiedFeatures }));
writeFileSync(namedOut, JSON.stringify({ type: "FeatureCollection", features: namedFeatures }));

console.log(`Classified ${classifiedFeatures.length} features, ${namedFeatures.length} named/searchable.`);
