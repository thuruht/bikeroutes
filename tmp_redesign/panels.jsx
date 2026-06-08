/* ============================================================
   panels.jsx — icons, planner, elevation, turns, explore
   ============================================================ */

const I = {
  bike: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="17" r="3.4"/><circle cx="18" cy="17" r="3.4"/><path d="M6 17l3.5-7h5l-3 7M9.5 10l2-3.5h3"/><circle cx="14.5" cy="6.5" r="0.6" fill="currentColor"/></svg>,
  swap: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4v16M7 4l-3 3M7 4l3 3M17 20V4M17 20l3-3M17 20l-3-3"/></svg>,
  sun: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>,
  moon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>,
  save: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,
  share: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>,
  gpx: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M12 15l-4-4M12 15l4-4M5 19h14"/></svg>,
  // turn icons
  start: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/></svg>,
  right: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 20V10a3 3 0 0 1 3-3h6"/><path d="M15 4l4 3-4 3"/></svg>,
  left: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 20V10a3 3 0 0 0-3-3H6"/><path d="M9 4L5 7l4 3"/></svg>,
  slight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 20v-7a4 4 0 0 1 1.6-3.2L15 6"/><path d="M11 5l4 1 1 4"/></svg>,
  climb: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 18l7-9 4 5 5-7"/><path d="M20 7v4M20 7h-4"/></svg>,
  end: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 21V4M6 4h11l-2 4 2 4H6"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/></svg>,
};

// ---------- Elevation chart ----------
function Elevation({ route, onScrub }) {
  const ref = React.useRef(null);
  const [tip, setTip] = React.useState(null);
  const data = route.elev;
  const w = 340, h = 88, pad = 2;
  const lo = Math.min(...data), hi = Math.max(...data);
  const span = hi - lo || 1;
  const x = (i) => pad + (i / (data.length - 1)) * (w - pad * 2);
  const y = (v) => (h - 6) - ((v - lo) / span) * (h - 16);
  let line = `M ${x(0)} ${y(data[0])}`;
  data.forEach((v, i) => { if (i) line += ` L ${x(i).toFixed(1)} ${y(v).toFixed(1)}`; });
  const area = `${line} L ${x(data.length - 1)} ${h} L ${x(0)} ${h} Z`;

  function move(e) {
    const r = ref.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const idx = Math.round(frac * (data.length - 1));
    setTip({ left: (frac * 100), v: Math.round(data[idx]), km: (frac * parseFloat(route.stats.dist)).toFixed(1) });
    onScrub && onScrub(frac);
  }
  function leave() { setTip(null); onScrub && onScrub(null); }

  return (
    <div className="elev">
      <div className="elev-head">
        <span className="t">Elevation</span>
        <span className="r mono"><b>+{route.stats.climb} m</b> climb · {route.stats.low}–{route.stats.high} m</span>
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

// ---------- Route summary ----------
function Summary({ route }) {
  const s = route.stats;
  const diffTxt = ["", "Easy", "Moderate", "Hard"][s.difficulty];
  return (
    <div className="summary">
      <div className="summary-top">
        <div className="dist mono">{s.dist}<span>{s.unit}</span></div>
        <div className="time">· <b>{s.time}</b> riding</div>
      </div>
      <div className="stat-grid">
        <div className="stat">
          <div className="k">Climb</div>
          <div className="v mono">+{s.climb}<small> m</small></div>
        </div>
        <div className="stat">
          <div className="k">Avg grade</div>
          <div className="v mono">{(s.climb / (parseFloat(s.dist) * 10)).toFixed(1)}<small> %</small></div>
        </div>
      </div>
      <div className="diffbar">
        <div className="dots">
          {[1, 2, 3].map(n => <i key={n} className={n <= s.difficulty ? "on" : ""} />)}
        </div>
        <span className="txt">{diffTxt} · rolling terrain</span>
      </div>
      <div className="surface">
        <div className="bar">
          <div className="paved" style={{ width: s.paved + "%" }} />
          <div className="gravel" style={{ width: s.gravel + "%" }} />
        </div>
        <div className="legend mono">
          <span><i className="pv" />{s.paved}% paved</span>
          <span><i className="gv" />{s.gravel}% gravel</span>
        </div>
      </div>
    </div>
  );
}

// ---------- Turn-by-turn ----------
function Turns({ route, onHover }) {
  const list = TURNS[route.key];
  return (
    <div className="turns">
      <div className="turns-head">Directions</div>
      {list.map((t, i) => (
        <div className="turn" key={i}
             onMouseEnter={() => onHover(pointAt(route.pts, t.frac))}
             onMouseLeave={() => onHover(null)}>
          <div className="ic">{I[t.type] || I.slight}</div>
          <div className="body">
            <div className="road">{t.road}</div>
            <div className="meta">{t.meta}</div>
          </div>
          <div className="d mono">{t.d}</div>
        </div>
      ))}
    </div>
  );
}

// ---------- tiny sparkline for trail cards ----------
function Spark({ seed }) {
  const data = React.useMemo(() => makeElevation(seed, 22, 0, 1), [seed]);
  const w = 64, h = 46;
  const lo = Math.min(...data), hi = Math.max(...data), span = hi - lo || 1;
  const x = (i) => (i / (data.length - 1)) * w;
  const y = (v) => h - 6 - ((v - lo) / span) * (h - 14);
  let d = `M ${x(0)} ${y(data[0])}`;
  data.forEach((v, i) => { if (i) d += ` L ${x(i).toFixed(1)} ${y(v).toFixed(1)}`; });
  return (
    <svg viewBox={`0 0 ${w} ${h}`}>
      <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill="var(--green)" opacity="0.12" />
      <path d={d} fill="none" stroke="var(--green)" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

Object.assign(window, { I, Elevation, Summary, Turns, Spark });
