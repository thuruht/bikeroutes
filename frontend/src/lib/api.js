const API_CONFIG = {
  WORKER_SEARCH: "/api/search", WORKER_ROUTE: "/api/route", NOMINATIM: "https://nominatim.openstreetmap.org/search", BROUTER: "https://brouter.de/brouter",
  TILES: { dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", light: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", attribution: '© OpenStreetMap · CARTO' },
  HOME: { lng: -94.5786, lat: 39.0997, zoom: 12 }
};
const rad = (d) => (d * Math.PI) / 180; const R = 6371000;
export function haversine(a, b) {
  const p1 = Array.isArray(a) ? [a[1], a[0]] : [a.lat, a.lng]; const p2 = Array.isArray(b) ? [b[1], b[0]] : [b.lat, b.lng];
  const dLat = rad(p2[0] - p1[0]), dLng = rad(p2[1] - p1[1]); const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(p1[0])) * Math.cos(rad(p2[0])) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(s));
}
export async function getRoute(a, b) {
  try {
    const res = await fetch(API_CONFIG.WORKER_ROUTE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locations: [{ lat: a.lat, lon: a.lng }, { lat: b.lat, lon: b.lng }], costing: "bicycle" }) });
    if (res.ok) { const data = await res.json(); if (data.features) { const f = data.features[0]; return { coords: f.geometry.coordinates, dist: f.properties.summary.length * 1000, time: f.properties.summary.time, ascend: f.properties.summary.ascent, elev: buildElev(f.geometry.coordinates), turns: f.properties.maneuvers || [], surface: f.properties.surface || { paved: 80, gravel: 20 }, source: "worker" }; } }
  } catch(e) {}
  try {
    const url = `${API_CONFIG.BROUTER}?lonlats=${a.lng},${a.lat}|${b.lng},${b.lat}&profile=trekking&alternativeidx=0&format=geojson`;
    const r = await fetch(url); const gj = await r.json(); const f = gj.features[0]; const p = f.properties || {}; const coords = f.geometry.coordinates; return { coords, dist: parseFloat(p["track-length"]) || 0, time: parseFloat(p["total-time"]) || 0, ascend: parseFloat(p["filtered ascend"] ?? p["plain-ascend"]) || 0, elev: buildElev(coords), turns: [], surface: { paved: 70, gravel: 30 }, source: "brouter" };
  } catch(e) { return estimate(a, b); }
}
export async function searchLocations(q) {
  try { const r = await fetch(`${API_CONFIG.WORKER_SEARCH}?q=${encodeURIComponent(q)}`); if (r.ok) { const data = await r.json(); if (data.length) return data; } } catch(e) {}
  const url = `${API_CONFIG.NOMINATIM}?format=jsonv2&limit=6&addressdetails=1&q=${encodeURIComponent(q)}`;
  try { const r = await fetch(url); const j = await r.json(); return j.map(d => ({ label: d.display_name, short: d.name || d.display_name.split(',')[0], lng: parseFloat(d.lon), lat: parseFloat(d.lat) })); } catch(e) { return []; }
}
function buildElev(coords) { let acc = 0; return coords.map((c, i) => { if (i > 0) acc += haversine(coords[i-1], coords[i]); return { d: acc, e: c[2] || 240 }; }); }
function estimate(a, b) { const A = [a.lng, a.lat], B = [b.lng, b.lat]; const coords = []; const N = 20; for (let i = 0; i <= N; i++) coords.push([A[0] + (B[0] - A[0]) * i / N, A[1] + (B[1] - A[1]) * i / N]); const dist = haversine(A, B) * 1.3; return { coords, dist, time: dist / 4.2, ascend: Math.round(dist / 100), elev: buildElev(coords), source: "estimated", turns: [], surface: { paved: 50, gravel: 50 } }; }
export const API = API_CONFIG;
