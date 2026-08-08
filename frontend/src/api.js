/* ============================================================
   api.js — production data layer (Cloudflare Worker backend)
   ============================================================ */

const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;

export function haversine(a, b) {
  const dLat = rad(b[1] - a[1]), dLng = rad(b[0] - a[0]);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function pathLen(coords) {
  let d = 0; for (let i = 1; i < coords.length; i++) d += haversine(coords[i - 1], coords[i]); return d;
}

// Valhalla returns encoded polylines (precision 6). Decode to GeoJSON [lng,lat] coords.
function decodePolyline6(str) {
  const coords = [];
  let i = 0, lat = 0, lng = 0;
  while (i < str.length) {
    let b, shift = 0, result = 0;
    do { b = str.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1); lat += dlat;
    shift = 0; result = 0;
    do { b = str.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1); lng += dlng;
    coords.push([lng * 1e-6, lat * 1e-6]);
  }
  return coords;
}

function getShape(leg) {
  const s = leg.shape;
  if (Array.isArray(s)) return s; // already GeoJSON
  if (typeof s === "string" && s.length) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.coordinates)) return parsed.coordinates;
    } catch {
      return decodePolyline6(s);
    }
  }
  return [];
}

function buildElev(coords, dist) {
  const has3d = coords.length && coords[0].length > 2;
  const pts = []; let acc = 0;
  for (let i = 0; i < coords.length; i++) {
    if (i > 0) acc += haversine(coords[i - 1], coords[i]);
    const e = has3d ? coords[i][2]
      : 240 + 40 * Math.sin(i / coords.length * Math.PI * 3) + 14 * Math.sin(i / 7);
    pts.push({ d: acc, e });
  }
  const step = Math.max(1, Math.floor(pts.length / 80));
  return pts.filter((_, i) => i % step === 0 || i === pts.length - 1);
}

function valhallaManeuverToTurn(m, coords) {
  // Valhalla types: 1=start, 2=start_right, 3=start_left, 4=destination, 
  // 5=straight, 6=slight_right, 7=right, 8=sharp_right, 9=uturn,
  // 10=sharp_left, 11=left, 12=slight_left
  const typeMap = {
    1: "start", 2: "start", 3: "start", 4: "arrive",
    5: "straight", 6: "right", 7: "right", 8: "right",
    9: "right", 10: "left", 11: "left", 12: "left",
  };
  const type = typeMap[m.type] || (m.type <= 4 ? "start" : m.type >= 10 ? "left" : "right");
  
  // Get coordinate at begin_shape_index
  const at = coords[m.begin_shape_index] || coords[0];
  
  // Street name from Valhalla
  let road = m.street_names ? m.street_names[0] : "";
  if (!road && m.instruction) {
    // Extract road name from instruction if available
    const match = m.instruction.match(/onto\s+(.+?)$/i);
    if (match) road = match[1];
  }
  if (!road) road = "Continue";
  
  // Distance in meters (Valhalla returns km in summary, but length per maneuver)
  const dist = (m.length || 0) * 1000;
  
  return { type, road, dist, at };
}

// ---- config -------------------------------------------------
export const TILES = {
  dark:  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  attribution: "© OpenStreetMap · © CARTO",
  trailsOverlay: "https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png",
  trailsAttribution: "© waymarkedtrails.org, OpenStreetMap",
};

export const HOME = { lng: -94.5786, lat: 39.0997, zoom: 12 };

// ---- geocoding (Worker proxy) -----------------------------
export async function geocode(q) {
  if (!q || !q.trim()) return [];
  try {
    const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
    const data = await r.json();
    if (!Array.isArray(data)) return [];
    return data.map((d) => ({
      label: d.label,
      short: d.short,
      kind: d.kind || "place",
      lng: d.lng,
      lat: d.lat,
    }));
  } catch (e) { console.warn("geocode failed", e); return []; }
}

export async function reverse(lng, lat) {
  try {
    const r = await fetch(`/api/reverse?lat=${lat}&lng=${lng}`);
    const data = await r.json();
    return data.label || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch { return `${lat.toFixed(4)}, ${lng.toFixed(4)}`; }
}

// ---- routing (Worker proxy → Valhalla) --------------------
export async function route(points, pref) {
  if (!Array.isArray(points)) return route([points, pref], arguments[2]);
  const pts = points.filter(p => p && isFinite(p.lng) && isFinite(p.lat));
  if (pts.length < 2) return null;
  
  try {
    const r = await fetch("/api/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locations: pts.map(p => ({ lat: p.lat, lon: p.lng })),
        costing: "bicycle",
        costing_options: {
          bicycle: {
            bicycle_type: "Hybrid",
            use_roads: pref === "quiet" ? 0.1 : pref === "fast" ? 0.8 : 0.5,
            use_hills: pref === "fast" ? 0.0 : 0.5,
          }
        }
      })
    });
    if (!r.ok) throw new Error("worker " + r.status);
    const routeSource = r.headers.get("x-route-source") || "estimate";
    const data = await r.json();
    const trip = data.trip;
    if (!trip || !trip.legs || !trip.legs.length) throw new Error("no route");

    // Valhalla now returns GeoJSON shapes thanks to worker update
    // Flatten all legs into one continuous coordinate array
    let coords = [];
    let allTurns = [];
    let totalDist = 0;
    let totalTime = 0;
    let totalAscend = 0;

    trip.legs.forEach((leg, legIdx) => {
      // Get coordinates from shape (decoded from polyline if needed)
      const legCoords = getShape(leg);
      
      // Append to total coords (avoid duplicating last point of prev leg)
      if (legIdx === 0) {
        coords = legCoords.map(c => Array.isArray(c) ? c : [c.lon, c.lat]);
      } else {
        // Skip first point if same as last of previous leg
        const prev = coords[coords.length - 1];
        const first = legCoords[0];
        const firstArr = Array.isArray(first) ? first : [first.lon, first.lat];
        if (prev && firstArr && Math.abs(prev[0] - firstArr[0]) < 0.00001 && Math.abs(prev[1] - firstArr[1]) < 0.00001) {
          coords.push(...legCoords.slice(1).map(c => Array.isArray(c) ? c : [c.lon, c.lat]));
        } else {
          coords.push(...legCoords.map(c => Array.isArray(c) ? c : [c.lon, c.lat]));
        }
      }

      // Parse maneuvers into turns with REAL street names
      if (leg.maneuvers) {
        leg.maneuvers.forEach((m, i) => {
          // Skip the very first start maneuver after leg 0 (we keep leg 0's start)
          if (legIdx > 0 && i === 0 && m.type === 1) return;
          allTurns.push(valhallaManeuverToTurn(m, coords));
        });
      }

      totalDist += (leg.summary?.length || 0) * 1000; // km → m
      totalTime += leg.summary?.time || 0;
    });

    // Sanity check: flag extremely long routes but still return them
    if (totalDist > 3000000) {
      console.debug("Route exceeds 3000km — unusually long");
    }

    if (coords.length < 2) throw new Error("no coordinates in route");

    return {
      coords,
      dist: totalDist,
      time: totalTime,
      ascend: trip.summary?.has_high_scenery ? Math.round(totalDist * 0.02) : Math.round(totalDist * 0.008),
      elev: buildElev(coords, totalDist),
      turns: allTurns,
      surface: { paved: 82, gravel: 18, est: true }, // Valhalla doesn't easily give surface breakdown
      source: routeSource,
      profile: pref,
      waypoints: pts.length,
    };
  } catch (e) {
    console.warn("Valhalla routing failed:", e.message);
    // Return null instead of a fake straight line — let the UI show "No route found"
    return null;
  }
}

// ---- point at fraction along route ------------------------
export function pointAtFrac(coords, frac) {
  if (!coords || coords.length < 2) return null;
  const total = pathLen(coords);
  const target = Math.max(0, Math.min(1, frac)) * total;
  let acc = 0;
  for (let i = 1; i < coords.length; i++) {
    const seg = haversine(coords[i - 1], coords[i]);
    if (acc + seg >= target) {
      const t = seg ? (target - acc) / seg : 0;
      return [coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * t,
              coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * t];
    }
    acc += seg;
  }
  return coords[coords.length - 1];
}

// ---- formatting -------------------------------------------
export const fmtKm = (m) => (m / 1000).toFixed(m < 10000 ? 1 : 0);
export const fmtTime = (s) => {
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
};

// ---- auth helpers -------------------------------------------
export function authHeaders() {
  const token = localStorage.getItem("br-session");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function requestCode(email) {
  const r = await fetch("/api/auth/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
  if (!r.ok) throw new Error("request failed " + r.status);
  return r.json();
}

export async function verifyCode(email, code) {
  const r = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) });
  if (!r.ok) throw new Error("invalid code " + r.status);
  const data = await r.json();
  if (data.session_token) localStorage.setItem("br-session", data.session_token);
  return data;
}

export async function fetchMe() {
  const r = await fetch("/api/auth/me", { headers: authHeaders() });
  if (!r.ok) return null;
  const data = await r.json();
  return data.user || null;
}

// ---- community API ------------------------------------------
export async function fetchPosts(params = {}) {
  const qs = new URLSearchParams();
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  if (params.category) qs.set("category", params.category);
  if (params.userId) qs.set("userId", params.userId);
  if (params.q) qs.set("q", params.q);
  const r = await fetch(`/api/community/posts?${qs.toString()}`);
  if (!r.ok) throw new Error("posts " + r.status);
  return r.json();
}

export async function fetchPost(id) {
  const r = await fetch(`/api/community/posts/${id}`);
  if (!r.ok) throw new Error("post " + r.status);
  return r.json();
}

export async function createPost(body) {
  const r = await fetch("/api/community/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("create " + r.status);
  return r.json();
}

export async function uploadMedia(file) {
  const form = new FormData();
  form.append("file", file);
  const r = await fetch("/api/community/media", { method: "POST", headers: authHeaders(), body: form });
  if (!r.ok) throw new Error("upload " + r.status);
  return r.json();
}

export async function likePost(id, like = true) {
  const r = await fetch(`/api/community/posts/${id}/${like ? "like" : "unlike"}`, { method: "POST", headers: authHeaders() });
  if (!r.ok) throw new Error("like " + r.status);
  return r.json();
}

export async function commentPost(id, body) {
  const r = await fetch(`/api/community/posts/${id}/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ body }),
  });
  if (!r.ok) throw new Error("comment " + r.status);
  return r.json();
}

export async function deletePost(id) {
  const r = await fetch(`/api/community/posts/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!r.ok) throw new Error("delete " + r.status);
  return r.json();
}

// ---- curated feature submissions -----------------------------------------
export async function submitFeature(body) {
  const r = await fetch("/api/curated-features/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("submit feature " + r.status);
  return r.json();
}

export async function fetchSubmissions(status) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const r = await fetch(`/api/curated-features/submissions${qs}`, { headers: authHeaders() });
  if (!r.ok) throw new Error("submissions " + r.status);
  return r.json();
}

export async function reviewSubmission(id, action, adminNote) {
  const r = await fetch(`/api/curated-features/submissions/${id}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ admin_note: adminNote }),
  });
  if (!r.ok) throw new Error("review " + r.status);
  return r.json();
}

export async function fetchSubmission(id) {
  const r = await fetch(`/api/curated-features/submissions/${id}`, { headers: authHeaders() });
  if (!r.ok) throw new Error("submission " + r.status);
  return r.json();
}
