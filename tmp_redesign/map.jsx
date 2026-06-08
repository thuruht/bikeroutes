/* ============================================================
   map.jsx — procedural OSM-style paper map (1600 x 1000)
   ============================================================ */

// slice a polyline to points within a fraction range, with interpolated ends
function sliceByFrac(pts, f0, f1) {
  const { total, cum } = polyMeta(pts);
  const out = [pointAt(pts, f0)];
  for (let i = 0; i < pts.length; i++) {
    const f = cum[i] / total;
    if (f > f0 && f < f1) out.push(pts[i]);
  }
  out.push(pointAt(pts, f1));
  return out;
}

const GRAVEL = { balanced: [0.50, 0.72], quiet: [0.40, 0.66], fast: [0.0, 0.07] };

function MapCanvas({ theme, route, gravelOn, activeTrail, highlight, scrub, onMapPoint }) {
  const W = 1600, H = 1000;

  // ---- build static base once ----
  const base = React.useMemo(() => {
    const rnd = mulberry32(77);
    const roads = [];      // minor
    const arterials = [];  // major (white casing)

    // minor horizontal roads
    for (let y = 70; y < H; y += 86) {
      const jig = (rnd() - 0.5) * 26;
      const mid = H / 2 + (rnd() - 0.5) * 40;
      roads.push(`M -20 ${y} Q 800 ${y + jig} ${W + 20} ${y - jig * 0.4}`);
    }
    // minor vertical roads
    for (let x = 60; x < W; x += 112) {
      const jig = (rnd() - 0.5) * 30;
      roads.push(`M ${x} -20 Q ${x + jig} 500 ${x - jig * 0.5} ${H + 20}`);
    }
    // a few diagonals for texture
    for (let i = 0; i < 4; i++) {
      const x0 = rnd() * W;
      roads.push(`M ${x0} -20 L ${x0 + 260 + rnd() * 200} ${H + 20}`);
    }
    // arterials (thick)
    arterials.push("M -20 612 Q 760 600 1620 560");
    arterials.push("M 470 -20 Q 520 520 600 1020");
    arterials.push("M -20 870 Q 820 900 1620 840");
    arterials.push("M -20 200 Q 700 150 1620 250");

    // buildings (lower-left urban texture)
    const builds = [];
    for (let i = 0; i < 64; i++) {
      const bx = rnd() * 760, by = 520 + rnd() * 440;
      // keep out of water-ish lower strip sometimes
      builds.push({ x: bx, y: by, w: 14 + rnd() * 30, h: 12 + rnd() * 26, r: rnd() * 14 });
    }

    // contours around the summit hill (1286,258)
    const contours = [];
    const cx = 1300, cy = 250;
    for (let r = 1; r <= 6; r++) {
      const rr = r * 52;
      const pts = [];
      const segs = 26;
      for (let s = 0; s <= segs; s++) {
        const ang = (s / segs) * Math.PI * 2;
        const wob = 1 + Math.sin(ang * 3 + r) * 0.12 + (rnd() - 0.5) * 0.05;
        pts.push([cx + Math.cos(ang) * rr * 1.15 * wob, cy + Math.sin(ang) * rr * 0.8 * wob]);
      }
      contours.push(smoothPath(pts));
    }

    return { roads, arterials, builds, contours };
  }, []);

  const C = {
    paper: "var(--m-paper)", road: "var(--m-road)", art: "var(--m-road-art)",
    artEdge: "var(--m-road-art-edge)", water: "var(--m-water)", waterEdge: "var(--m-water-edge)",
    park: "var(--m-park)", parkEdge: "var(--m-park-edge)", contour: "var(--m-contour)",
    build: "var(--m-build)", label: "var(--m-label)",
  };

  const dRoute = route ? smoothPath(route.pts) : null;
  const gr = route ? (GRAVEL[route.key] || [0, 0]) : [0, 0];
  const dGravel = route && gravelOn ? smoothPath(sliceByFrac(route.pts, gr[0], gr[1])) : null;
  const A = route ? route.pts[0] : null;
  const B = route ? route.pts[route.pts.length - 1] : null;

  return (
    <svg className="map-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice"
         onMouseMove={(e) => {
           if (!onMapPoint) return;
           const r = e.currentTarget.getBoundingClientRect();
           // approximate inverse of slice mapping
           const scale = Math.max(r.width / W, r.height / H);
           const offx = (r.width - W * scale) / 2, offy = (r.height - H * scale) / 2;
           onMapPoint([(e.clientX - r.left - offx) / scale, (e.clientY - r.top - offy) / scale]);
         }}>
      <rect x="0" y="0" width={W} height={H} fill={C.paper} />

      {/* contours (terrain hint) */}
      <g fill="none" stroke={C.contour} strokeWidth="1.4">
        {base.contours.map((d, i) => <path key={i} d={d} />)}
      </g>

      {/* park / green space */}
      <path d="M 60 120 Q 360 60 600 140 Q 700 320 540 440 Q 300 520 140 420 Q 40 280 60 120 Z"
            fill={C.park} stroke={C.parkEdge} strokeWidth="2" />
      <path d="M 980 600 Q 1240 560 1460 660 Q 1500 820 1300 880 Q 1080 900 980 760 Q 940 660 980 600 Z"
            fill={C.park} stroke={C.parkEdge} strokeWidth="2" />

      {/* water: river + lake */}
      <path d="M -40 980 Q 260 880 420 760 Q 560 660 760 640 Q 1000 620 1180 520 Q 1360 430 1640 460"
            fill="none" stroke={C.water} strokeWidth="34" strokeLinecap="round" />
      <path d="M -40 980 Q 260 880 420 760 Q 560 660 760 640 Q 1000 620 1180 520 Q 1360 430 1640 460"
            fill="none" stroke={C.waterEdge} strokeWidth="36" strokeLinecap="round" opacity="0.5" style={{ mixBlendMode: "multiply" }} />
      <ellipse cx="250" cy="900" rx="150" ry="78" fill={C.water} stroke={C.waterEdge} strokeWidth="2" />

      {/* buildings */}
      <g fill={C.build}>
        {base.builds.map((b, i) => <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={Math.min(3, b.r)} />)}
      </g>

      {/* minor roads */}
      <g fill="none" stroke={C.road} strokeWidth="3" strokeLinecap="round">
        {base.roads.map((d, i) => <path key={i} d={d} />)}
      </g>
      {/* arterials: edge then fill */}
      <g fill="none" strokeLinecap="round">
        {base.arterials.map((d, i) => <path key={"e" + i} d={d} stroke={C.artEdge} strokeWidth="11" />)}
        {base.arterials.map((d, i) => <path key={"f" + i} d={d} stroke={C.art} strokeWidth="7.5" />)}
      </g>

      {/* ---- Explore: active trail overlay ---- */}
      {activeTrail && (
        <path d={smoothPath(activeTrail.pts)} fill="none" stroke="var(--route-alt)"
              strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.95"
              strokeDasharray="2 9" />
      )}

      {/* ---- Route ---- */}
      {route && (
        <g>
          <path d={dRoute} fill="none" stroke="var(--route-edge)" strokeWidth="13"
                strokeLinecap="round" strokeLinejoin="round" />
          <path className="route-line" d={dRoute} fill="none" stroke="var(--route)" strokeWidth="7"
                strokeLinecap="round" strokeLinejoin="round" />
          {dGravel && (
            <path d={dGravel} fill="none" stroke="var(--route-edge)" strokeWidth="7"
                  strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 8" opacity="0.85" />
          )}

          {/* highlight (turn hover) */}
          {highlight && (
            <g className="scrub-dot">
              <circle cx={highlight[0]} cy={highlight[1]} r="18" fill="var(--route)" opacity="0.16" />
              <circle cx={highlight[0]} cy={highlight[1]} r="8" fill="var(--route)" stroke="#fff" strokeWidth="2.5" />
            </g>
          )}
          {/* scrub dot (elevation hover) */}
          {scrub && (
            <g className="scrub-dot">
              <circle cx={scrub[0]} cy={scrub[1]} r="7.5" fill="var(--ink)" stroke="#fff" strokeWidth="2.5" />
            </g>
          )}

          {/* A marker */}
          <g>
            <circle cx={A[0]} cy={A[1]} r="11" fill="#fff" stroke="var(--route-alt)" strokeWidth="4.5" />
          </g>
          {/* B marker (destination pin) */}
          <g transform={`translate(${B[0]} ${B[1]})`}>
            <path d="M 0 4 C -13 -8 -13 -26 0 -26 C 13 -26 13 -8 0 4 Z" fill="var(--route)" stroke="#fff" strokeWidth="2.5" transform="translate(0 -2)" />
            <circle cx="0" cy="-15" r="4.5" fill="#fff" />
          </g>
        </g>
      )}
    </svg>
  );
}

window.MapCanvas = MapCanvas;
