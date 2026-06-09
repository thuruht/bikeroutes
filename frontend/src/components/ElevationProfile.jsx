import { useState, useRef } from 'react';

export default function ElevationProfile({ data, onHover }) {
  const ref = useRef(null);
  const [tip, setTip] = useState(null);
  
  if (!data || data.length < 2) return null;

  // Convert legacy [{distance, elevation}] to [{d, e}]
  // Ensure distance is parsed to float and treated as meters for logic, though it might be in km
  // the data from MapView provides distance in km string.
  const elev = data.map(pt => ({
    d: parseFloat(pt.distance) * 1000, 
    e: pt.elevation
  }));
  
  const W = 340, H = 88;
  const maxD = elev[elev.length - 1].d || 1;
  const es = elev.map(p => p.e);
  const lo = Math.min(...es), hi = Math.max(...es), span = Math.max(1, hi - lo);
  
  const x = (d) => (d / maxD) * W;
  const y = (e) => H - ((e - lo) / span) * (H - 12) - 4;
  
  let line = `M ${x(elev[0].d)} ${y(elev[0].e)}`;
  let area = `M ${x(elev[0].d)} ${H} L ${x(elev[0].d)} ${y(elev[0].e)}`;
  elev.forEach(p => { line += ` L ${x(p.d)} ${y(p.e)}`; area += ` L ${x(p.d)} ${y(p.e)}`; });
  area += ` L ${x(maxD)} ${H} Z`;

  const move = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const dAt = frac * maxD;
    let near = elev[0];
    for (const p of elev) if (Math.abs(p.d - dAt) < Math.abs(near.d - dAt)) near = p;
    setTip({ left: frac * 100, e: Math.round(near.e), km: (near.d / 1000).toFixed(1) });
    if (onHover) onHover(frac);
  };
  
  const leave = () => { setTip(null); if (onHover) onHover(null); };

  return (
    <div className="elev" style={{ marginTop: 16 }}>
      <div className="elev-head" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="t" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--muted-txt)' }}>Elevation</span>
        <span className="r mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}><b>{Math.round(lo)}–{Math.round(hi)} m</b></span>
      </div>
      <div className="elev-chart" ref={ref} onMouseMove={move} onMouseLeave={leave} style={{ position: 'relative', height: 88, cursor: 'crosshair' }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id="elevg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--orange)" stopOpacity="0.30" />
              <stop offset="100%" stopColor="var(--orange)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0.33, 0.66].map((g, i) => <line key={i} x1="0" x2={W} y1={H * g} y2={H * g} stroke="var(--line)" strokeWidth="1" />)}
          <path d={area} fill="url(#elevg)" />
          <path d={line} fill="none" stroke="var(--orange)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {tip && <line x1={(tip.left / 100) * W} x2={(tip.left / 100) * W} y1="0" y2={H} stroke="var(--ink)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" vectorEffect="non-scaling-stroke" />}
        </svg>
        <div className={`elev-tip mono ${tip ? "show" : ""}`} style={{ 
          left: (tip ? tip.left : 0) + "%", 
          position: 'absolute', transform: 'translate(-50%, -100%)', top: 0,
          background: 'var(--ink)', color: 'var(--paper)', fontSize: 11, padding: '4px 7px',
          borderRadius: 6, whiteSpace: 'nowrap', pointerEvents: 'none', opacity: tip ? 1 : 0, transition: 'opacity .12s'
        }}>
          {tip && `${tip.e} m · ${tip.km} km`}
        </div>
      </div>
    </div>
  );
}
