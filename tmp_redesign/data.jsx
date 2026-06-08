/* ============================================================
   data.jsx — route geometry, elevation, trails, geo utils
   Exposes helpers + datasets on window for sibling scripts.
   ============================================================ */

// ---- seeded RNG (mulberry32) ----
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- catmull-rom -> smooth cubic bezier path through points ----
function smoothPath(pts) {
  if (pts.length < 2) return "";
  const p = pts;
  let d = `M ${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

// length + point-at-fraction along a polyline (linear segments good enough)
function polyMeta(pts) {
  let total = 0; const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    cum.push(total);
  }
  return { total, cum };
}
function pointAt(pts, frac) {
  const { total, cum } = polyMeta(pts);
  const target = Math.max(0, Math.min(1, frac)) * total;
  for (let i = 1; i < pts.length; i++) {
    if (cum[i] >= target) {
      const seg = cum[i] - cum[i - 1] || 1;
      const t = (target - cum[i - 1]) / seg;
      return [
        pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t,
        pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t,
      ];
    }
  }
  return pts[pts.length - 1];
}

// ---- elevation generator: smooth pseudo-terrain profile ----
function makeElevation(seed, n, base, amp) {
  const rnd = mulberry32(seed);
  const ctrl = [];
  const k = 7;
  for (let i = 0; i < k; i++) ctrl.push(rnd());
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * (k - 1);
    const i0 = Math.floor(x), t = x - i0;
    const a = ctrl[i0], b = ctrl[Math.min(i0 + 1, k - 1)];
    const tt = t * t * (3 - 2 * t); // smoothstep
    const v = a + (b - a) * tt;
    // add gentle ripple
    const ripple = Math.sin(i * 0.55 + seed) * 0.06;
    out.push(base + (v + ripple) * amp);
  }
  return out;
}

// ============================================================
// MAP CANVAS coordinate space: 1600 x 1000
// ============================================================

const ROUTES = {
  balanced: {
    key: "balanced",
    pts: [[262,772],[330,712],[404,668],[470,612],[548,586],[626,548],[704,520],
          [780,470],[858,452],[936,408],[1010,372],[1092,330],[1188,296],[1286,258]],
    stats: { dist: "14.2", unit: "km", time: "48 min", climb: "210", difficulty: 2,
             paved: 78, gravel: 22, low: 14, high: 96 },
    elevSeed: 12,
  },
  quiet: {
    key: "quiet",
    pts: [[262,772],[300,700],[352,648],[392,560],[470,512],[556,492],[604,420],
          [690,392],[760,360],[820,300],[904,286],[986,318],[1072,308],[1150,276],[1286,258]],
    stats: { dist: "16.8", unit: "km", time: "61 min", climb: "180", difficulty: 1,
             paved: 64, gravel: 36, low: 14, high: 88 },
    elevSeed: 5,
  },
  fast: {
    key: "fast",
    pts: [[262,772],[372,704],[480,640],[592,584],[700,524],[812,470],[922,416],
          [1030,360],[1140,314],[1286,258]],
    stats: { dist: "12.1", unit: "km", time: "39 min", climb: "260", difficulty: 3,
             paved: 92, gravel: 8, low: 14, high: 104 },
    elevSeed: 21,
  },
};

// attach derived elevation arrays
Object.values(ROUTES).forEach(r => {
  r.elev = makeElevation(r.elevSeed, 64, parseFloat(r.stats.low), parseFloat(r.stats.high) - parseFloat(r.stats.low));
});

// turn-by-turn (frac = position along route 0..1)
const TURNS = {
  balanced: [
    { type: "start",  road: "Cedar Mill Greenway",   meta: "Trailhead · Dock St",   d: "0.0 km",  frac: 0.00 },
    { type: "right",  road: "Riverside Path",         meta: "Cross the footbridge",  d: "1.8 km",  frac: 0.13 },
    { type: "left",   road: "Maple Avenue bike lane", meta: "Protected lane",        d: "4.1 km",  frac: 0.30 },
    { type: "slight", road: "Foothill Connector",     meta: "Gravel begins",         d: "7.6 km",  frac: 0.52 },
    { type: "climb",  road: "Overlook Climb",         meta: "+90 m over 2.2 km",     d: "9.9 km",  frac: 0.68 },
    { type: "right",  road: "Ridge Loop",             meta: "Paved descent",         d: "12.4 km", frac: 0.85 },
    { type: "end",    road: "Summit Vista Lookout",   meta: "Arrive · 96 m",         d: "14.2 km", frac: 1.00 },
  ],
  quiet: [
    { type: "start",  road: "Cedar Mill Greenway",   meta: "Trailhead · Dock St",   d: "0.0 km",  frac: 0.00 },
    { type: "left",   road: "Willow Creek Path",      meta: "Car-free greenway",     d: "2.4 km",  frac: 0.15 },
    { type: "slight", road: "Meadowbrook Trail",      meta: "Through the park",      d: "5.0 km",  frac: 0.33 },
    { type: "right",  road: "Quarry Gravel Track",    meta: "Gravel · low traffic",  d: "8.7 km",  frac: 0.52 },
    { type: "left",   road: "Birch Lane",             meta: "Quiet residential",     d: "12.1 km", frac: 0.72 },
    { type: "end",    road: "Summit Vista Lookout",   meta: "Arrive · 88 m",         d: "16.8 km", frac: 1.00 },
  ],
  fast: [
    { type: "start",  road: "Cedar Mill Greenway",   meta: "Trailhead · Dock St",   d: "0.0 km",  frac: 0.00 },
    { type: "slight", road: "Main Street corridor",   meta: "Shared lane",           d: "2.9 km",  frac: 0.24 },
    { type: "left",   road: "Highline Expressway path",meta: "Direct · paved",       d: "6.4 km",  frac: 0.52 },
    { type: "climb",  road: "Summit Approach",         meta: "+110 m over 1.9 km",   d: "9.8 km",  frac: 0.80 },
    { type: "end",    road: "Summit Vista Lookout",   meta: "Arrive · 104 m",        d: "12.1 km", frac: 1.00 },
  ],
};

// nearby trails for Explore mode
const TRAILS = [
  { id: "riverline", name: "Riverline Greenway", dist: "8.4 km", surface: "Paved", diff: "Easy",
    tags: [["Paved","g"],["Car-free",""]], seed: 3, near: "0.6 km away",
    pts: [[180,720],[300,700],[440,690],[600,700],[760,684],[920,700],[1080,690],[1240,700]] },
  { id: "quarry", name: "Quarry Ridge Loop", dist: "22.1 km", surface: "Gravel", diff: "Hard",
    tags: [["Gravel",""],["Climbing",""]], seed: 9, near: "1.2 km away",
    pts: [[300,560],[420,470],[560,440],[700,360],[860,330],[1000,260],[1140,300],[1240,380],[1140,500],[980,540],[800,560],[620,600],[460,620],[340,600],[300,560]] },
  { id: "harbor", name: "Harbor Loop", dist: "11.7 km", surface: "Mixed", diff: "Moderate",
    tags: [["Mixed",""],["Waterfront","g"]], seed: 15, near: "2.0 km away",
    pts: [[220,840],[360,820],[520,840],[680,800],[820,840],[700,900],[520,910],[360,900],[220,840]] },
  { id: "forest", name: "North Forest Singletrack", dist: "16.3 km", surface: "Trail", diff: "Hard",
    tags: [["Trail",""],["Shaded","g"]], seed: 27, near: "3.4 km away",
    pts: [[760,200],[860,260],[980,230],[1080,300],[1180,260],[1240,340],[1140,420],[1000,400],[900,460],[820,400],[760,320],[760,200]] },
  { id: "vineyard", name: "Vineyard Flats", dist: "27.9 km", surface: "Paved", diff: "Moderate",
    tags: [["Paved","g"],["Rolling",""]], seed: 33, near: "5.1 km away",
    pts: [[140,520],[300,500],[460,540],[640,500],[820,540],[1000,500],[1180,540],[1340,500]] },
];

Object.assign(window, {
  mulberry32, smoothPath, polyMeta, pointAt, makeElevation,
  ROUTES, TURNS, TRAILS,
});
