/* ============================================================
   live-api.js — functional data layer (CDN / public APIs)
   ------------------------------------------------------------
   "Works right now" stand-ins. Every function is a SEAM:
   swap the fetch() target for your Cloudflare Worker later and
   the UI does not change. See // @SEAM markers.
   ============================================================ */
(function () {
  const BR = {};

  // ---- config -------------------------------------------------
  // @SEAM:tiles  Replace with your Worker-proxied / self-hosted tiles + custom_style.json
  BR.TILES = {
    dark:  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    light: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '© OpenStreetMap · © CARTO',
  };
  // @SEAM:geocode  Replace with Worker /api/geocode (proxy Nominatim or Photon, cache in KV)
  BR.GEOCODE_URL = "https://nominatim.openstreetmap.org/search";
  BR.REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
  // @SEAM:route  Replace with Worker /api/route (Valhalla bicycle, cache by SHA-256 of body in ROUTE_CACHE)
  BR.BROUTER_URL = "https://brouter.de/brouter";

  // pref -> BRouter profile (later: Valhalla bicycle costing options)
  BR.PROFILE = { balanced: "trekking", quiet: "safety", fast: "fastbike" };

  // Default region: Kansas City (brand is Midwest-first)
  BR.HOME = { lng: -94.5786, lat: 39.0997, zoom: 12 };

  // ---- helpers ------------------------------------------------
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
  BR.haversine = haversine;

  // ---- geocoding ---------------------------------------------
  BR.geocode = async function (q) {
    if (!q || !q.trim()) return [];
    const url = `${BR.GEOCODE_URL}?format=jsonv2&limit=6&addressdetails=1&q=${encodeURIComponent(q)}`;
    try {
      const r = await fetch(url, { headers: { "Accept": "application/json" } });
      const j = await r.json();
      return j.map((d) => ({
        label: d.display_name,
        short: d.name || d.display_name.split(",")[0],
        kind: d.type || d.category,
        lng: parseFloat(d.lon), lat: parseFloat(d.lat),
      }));
    } catch (e) { console.warn("geocode failed", e); return []; }
  };

  BR.reverse = async function (lng, lat) {
    try {
      const r = await fetch(`${BR.REVERSE_URL}?format=jsonv2&lon=${lng}&lat=${lat}`);
      const j = await r.json();
      return j.name || (j.display_name || "").split(",").slice(0, 2).join(", ") ||
        `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch { return `${lat.toFixed(4)}, ${lng.toFixed(4)}`; }
  };

  // ---- routing ------------------------------------------------
  // returns { coords:[[lng,lat],...], dist(m), time(s), ascend(m),
  //           elev:[{d,e}], turns:[{type,road,dist,at}], surface:{paved,gravel},
  //           source:"brouter"|"estimated" }
  BR.route = async function (a, b, pref) {
    const profile = BR.PROFILE[pref] || "trekking";
    try {
      const lonlats = `${a.lng.toFixed(6)},${a.lat.toFixed(6)}|${b.lng.toFixed(6)},${b.lat.toFixed(6)}`;
      const url = `${BR.BROUTER_URL}?lonlats=${lonlats}&profile=${profile}&alternativeidx=0&format=geojson`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("brouter " + r.status);
      const gj = await r.json();
      const f = gj.features[0];
      const coords = f.geometry.coordinates;
      const p = f.properties || {};
      const dist = parseFloat(p["track-length"]) || pathLen(coords);
      const time = parseFloat(p["total-time"]) || dist / 4.5; // ~16 km/h fallback
      const ascend = parseFloat(p["filtered ascend"] ?? p["plain-ascend"]) || 0;
      return {
        coords, dist, time, ascend,
        elev: buildElev(coords, dist),
        turns: deriveTurns(coords),
        surface: surfaceFromMessages(p.messages),
        source: "brouter", profile,
      };
    } catch (e) {
      console.warn("route fell back to estimate:", e.message);
      return estimate(a, b); // @SEAM fallback so the product never dead-ends
    }
  };

  function pathLen(coords) {
    let d = 0; for (let i = 1; i < coords.length; i++) d += haversine(coords[i - 1], coords[i]); return d;
  }

  // elevation profile from 3D coords if present, else gentle synthetic
  function buildElev(coords, dist) {
    const has3d = coords.length && coords[0].length > 2;
    const pts = []; let acc = 0;
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

  // turn list from significant bearing changes (always works, no API needed)
  function deriveTurns(coords) {
    if (coords.length < 2) return [];
    const turns = [{ type: "start", road: "Start", dist: 0, at: coords[0] }];
    let segStart = 0;
    for (let i = 2; i < coords.length; i++) {
      const b1 = bearing(coords[i - 2], coords[i - 1]);
      const b2 = bearing(coords[i - 1], coords[i]);
      let delta = ((b2 - b1 + 540) % 360) - 180;
      if (Math.abs(delta) > 38) {
        let d = 0; for (let k = segStart + 1; k <= i - 1; k++) d += haversine(coords[k - 1], coords[k]);
        turns.push({
          type: delta > 0 ? "right" : "left",
          road: "Continue", dist: d, at: coords[i - 1],
        });
        segStart = i - 1;
      }
    }
    let d = 0; for (let k = segStart + 1; k < coords.length; k++) d += haversine(coords[k - 1], coords[k]);
    turns.push({ type: "arrive", road: "Arrive at destination", dist: d, at: coords[coords.length - 1] });
    // merge tiny segments
    return turns.filter((t, i) => i === 0 || i === turns.length - 1 || t.dist > 60).slice(0, 12);
  }

  // surface split from BRouter WayTags messages if available, else estimate
  function surfaceFromMessages(messages) {
    if (!Array.isArray(messages) || messages.length < 2) return { paved: 82, gravel: 18, est: true };
    const head = messages[0]; const li = head.indexOf("WayTags"); const di = head.indexOf("Distance");
    if (li < 0) return { paved: 82, gravel: 18, est: true };
    let paved = 0, gravel = 0;
    for (let i = 1; i < messages.length; i++) {
      const tags = (messages[i][li] || ""); const dist = parseFloat(messages[i][di]) || 0;
      if (/surface=(gravel|dirt|ground|unpaved|sand|fine_gravel|compacted)/.test(tags)) gravel += dist;
      else paved += dist;
    }
    const tot = paved + gravel || 1;
    return { paved: Math.round(paved / tot * 100), gravel: Math.round(gravel / tot * 100), est: false };
  }

  // straight-line fallback
  function estimate(a, b) {
    const A = [a.lng, a.lat], B = [b.lng, b.lat];
    const coords = []; const N = 60;
    for (let i = 0; i <= N; i++) coords.push([A[0] + (B[0] - A[0]) * i / N, A[1] + (B[1] - A[1]) * i / N]);
    const dist = haversine(A, B) * 1.32; // detour factor
    return {
      coords, dist, time: dist / 4.2, ascend: Math.round(dist / 1000 * 8),
      elev: buildElev(coords, dist), turns: deriveTurns(coords),
      surface: { paved: 80, gravel: 20, est: true }, source: "estimated", profile: "—",
    };
  }

  // ---- formatting --------------------------------------------
  BR.fmtKm = (m) => (m / 1000).toFixed(m < 10000 ? 1 : 0);
  BR.fmtTime = (s) => {
    const m = Math.round(s / 60);
    return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  window.BR = BR;
})();
