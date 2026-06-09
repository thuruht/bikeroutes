/* ============================================================
   api.js — BikeRoutes data layer
   ------------------------------------------------------------
   Workers endpoints first, fallback to public APIs, then
   straight-line estimate. Exposes the BR namespace.
   ============================================================ */

// ---- config ---------------------------------------------------
const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";
const BROUTER_URL = "https://brouter.de/brouter";

// pref -> BRouter profile
const PROFILE = { balanced: "trekking", quiet: "safety", fast: "fastbike" };

// ---- math helpers ---------------------------------------------
const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;

function haversine(a, b) {
  const dLat = rad(b[1] - a[1]), dLng = rad(b[0] - a[0]);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function bearing(a, b) {
  const y = Math.sin(rad(b[0] - a[0])) * Math.cos(rad(b[1]));
  const x = Math.cos(rad(a[1])) * Math.sin(rad(b[1])) -
    Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(rad(b[0] - a[0]));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function pathLen(coords) {
  let d = 0;
  for (let i = 1; i < coords.length; i++) d += haversine(coords[i - 1], coords[i]);
  return d;
}

// elevation profile from 3D coords if present, else gentle synthetic
function buildElev(coords, dist) {
  const has3d = coords.length && coords[0].length > 2;
  const pts = [];
  let acc = 0;
  for (let i = 0; i < coords.length; i++) {
    if (i > 0) acc += haversine(coords[i - 1], coords[i]);
    const e = has3d ? coords[i][2]
      : 240 + 40 * Math.sin(i / coords.length * Math.PI * 3) + 14 * Math.sin(i / 7);
    pts.push({ d: acc, e });
  }
  // downsample to ~80 pts for the chart
  const step = Math.max(1, Math.floor(pts.length / 80));
  return pts.filter((_, i) => i % step === 0 || i === pts.length - 1);
}

// turn list from significant bearing changes
function deriveTurns(coords) {
  if (coords.length < 2) return [];
  const turns = [{ type: "start", road: "Start", dist: 0, at: coords[0] }];
  let segStart = 0;
  for (let i = 2; i < coords.length; i++) {
    const b1 = bearing(coords[i - 2], coords[i - 1]);
    const b2 = bearing(coords[i - 1], coords[i]);
    let delta = ((b2 - b1 + 540) % 360) - 180;
    if (Math.abs(delta) > 38) {
      let d = 0;
      for (let k = segStart + 1; k <= i - 1; k++) d += haversine(coords[k - 1], coords[k]);
      turns.push({
        type: delta > 0 ? "right" : "left",
        road: "Continue", dist: d, at: coords[i - 1],
      });
      segStart = i - 1;
    }
  }
  let d = 0;
  for (let k = segStart + 1; k < coords.length; k++) d += haversine(coords[k - 1], coords[k]);
  turns.push({ type: "arrive", road: "Arrive at destination", dist: d, at: coords[coords.length - 1] });
  return turns.filter((t, i) => i === 0 || i === turns.length - 1 || t.dist > 60).slice(0, 12);
}

// surface split from BRouter WayTags messages
function surfaceFromMessages(messages) {
  if (!Array.isArray(messages) || messages.length < 2) return { paved: 82, gravel: 18, est: true };
  const head = messages[0];
  const li = head.indexOf("WayTags");
  const di = head.indexOf("Distance");
  if (li < 0) return { paved: 82, gravel: 18, est: true };
  let paved = 0, gravel = 0;
  for (let i = 1; i < messages.length; i++) {
    const tags = (messages[i][li] || "");
    const dist = parseFloat(messages[i][di]) || 0;
    if (/surface=(gravel|dirt|ground|unpaved|sand|fine_gravel|compacted)/.test(tags)) gravel += dist;
    else paved += dist;
  }
  const tot = paved + gravel || 1;
  return { paved: Math.round(paved / tot * 100), gravel: Math.round(gravel / tot * 100), est: false };
}

// straight-line fallback through all waypoints
function estimate(pts) {
  const coords = [];
  const per = 30;
  for (let s = 0; s < pts.length - 1; s++) {
    const A = [pts[s].lng, pts[s].lat], B = [pts[s + 1].lng, pts[s + 1].lat];
    for (let i = (s === 0 ? 0 : 1); i <= per; i++)
      coords.push([A[0] + (B[0] - A[0]) * i / per, A[1] + (B[1] - A[1]) * i / per]);
  }
  const dist = pathLen(coords) * 1.32;
  return {
    coords, dist, time: dist / 4.2, ascend: Math.round(dist / 1000 * 8),
    elev: buildElev(coords, dist), turns: deriveTurns(coords),
    surface: { paved: 80, gravel: 20, est: true }, source: "estimated", profile: "—",
    waypoints: pts.length,
  };
}

// Adapt Valhalla JSON response to contract shape
function adaptValhalla(data, pts) {
  // Valhalla returns { trip: { legs: [...], summary: {...} } }
  if (!data || !data.trip) throw new Error("not valhalla format");
  const trip = data.trip;
  const summary = trip.summary || {};

  // decode polyline from all legs
  const allCoords = [];
  for (const leg of (trip.legs || [])) {
    if (leg.shape) {
      const decoded = decodePolyline(leg.shape, 6);
      // avoid duplicating the junction point between legs
      const start = allCoords.length > 0 ? 1 : 0;
      for (let i = start; i < decoded.length; i++) allCoords.push(decoded[i]);
    }
  }

  if (allCoords.length < 2) throw new Error("no coords from valhalla");

  const dist = (summary.length || 0) * 1000; // km -> m
  const time = summary.time || (dist / 4.5);
  const ascend = summary.max_up_curvature != null ? summary.max_up_curvature : 0;

  // Build turns from maneuvers
  const turns = [];
  let cumDist = 0;
  let coordIdx = 0;
  for (const leg of (trip.legs || [])) {
    for (const man of (leg.maneuvers || [])) {
      const type = valhallaManType(man.type);
      const at = allCoords[Math.min(man.begin_shape_index || coordIdx, allCoords.length - 1)];
      turns.push({
        type,
        road: man.street_names ? man.street_names[0] : (type === "start" ? "Start" : type === "arrive" ? "Arrive at destination" : "Continue"),
        dist: cumDist,
        at,
      });
      cumDist += (man.length || 0) * 1000;
    }
    // offset coord index for next leg
    if (leg.shape) coordIdx += decodePolyline(leg.shape, 6).length;
  }

  // Ensure start + arrive bookends
  if (turns.length === 0 || turns[0].type !== "start") {
    turns.unshift({ type: "start", road: "Start", dist: 0, at: allCoords[0] });
  }
  const lastTurn = turns[turns.length - 1];
  if (!lastTurn || lastTurn.type !== "arrive") {
    turns.push({ type: "arrive", road: "Arrive at destination", dist: cumDist, at: allCoords[allCoords.length - 1] });
  }

  return {
    coords: allCoords,
    dist: dist || pathLen(allCoords),
    time,
    ascend,
    elev: buildElev(allCoords, dist || pathLen(allCoords)),
    turns: turns.slice(0, 12),
    surface: { paved: 82, gravel: 18, est: true },
    source: "worker",
    profile: "bicycle",
    waypoints: pts.length,
  };
}

function valhallaManType(t) {
  // Valhalla maneuver type numbers
  if (t === 1) return "start";
  if (t === 4) return "right";
  if (t === 3) return "left";
  if (t === 5) return "right"; // slight right
  if (t === 6) return "left";  // slight left
  if (t === 7) return "right"; // sharp right
  if (t === 8) return "left";  // sharp left
  if (t === 24) return "arrive";
  return "dot";
}

// Google's encoded polyline decode (Valhalla uses precision=6)
function decodePolyline(encoded, precision) {
  const factor = Math.pow(10, precision || 5);
  const coords = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;
    coords.push([lng / factor, lat / factor]);
  }
  return coords;
}

// ---- exported BR namespace ------------------------------------
export const BR = {
  HOME: { lng: -94.5786, lat: 39.0997, zoom: 12 },
  TILES: {
    dark: "/api/tiles/{z}/{x}/{y}.png",
    light: "/api/tiles/{z}/{x}/{y}.png",
    attribution: '© OpenStreetMap contributors',
  },

  haversine,

  // ---- geocoding ---------------------------------------------
  async geocode(q) {
    if (!q || !q.trim()) return [];
    // 1. Try worker proxy
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j)) return j;
      }
    } catch (_) { /* fall through */ }
    // 2. Fallback: Nominatim direct
    try {
      const url = `${NOMINATIM_SEARCH}?format=jsonv2&limit=6&addressdetails=1&q=${encodeURIComponent(q)}`;
      const r = await fetch(url, { headers: { "Accept": "application/json" } });
      const j = await r.json();
      return j.map((d) => ({
        label: d.display_name,
        short: d.name || d.display_name.split(",")[0],
        kind: d.type || d.category,
        lng: parseFloat(d.lon),
        lat: parseFloat(d.lat),
      }));
    } catch (e) {
      console.warn("geocode failed", e);
      return [];
    }
  },

  async reverse(lng, lat) {
    // 1. Try worker proxy
    try {
      const r = await fetch(`/api/reverse?lng=${lng}&lat=${lat}`);
      if (r.ok) {
        const j = await r.json();
        if (typeof j.label === "string") return j.label;
      }
    } catch (_) { /* fall through */ }
    // 2. Fallback: Nominatim direct
    try {
      const r = await fetch(`${NOMINATIM_REVERSE}?format=jsonv2&lon=${lng}&lat=${lat}`);
      const j = await r.json();
      return j.name || (j.display_name || "").split(",").slice(0, 2).join(", ") ||
        `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  },

  // ---- routing -----------------------------------------------
  async route(points, pref) {
    const pts = points.filter(p => p && isFinite(p.lng) && isFinite(p.lat));
    if (pts.length < 2) return null;
    const profile = PROFILE[pref] || "trekking";

    // 1. Try worker (/api/route → Valhalla)
    try {
      const body = JSON.stringify({
        locations: pts.map(p => ({ lon: p.lng, lat: p.lat })),
        costing: "bicycle",
        costing_options: {
          bicycle: {
            bicycle_type: pref === "fast" ? "Road" : pref === "quiet" ? "City" : "Hybrid",
          },
        },
        directions_options: { units: "km" },
      });
      const r = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (r.ok) {
        const data = await r.json();
        try {
          return adaptValhalla(data, pts);
        } catch (adaptErr) {
          console.warn("valhalla adapt failed:", adaptErr.message);
        }
      }
    } catch (e) {
      console.warn("worker route failed:", e.message);
    }

    // 2. Fallback: BRouter public
    try {
      const lonlats = pts.map(p => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join("|");
      const url = `${BROUTER_URL}?lonlats=${lonlats}&profile=${profile}&alternativeidx=0&format=geojson`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("brouter " + r.status);
      const gj = await r.json();
      const f = gj.features[0];
      const coords = f.geometry.coordinates;
      const p = f.properties || {};
      const dist = parseFloat(p["track-length"]) || pathLen(coords);
      const time = parseFloat(p["total-time"]) || dist / 4.5;
      const ascend = parseFloat(p["filtered ascend"] ?? p["plain-ascend"]) || 0;
      return {
        coords, dist, time, ascend,
        elev: buildElev(coords, dist),
        turns: deriveTurns(coords),
        surface: surfaceFromMessages(p.messages),
        source: "brouter", profile, waypoints: pts.length,
      };
    } catch (e) {
      console.warn("route fell back to estimate:", e.message);
    }

    // 3. Straight-line estimate
    return estimate(pts);
  },

  // point [lng,lat] at fraction (0..1) of total length
  pointAtFrac(coords, frac) {
    if (!coords || coords.length < 2) return null;
    const total = pathLen(coords);
    const target = Math.max(0, Math.min(1, frac)) * total;
    let acc = 0;
    for (let i = 1; i < coords.length; i++) {
      const seg = haversine(coords[i - 1], coords[i]);
      if (acc + seg >= target) {
        const t = seg ? (target - acc) / seg : 0;
        return [
          coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * t,
          coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * t,
        ];
      }
      acc += seg;
    }
    return coords[coords.length - 1];
  },

  // ---- formatting --------------------------------------------
  fmtKm: (m) => (m / 1000).toFixed(m < 10000 ? 1 : 0),
  fmtTime: (s) => {
    const m = Math.round(s / 60);
    return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
  },
};

// Legacy named exports for any remaining callers
export const haversine_fn = haversine;
export { haversine };
export async function searchLocations(q) { return BR.geocode(q); }
export async function getRoute(a, b, pref) { return BR.route([a, b], pref); }
export const API = {
  TILES: BR.TILES,
  HOME: BR.HOME,
};
