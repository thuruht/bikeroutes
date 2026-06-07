import React, { useRef, useState } from 'react';

export default function Elevation({ route, onScrub }) {
  const ref = useRef(null);
  const [tip, setTip] = useState(null);
  if (!route || !route.elev || route.elev.length === 0) return null;

  const data = route.elev;
  const w = 340, h = 88, pad = 2;
  const elevations = data.map(pt => pt.e);
  const lo = Math.min(...elevations), hi = Math.max(...elevations);
  const span = hi - lo || 1;
  const x = (i) => pad + (i / (data.length - 1)) * (w - pad * 2);
  const y = (v) => (h - 6) - ((v - lo) / span) * (h - 16);

  let line = `M ${x(0)} ${y(data[0].e)}`;
  data.forEach((pt, i) => { if (i) line += ` L ${x(i).toFixed(1)} ${y(pt.e).toFixed(1)}`; });
  const area = `${line} L ${x(data.length - 1)} ${h} L ${x(0)} ${h} Z`;

  function move(e) {
    const r = ref.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const idx = Math.round(frac * (data.length - 1));
    if (data[idx]) {
      setTip({ left: (frac * 100), v: Math.round(data[idx].e), km: (data[idx].d / 1000).toFixed(1) });
      onScrub && onScrub(data[idx]);
    }
  }
  function leave() { setTip(null); onScrub && onScrub(null); }

  return (
    <div className="elev">
      <div className="elev-head">
        <span className="t">Elevation</span>
        <span className="r mono"><b>+{Math.round(route.ascend)} m</b> climb · {Math.round(lo)}–{Math.round(hi)} m</span>
      </div>
      <div className="elev-chart" ref={ref} onMouseMove={move} onMouseLeave={leave}>
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="elevg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--orange)" stopOpacity="0.30" />
              <stop offset="100%" stopColor="var(--orange)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0.33, 0.66].map((g, i) => <line key={i} x1="0" x2={w} y1={h * g} y2={h * g} stroke="var(--line)" strokeWidth="1" />)}
          <path d={area} fill="url(#elevg)" />
          <path d={line} fill="none" stroke="var(--orange)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          {tip && <line x1={`${tip.left}%`} x2={`${tip.left}%`} y1="0" y2={h} stroke="var(--ink)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />}
        </svg>
        <div className={"elev-tip mono " + (tip ? "show" : "")} style={{ left: (tip ? tip.left : 0) + "%" }}>
          {tip && `${tip.v} m · ${tip.km} km`}
        </div>
      </div>
    </div>
  );
}
