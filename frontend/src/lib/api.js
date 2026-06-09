const API_CONFIG = {
  WORKER_SEARCH: "/api/search",
  WORKER_ROUTE: "/api/route",
  GEOCODE: "/api/geocode",
  BROUTER: "https://brouter.de/brouter",
  TILES: {
    dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    light: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '© OpenStreetMap · © CARTO',
  },
  HOME: { lng: -94.5786, lat: 39.0997, zoom: 12 }
};

const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;

export function haversine(a, b) {
  const dLat = rad(b[1] - a[1]), dLng = rad(b[0] - a[0]);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export async function getRoute(a, b, pref = "balanced") {
  try {
    const res = await fetch(API_CONFIG.WORKER_ROUTE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locations: [{ lat: a.lat, lon: a.lng }, { lat: b.lat, lon: b.lng }],
        costing: "bicycle"
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const f = data.features[0];
        const coords = f.geometry.coordinates;
        return {
          coords,
          dist: f.properties.summary?.length * 1000 || 0,
          time: f.properties.summary?.time || 0,
          ascend: f.properties.summary?.ascent || 0,
          elev: data.elevation || buildElev(coords),
          turns: f.properties.maneuvers || [],
          surface: f.properties.surface || { paved: 80, gravel: 20 },
          source: "worker"
        };
      }
    }
  } catch (e) { console.warn("Worker route failed."); }

  try {
    const profile = pref === "fast" ? "fastbike" : pref === "quiet" ? "safety" : "trekking";
    const url = `${API_CONFIG.BROUTER}?lonlats=${a.lng},${a.lat}|${b.lng},${b.lat}&profile=${profile}&alternativeidx=0&format=geojson`;
    const r = await fetch(url);
    if (r.ok) {
      const gj = await r.json();
      const f = gj.features[0];
      const p = f.properties || {};
      const coords = f.geometry.coordinates;
      return {
        coords,
        dist: parseFloat(p["track-length"]) || 0,
        time: parseFloat(p["total-time"]) || 0,
        ascend: parseFloat(p["filtered ascend"] ?? p["plain-ascend"]) || 0,
        elev: buildElev(coords),
        turns: [],
        surface: { paved: 70, gravel: 30 },
        source: "brouter"
      };
    }
  } catch (e) { console.warn("BRouter failed."); }

  return estimate(a, b);
}

export async function searchLocations(q) {
  if (!q || !q.trim()) return [];
  try {
    const url = `${API_CONFIG.GEOCODE}?q=${encodeURIComponent(q)}`;
    const r = await fetch(url, { headers: { "Accept": "application/json" } });
    const data = await r.json();
    if (!data.results) return [];
    return data.results.map((d) => ({
      label: d.description,
      short: d.name,
      kind: "place",
      lng: d.coords[0],
      lat: d.coords[1],
    }));
  } catch (e) { return []; }
}

function buildElev(coords) {
  let acc = 0;
  return coords.map((c, i) => {
    if (i > 0) acc += haversine(coords[i-1], coords[i]);
    return { d: acc, e: c[2] || 240 };
  });
}

function estimate(a, b) {
  const A = [a.lng, a.lat], B = [b.lng, b.lat];
  const coords = []; const N = 20;
  for (let i = 0; i <= N; i++) coords.push([A[0] + (B[0] - A[0]) * i / N, A[1] + (B[1] - A[1]) * i / N]);
  const dist = haversine(A, B) * 1.3;
  return {
    coords, dist, time: dist / 4.2, ascend: Math.round(dist / 100),
    elev: buildElev(coords), source: "estimated", turns: []
  };
}

export const API = API_CONFIG;
