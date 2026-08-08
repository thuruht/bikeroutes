import { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import * as BR from './api';
import './tokens.css';
import './styles.css';
import MapView from './components/MapView';
import DonatePanel from './components/DonatePanel';

import CommunityView from './components/CommunityView';

/* ---- icons ---- */
const Ic = {
  bike: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="17" r="3.2"/><circle cx="18" cy="17" r="3.2"/><path d="M6 17l4-8h6l-3 8M10 9l-1.5-3H6"/><circle cx="14.5" cy="6" r="1"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/></svg>,
  swap: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4v13M7 4L4 7M7 4l3 3M17 20V7M17 20l3-3M17 20l-3-3"/></svg>,
  sun: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>,
  moon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z"/></svg>,
  lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>,
  save: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h10l4 4v14l-7-3-7 3V5a2 2 0 0 1 2-2z"/></svg>,
  share: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="6" r="2.6"/><circle cx="18" cy="18" r="2.6"/><path d="M8.3 10.8l7.4-3.6M8.3 13.2l7.4 3.6"/></svg>,
  gpx: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M12 15l-4-4M12 15l4-4M5 20h14"/></svg>,
  left: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 6l-6 6 6 6"/></svg>,
  right: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 6l6 6-6 6"/></svg>,
  flag: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V4M5 4h12l-2 4 2 4H5"/></svg>,
  dot: <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  info: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h0"/></svg>,
  layers: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
};
const turnIcon = (t) => t === "left" ? Ic.left : t === "right" ? Ic.right : t === "arrive" ? Ic.flag : Ic.dot;

/* ---- Explore view ---- */
function ExploreView({ mapObj, query, setQuery, results, setResults, busy, setBusy,
  categories, selectedCats, onToggleCat, trailsOverlay, railOverlay, toggleTrails, toggleRail,
  clearExploreMarkers, setExploreMarkers }) {
  const searchReqId = useRef(0);
  const searchTimer = useRef(null);
  const [exploreErr, setExploreErr] = useState(false);

  const doSearch = useCallback(async (q, cats) => {
    if (!q.trim()) { setResults([]); clearExploreMarkers(); return; }
    const id = ++searchReqId.current;
    setBusy(true);
    setExploreErr(false);
    clearExploreMarkers();
    try {
      const catParam = cats.length > 0 ? "&category=" + cats.join(",") : "";
      const r = await fetch("/api/search?q=" + encodeURIComponent(q) + catParam);
      const d = await r.json();
      if (id === searchReqId.current) {
        setResults(d.results || []);
        setExploreMarkers(d.results || []);
      }
    } catch { if (id === searchReqId.current) { setResults([]); setExploreMarkers([]); setExploreErr(true); } }
    if (id === searchReqId.current) setBusy(false);
  }, [setResults, setBusy, clearExploreMarkers, setExploreMarkers]);

  const queueSearch = useCallback((q, cats) => {
    setQuery(q);
    clearTimeout(searchTimer.current);
    if (!q.trim()) { setResults([]); clearExploreMarkers(); setBusy(false); return; }
    setResults([]);
    setBusy(true);
    setExploreErr(false);
    searchTimer.current = setTimeout(() => doSearch(q, cats), 280);
  }, [setQuery, doSearch, setResults, clearExploreMarkers, setBusy]);

  const onChipClick = (id) => {
    const next = selectedCats.includes(id)
      ? selectedCats.filter(c => c !== id)
      : [...selectedCats, id];
    onToggleCat(id);
      if (query.trim()) queueSearch(query, next);
  };

  const go = (r) => {
    const m = mapObj.current;
    if (m && r.metadata) {
      m.flyTo({ center: [r.metadata.lon, r.metadata.lat], zoom: 15, duration: 800 });
    }
  };
  let body;
  if (results.length > 0) {
    body = <div className="fade-in">{results.map((r) => (
      <div key={r.id} className="trail" style={{ cursor: "pointer" }} onClick={() => go(r)}>
        <div className="spark" style={{ display: "grid", placeItems: "center", background: "var(--green-soft)" }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--green)" }}>
            <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/>
          </svg>
        </div>
        <div className="info">
          <div className="nm">{r.metadata?.name || r.id}</div>
          <div className="sub">{r.metadata?.category || ""}</div>
          <div className="tags"><span className="g">{(r.score * 100).toFixed(0)}% match</span></div>
        </div>
      </div>
    ))}</div>;
  } else if (query.trim() && !busy && exploreErr) {
    body = <div className="mono" style={{ padding: "20px 0", textAlign: "center", color: "var(--muted-txt)" }}>Search failed &mdash; check connection</div>;
  } else if (query.trim() && !busy) {
    body = <div className="mono fade-in" style={{ padding: "20px 0", textAlign: "center", color: "var(--muted-txt)" }}>No results found</div>;
  } else body = null;
  return (
    <div>
      <div style={{ marginBottom: 14, fontSize: 12.5, color: "var(--muted-txt)", lineHeight: 1.4 }}>
        Search for trails, bike shops, water stations, and more.
      </div>
      <div className="io-row" style={{ borderRadius: 12, marginBottom: 8 }}>
        <input value={query} placeholder="Search trails, POIs..."
          onChange={e => queueSearch(e.target.value, selectedCats)} />
        {busy && <span className="mono" style={{ fontSize: 10, color: "var(--muted-txt)", padding: "0 10px" }}>...</span>}
      </div>

      {/* Category filter chips */}
      {categories.length > 0 && (
        <div className="chips">
          {categories.map(c => (
            <span key={c.id}
              className={"chip" + (selectedCats.includes(c.id) ? " active" : "")}
              onClick={() => onChipClick(c.id)}>
              {c.label}
            </span>
          ))}
        </div>
      )}

      {/* Map overlays toggles */}
      <div style={{ marginTop: 14, padding: "10px 12px", background: "var(--paper-2)", borderRadius: 12, border: "1px solid var(--line)" }}>
        <div className="mono" style={{ fontSize: 10, color: "var(--muted-txt)", letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 8 }}>Map overlays</div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--ink)", padding: "4px 0" }}>
          <input type="checkbox" checked={trailsOverlay} onChange={toggleTrails}
            style={{ accentColor: "var(--green)" }} />
          Waymarked Trails
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--ink)", padding: "4px 0" }}>
          <input type="checkbox" checked={railOverlay} onChange={toggleRail}
            style={{ accentColor: "var(--green)" }} />
          Railways & stations
        </label>
      </div>

      {body}
    </div>
  );
}

/* ---- geocoding input with live autocomplete ---- */
function GeoInput({ dotClass, dotNumber, value, placeholder, onPick, onClear, canClear, showLocate, onLocate }) {
  const [q, setQ] = useState(value || "");
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geocodeErr, setGeocodeErr] = useState(false);
  const tRef = useRef(null);
  useEffect(() => { setQ(value || ""); }, [value]);

  const search = (text) => {
    clearTimeout(tRef.current);
    if (!text.trim()) { setList([]); setGeocodeErr(false); return; }
    tRef.current = setTimeout(async () => {
      setBusy(true);
      setGeocodeErr(false);
      try {
        const r = await BR.geocode(text);
        setBusy(false); setList(r); setOpen(true);
      } catch {
        setBusy(false); setGeocodeErr(true);
      }
    }, 350);
  };
  return (
    <div style={{ position: "relative" }}>
      <div className={"io-row" + (geocodeErr ? " is-error" : "")} style={{ borderRadius: 12 }} aria-invalid={geocodeErr || undefined}>
        <span className={"io-dot " + dotClass} style={dotNumber ? { display: "grid", placeItems: "center", width: 16, height: 16, fontSize: 9, fontWeight: 700, color: "#fff" } : null}>{dotNumber || ""}</span>
        <input value={q} placeholder={placeholder}
          onChange={(e) => { setQ(e.target.value); search(e.target.value); }}
          onFocus={() => list.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 160)} />
        {busy && <span className="mono" style={{ fontSize: 10, color: "var(--muted-txt)" }}>···</span>}
        {showLocate && !busy && !locating && (
          <button className="io-clear" title="Use my current location" aria-label="Use my current location"
            onClick={() => { setLocating(true); onLocate && onLocate(() => setLocating(false)); }}
            style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--green)", display: "grid", placeItems: "center", width: 22, height: 22, flex: "none", borderRadius: 6 }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
          </button>
        )}
        {locating && <span className="mono" style={{ fontSize: 10, color: "var(--green)" }}>locating…</span>}
        {canClear && !busy && (
          <button className="io-clear" title="Remove stop" aria-label="Remove stop"
            onMouseDown={(e) => { e.preventDefault(); onClear && onClear(); }}
            style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--muted-txt)", display: "grid", placeItems: "center", width: 22, height: 22, flex: "none", borderRadius: 6 }}>
            <span style={{ width: 13, height: 13, display: "block" }}>{Ic.x}</span>
          </button>
        )}
      </div>
      {geocodeErr && <div className="field-error">Couldn&rsquo;t reach geocoder</div>}
      {open && list.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
          background: "var(--panel-solid)", border: "1px solid var(--line)", borderRadius: 12,
          boxShadow: "var(--shadow)", overflow: "hidden", maxHeight: 240, overflowY: "auto" }}>
          {list.map((d, i) => (
            <div key={i} onMouseDown={() => { onPick(d); setQ(value ? d.short : ""); setOpen(false); }}
              style={{ padding: "10px 13px", cursor: "pointer", borderBottom: i < list.length - 1 ? "1px solid var(--line)" : 0 }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-2)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{d.short}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted-txt)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



/* ---- elevation chart with hover tooltip + crosshair ---- */
function ElevLive({ elev, dist, onScrub }) {
  const ref = useRef(null);
  const [tip, setTip] = useState(null);
  if (!elev || elev.length < 2) return null;
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
    setTip({ left: frac * 100, e: Math.round(near.e), km: ((dist || maxD) / 1000 * frac).toFixed(1) });
    onScrub && onScrub(frac);
  };
  const leave = () => { setTip(null); onScrub && onScrub(null); };

  return (
    <div className="elev">
      <div className="elev-head">
        <span className="t">Elevation</span>
        <span className="r mono">{Math.round(lo)}–{Math.round(hi)} m</span>
      </div>
      <div className="elev-chart" ref={ref} onMouseMove={move} onMouseLeave={leave}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
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
        <div className={"elev-tip mono " + (tip ? "show" : "")} style={{ left: (tip ? tip.left : 0) + "%" }}>
          {tip && `${tip.e} m · ${tip.km} km`}
        </div>
      </div>
    </div>
  );
}

/* ============================ APP ============================ */
export default function LiveApp() {
  const [theme, setTheme] = useState(() => localStorage.getItem("br-theme") || "dark");
  const [pref, setPref] = useState("balanced");
  const [wps, setWps] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const [saved, setSaved] = useState(false);
  const [hoverTurn, setHoverTurn] = useState(null);
  const [readout, setReadout] = useState({ scale: null, coords: null });
  const [infoOpen, setInfoOpen] = useState(false);
  const [view, setView] = useState("map");
  const [exploreQuery, setExploreQuery] = useState("");
  const [exploreResults, setExploreResults] = useState([]);
  const [exploreBusy, setExploreBusy] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCats, setSelectedCats] = useState([]);
  const [trailsOverlay, setTrailsOverlay] = useState(() => localStorage.getItem("br-trails") !== "off");
  const [railOverlay, setRailOverlay] = useState(() => localStorage.getItem("br-rail") === "on");
  const [modalSection, setModalSection] = useState(null);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const mapRef = useRef(null);
  const longPressRef = useRef(null);
  const mapObj = useRef(null);
  const wpMarkers = useRef([]);
  const exploreMarkers = useRef([]);
  const scrubMarker = useRef(null);
  const turnMarker = useRef(null);
  const reqId = useRef(0);
  const wpsRef = useRef(wps);
  const viewRef = useRef(view);
  const panelScrollRef = useRef(null);
  const scrollSentinelRef = useRef(null);
  useEffect(() => { wpsRef.current = wps; }, [wps]);
  useEffect(() => { viewRef.current = view; }, [view]);

  useEffect(() => { if (panelScrollRef.current) panelScrollRef.current.scrollTop = 0; }, [view]);

  useEffect(() => {
    const el = scrollSentinelRef.current;
    const p = panelScrollRef.current;
    if (!el || !p) return;
    const io = new IntersectionObserver(([e]) => {
      setShowScrollHint(!e.isIntersecting);
    }, { root: p, threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [view]);

  const tileArr = (th) => ["a", "b", "c"].map(s =>
    th === "dark"
      ? `https://${s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png`
      : `https://${s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png`);
  const styleFor = (th) => ({
    version: 8,
    sources: { base: { type: "raster", tiles: tileArr(th), tileSize: 256, attribution: BR.TILES.attribution } },
    layers: [{ id: "base", type: "raster", source: "base" }],
  });

  const addRouteLayers = useCallback(() => {
    const map = mapObj.current; if (!map) return;
    if (map.getSource("route")) return;
    map.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "route-casing", type: "line", source: "route",
      paint: { "line-color": theme === "dark" ? "#0b0c08" : "#fffdf7", "line-width": 9, "line-opacity": 0.9 },
      layout: { "line-cap": "round", "line-join": "round" } });
    map.addLayer({ id: "route", type: "line", source: "route",
      paint: { "line-color": "#ff6b1a", "line-width": 5 },
      layout: { "line-cap": "round", "line-join": "round" } });
  }, [theme]);

  const addTrailsOverlay = useCallback(() => {
    const map = mapObj.current; if (!map) return;
    const vis = trailsOverlay ? "visible" : "none";
    if (!map.getSource("trails")) {
      map.addSource("trails", { type: "raster", tiles: [BR.TILES.trailsOverlay], tileSize: 256, attribution: BR.TILES.trailsAttribution });
    }
    if (!map.getLayer("trails")) {
      map.addLayer({
        id: "trails", type: "raster", source: "trails",
        minzoom: 8,
        paint: {
          "raster-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0.35, 10, 0.65, 12, 0.85, 14, 1],
        },
        layout: { visibility: vis },
      }, "route-casing");
    } else {
      map.setLayoutProperty("trails", "visibility", vis);
    }
  }, [trailsOverlay]);

  const addRailLayer = useCallback(() => {
    const map = mapObj.current; if (!map) return;
    const vis = railOverlay ? "visible" : "none";
    let src = map.getSource("rail");
    if (!src) {
      src = map.addSource("rail", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      fetch("/api/features?type=rail").then(r => r.json()).then(data => {
        const s = map.getSource("rail");
        if (s) s.setData(data);
      }).catch(() => {});
    }
    if (!map.getLayer("rail-lines")) {
      map.addLayer({
        id: "rail-lines",
        type: "line",
        source: "rail",
        filter: ["!=", ["get", "category"], "station"],
        paint: {
          "line-color": ["match", ["get", "category"],
            "disused", "#96a89e", "abandoned", "#b8c6bf",
            "light_rail", "#5f8a78", "tram", "#5f8a78",
            "#7a9a8c"],
          "line-width": ["match", ["get", "category"],
            "disused", 1.5, "abandoned", 1,
            2.5],
          "line-opacity": ["match", ["get", "category"],
            "disused", 0.4, "abandoned", 0.25,
            0.55],
          "line-dasharray": ["match", ["get", "category"],
            "disused", ["literal", [4, 3]], "abandoned", ["literal", [2, 4]],
            ["literal", [1, 0]]],
        },
        layout: { visibility: vis },
      }, "route-casing");
    } else {
      map.setLayoutProperty("rail-lines", "visibility", vis);
    }
    if (!map.getLayer("rail-stations")) {
      map.addLayer({
        id: "rail-stations",
        type: "circle",
        source: "rail",
        minzoom: 11,
        filter: ["in", ["get", "category"], ["literal", ["station", "halt", "junction"]]],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 4, 13, 6],
          "circle-color": "#7a9a8c",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
          "circle-opacity": 0.7,
        },
        layout: { visibility: vis },
      }, "route-casing");
    } else {
      map.setLayoutProperty("rail-stations", "visibility", vis);
    }
  }, [railOverlay]);

  const updateScale = useCallback(() => {
    const map = mapObj.current; if (!map) return;
    const c = map.getCenter();
    const mpp = 156543.03392 * Math.cos(c.lat * Math.PI / 180) / Math.pow(2, map.getZoom());
    const targetM = mpp * 84;
    const pow = Math.pow(10, Math.floor(Math.log10(targetM)));
    const n = targetM / pow;
    const nice = (n >= 5 ? 5 : n >= 2 ? 2 : 1) * pow;
    const px = nice / mpp;
    const label = nice >= 1000 ? (nice / 1000) + " km" : Math.round(nice) + " m";
    setReadout(r => ({ ...r, scale: { px, label } }));
  }, []);

  /* ---- initialise map ---- */
  useEffect(() => {
    if (!mapRef.current || mapObj.current) return;
    const map = new maplibregl.Map({
      container: mapRef.current, style: styleFor(theme),
      center: [BR.HOME.lng, BR.HOME.lat], zoom: BR.HOME.zoom, attributionControl: false,
    });
    mapObj.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    map.on("load", () => { addRouteLayers(); addTrailsOverlay(); addRailLayer(); updateScale(); setMapReady(true); });
    map.on("move", updateScale);
    map.on("mousemove", (e) => setReadout(r => ({ ...r, coords: `${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)}` })));
    map.on("click", async (e) => {
      if (viewRef.current !== "plan") return;
      const pt = { lng: e.lngLat.lng, lat: e.lngLat.lat, label: "Locating…" };
      setWps(prev => [...prev, pt]);
      const label = await BR.reverse(pt.lng, pt.lat);
      setWps(prev => prev.map(w => (w === pt ? { ...w, label } : w)));
    });
    window.addEventListener("resize", () => map.resize());
    return () => { map.remove(); mapObj.current = null; };
  }, []);

  /* ---- push route geometry to map ---- */
  const pushRoute = (res) => {
    const map = mapObj.current;
    if (!map || !map.getSource) return;
    const src = map.getSource("route");
    if (!src) return;
    src.setData(
      res
        ? { type: "Feature", geometry: { type: "LineString", coordinates: res.coords } }
        : { type: "FeatureCollection", features: [] }
    );
  };

  /* ---- compute route when waypoints / pref change ---- */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("br-theme", theme);
    const map = mapObj.current; if (!map) return;
    map.setStyle(styleFor(theme));
    map.once("styledata", () => { addRouteLayers(); addTrailsOverlay(); addRailLayer(); pushRoute(result); });
  }, [theme]);

  useEffect(() => {
    const map = mapObj.current; if (!map) return;
    wpMarkers.current.forEach(m => m.remove());
    wpMarkers.current = [];
    const edge = theme === "dark" ? "rgba(255,245,230,.9)" : "#0b0c08";
    const wingSVG = (w) => `<svg width="${w}" height="${w}" viewBox="0 0 40 40" style="display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))"><g fill="#ff6b1a" stroke="${edge}" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"><ellipse cx="12.2" cy="12.4" rx="3.1" ry="9.8" transform="rotate(-63 12.2 12.4)"/><ellipse cx="14.4" cy="15.2" rx="3" ry="8.4" transform="rotate(-46 14.4 15.2)"/><ellipse cx="16.5" cy="17.8" rx="2.8" ry="7" transform="rotate(-30 16.5 17.8)"/><ellipse cx="27.8" cy="12.4" rx="3.1" ry="9.8" transform="rotate(63 27.8 12.4)"/><ellipse cx="25.6" cy="15.2" rx="3" ry="8.4" transform="rotate(46 25.6 15.2)"/><ellipse cx="23.5" cy="17.8" rx="2.8" ry="7" transform="rotate(30 23.5 17.8)"/><path d="M20 35.8 L19.1 33 L19.1 14 Q20 12 20.9 14 L20.9 33 Z"/><circle cx="20" cy="10.4" r="2.4"/></g></svg>`;
    wps.forEach((pt, i) => {
      const isFirst = i === 0, isLast = i === wps.length - 1 && wps.length > 1;
      const el = document.createElement("div");
      let anchor = "center";
      if (isLast) {
        el.style.cssText = "cursor:grab;line-height:0;";
        el.innerHTML = wingSVG(34);
        anchor = "bottom";
      } else {
        const color = isFirst ? "#9fb84a" : "#d4a96a";
        el.style.cssText = `width:${isFirst ? 20 : 16}px;height:${isFirst ? 20 : 16}px;border-radius:50%;background:${color};border:3px solid ${edge};box-shadow:0 2px 6px rgba(0,0,0,.5);cursor:grab;display:grid;place-items:center;color:#0b0c08;font:700 9px/1 'IBM Plex Mono',monospace;`;
        if (!isFirst) el.textContent = String(i);
      }
      const mk = new maplibregl.Marker({ element: el, draggable: true, anchor }).setLngLat([pt.lng, pt.lat]).addTo(map);
      mk.on("dragstart", () => { el.style.cursor = "grabbing"; });
      mk.on("dragend", async () => {
        el.style.cursor = "grab";
        const ll = mk.getLngLat();
        const idx = i;
        setWps(prev => prev.map((w, j) => (j === idx ? { ...w, lng: ll.lng, lat: ll.lat, label: "Locating…" } : w)));
        const label = await BR.reverse(ll.lng, ll.lat);
        setWps(prev => prev.map((w, j) => (j === idx ? { ...w, label } : w)));
      });
      wpMarkers.current.push(mk);
    });
  }, [wps, theme]);

  const clearExploreMarkers = useCallback(() => {
    exploreMarkers.current.forEach(m => m.remove());
    exploreMarkers.current = [];
  }, []);

  const setExploreMarkers = useCallback((results) => {
    clearExploreMarkers();
    const map = mapObj.current;
    if (!map || !Array.isArray(results)) return;
    results.forEach((r) => {
      const lon = r.metadata?.lon ?? r.lon ?? r.lng;
      const lat = r.metadata?.lat ?? r.lat;
      const name = r.metadata?.name ?? r.name ?? "Result";
      const category = r.metadata?.category ?? "";
      const score = r.score ? `${(r.score * 100).toFixed(0)}% match` : "";
      if (lon == null || lat == null) return;
      const el = document.createElement("div");
      el.style.cssText = "width:20px;height:20px;border-radius:50%;background:var(--orange);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);cursor:pointer;z-index:20;";
      el.title = name;
      const popup = new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(
        `<div style="font-family:var(--font-body),system-ui,sans-serif;font-size:13px;color:var(--ink);max-width:180px;">` +
        `<div style="font-weight:600;margin-bottom:3px;">${name}</div>` +
        (category ? `<div style="font-size:11px;color:var(--muted-txt);">${category}</div>` : "") +
        (score ? `<div style="font-size:11px;color:var(--green);margin-top:4px;">${score}</div>` : "") +
        `</div>`
      );
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        map.flyTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), 14), duration: 600 });
      });
      const mk = new maplibregl.Marker({ element: el }).setLngLat([lon, lat]).setPopup(popup).addTo(map);
      exploreMarkers.current.push(mk);
    });
  }, [clearExploreMarkers]);



  /* ---- compute route when waypoints / pref / retry change ---- */
  useEffect(() => {
    const valid = wps.filter(Boolean);
    if (valid.length < 2) { setResult(null); setRouteError(null); pushRoute(null); return; }
    const id = ++reqId.current;
    setLoading(true);
    setRouteError(null);
    BR.route(valid, pref).then(res => {
      if (id !== reqId.current) return;
      setLoading(false); setResult(res); pushRoute(res);
      panelScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      const map = mapObj.current;
      if (map && res && res.coords && res.coords.length) {
        const lngs = res.coords.map(c => c[0]), lats = res.coords.map(c => c[1]);
        map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          { padding: { top: 90, bottom: 90, left: 420, right: 90 }, duration: 700 });
      }
    }).catch(e => {
      if (id !== reqId.current) return;
      setLoading(false); setRouteError(e); setResult(null); pushRoute(null);
      console.error("Route error:", e);
    });
  }, [wps, pref, retryKey]);

  const onScrub = useCallback((frac) => {
    const map = mapObj.current; if (!map) return;
    if (frac == null || !result) {
      if (scrubMarker.current) { scrubMarker.current.remove(); scrubMarker.current = null; }
      return;
    }
    const pt = BR.pointAtFrac(result.coords, frac);
    if (!pt) return;
    if (!scrubMarker.current) {
      const el = document.createElement("div");
      el.className = "scrub-dot";
      el.style.cssText = "width:14px;height:14px;border-radius:50%;background:var(--ink);border:3px solid var(--orange);box-shadow:0 0 0 4px rgba(255,107,26,.25);";
      scrubMarker.current = new maplibregl.Marker({ element: el }).setLngLat(pt).addTo(map);
    } else scrubMarker.current.setLngLat(pt);
  }, [result]);

  useEffect(() => {
    const map = mapObj.current; if (!map) return;
    if (hoverTurn == null || !result || !result.turns[hoverTurn]) {
      if (turnMarker.current) { turnMarker.current.remove(); turnMarker.current = null; }
      return;
    }
    const at = result.turns[hoverTurn].at;
    if (!turnMarker.current) {
      const el = document.createElement("div");
      el.style.cssText = "width:16px;height:16px;border-radius:50%;background:var(--orange);border:3px solid var(--paper);box-shadow:0 0 0 4px rgba(255,107,26,.3);";
      turnMarker.current = new maplibregl.Marker({ element: el }).setLngLat(at).addTo(map);
    } else turnMarker.current.setLngLat(at);
  }, [hoverTurn, result]);

  const download = (text, name, mime) => {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  };
  const exportGPX = () => {
    if (!result) return;
    const pts = result.coords.map(c => `<trkpt lat="${c[1]}" lon="${c[0]}">${c[2] != null ? `<ele>${c[2]}</ele>` : ""}</trkpt>`).join("");
    download(`<?xml version="1.0"?><gpx version="1.1" creator="bikeroutes.org"><trk><name>BikeRoutes route</name><trkseg>${pts}</trkseg></trk></gpx>`, "route.gpx", "application/gpx+xml");
  };
  const exportKML = () => {
    if (!result) return;
    const line = result.coords.map(c => `${c[0]},${c[1]}${c[2] != null ? "," + c[2] : ""}`).join(" ");
    download(`<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>BikeRoutes route</name><Placemark><name>Route</name><LineString><tessellate>1</tessellate><coordinates>${line}</coordinates></LineString></Placemark></Document></kml>`, "route.kml", "application/vnd.google-earth.kml+xml");
  };

  const setWp = (i, d) => setWps(prev => prev.map((w, j) => (j === i ? { lng: d.lng, lat: d.lat, label: d.short } : w)));
  const appendWp = (d) => setWps(prev => [...prev, { lng: d.lng, lat: d.lat, label: d.short }]);
  const removeWp = (i) => setWps(prev => prev.filter((_, j) => j !== i));
  const reverseWps = () => setWps(prev => [...prev].reverse());
  const locateMe = (done) => {
    if (!navigator.geolocation) { done(); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const pt = { lng: pos.coords.longitude, lat: pos.coords.latitude, label: "Locating…" };
        setWps(prev => prev.length === 0 ? [pt] : [{ ...prev[0], lng: pt.lng, lat: pt.lat, label: "Locating…" }, ...prev.slice(1)]);
        const label = await BR.reverse(pt.lng, pt.lat);
        setWps(prev => [{ ...prev[0], label }, ...prev.slice(1)]);
        done();
        const map = mapObj.current;
        if (map) map.flyTo({ center: [pt.lng, pt.lat], zoom: Math.max(map.getZoom(), 14), duration: 800 });
      },
      () => { done(); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const toggleTrails = () => {
    const map = mapObj.current;
    const next = !trailsOverlay;
    setTrailsOverlay(next);
    localStorage.setItem("br-trails", next ? "on" : "off");
    if (map && map.getLayer("trails")) map.setLayoutProperty("trails", "visibility", next ? "visible" : "none");
  };

  const toggleRail = () => {
    const map = mapObj.current;
    const next = !railOverlay;
    setRailOverlay(next);
    localStorage.setItem("br-rail", next ? "on" : "off");
    if (map) {
      ["rail-lines", "rail-stations"].forEach(id => {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", next ? "visible" : "none");
      });
    }
  };

  const onToggleCat = (id) => {
    setSelectedCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  useEffect(() => {
    fetch("/api/poi/categories").then(r => r.json()).then(d => {
      if (d.categories) setCategories(d.categories);
    }).catch(() => {});
  }, []);

  const grade = result ? (result.ascend / Math.max(1, result.dist) * 100) : 0;
  const mPerKm = result ? result.ascend / Math.max(0.1, result.dist / 1000) : 0;
  const diff = !result ? 0 : mPerKm < 8 ? 1 : mPerKm < 18 ? 2 : 3;
  const diffTxt = ["", "Easy", "Moderate", "Hard"][diff];
  const diffSub = ["", "gentle grades", "rolling terrain", "serious climbing"][diff];

  const srcBadge = result && (
    <span className="mono" style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 5,
      background: result.source === "valhalla" ? "var(--green-soft)" : "var(--orange-soft)",
      color: result.source === "valhalla" ? "var(--green)" : "var(--orange)", fontWeight: 600 }}>
      {result.source === "valhalla" ? "live · Valhalla"
        : result.source === "fossgis" ? "live · FOSSGIS"
        : result.source === "brouter" ? "live · BRouter"
        : result.source || "estimate"}
    </span>
  );

  const valid = wps.filter(Boolean);
  const hint = valid.length === 0 ? "click map to set start"
    : valid.length === 1 ? "click map to set destination"
    : result ? `${BR.fmtKm(result.dist)} km · ${valid.length} stops` : "routing…";

  return (
    <div className="app">
      <div className="map-layer" ref={mapRef} />

      {/* TOP BAR */}
      <div className="topbar">
        <div className="brand">
          <span className="app-tile" aria-hidden="true">
            <img src="/byn3.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4 }} />
          </span>
          <div className="brand-txt">
            <div className="wordmark name" aria-label="bikeroutes.org" style={{ cursor: "pointer" }} onClick={() => setInfoOpen(true)}>
              b<span className="i-slot"><span className="head"><svg viewBox="0 0 120 80"><use href="#cowboy-hat" /></svg></span><span className="stem" /></span>keroutes<span className="tld">.org</span>
            </div>
            <div className="tag mono">open cycling maps · midwest</div>
          </div>
          <span className="ver-chip mono" title="Penultimate — release candidate">v0.9 · RC</span>
        </div>
        <div className="spacer" />
        <div className="theme-toggle" role="group" aria-label="Map theme">
          <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")} title="Daylight" aria-label="Daylight theme">{Ic.sun}</button>
          <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")} title="Tactical dark" aria-label="Dark theme">{Ic.moon}</button>
        </div>
        <button className="pillbtn" onClick={() => setInfoOpen(true)} title="Info" style={{ padding: "9px 11px" }}>{Ic.info}</button>
        <button className="pillbtn solid" style={{ userSelect: "none" }}
          title={wps.length > 0 ? "Click remove last stop · Long-press clear route" : (view !== "plan" ? "Switch to plan" : "New route")}
          onMouseDown={() => {
            if (wps.length === 0) return;
            longPressRef.current = setTimeout(() => { longPressRef.current = null; setWps([]); }, 700);
          }}
          onMouseUp={() => {
            if (wps.length === 0) { if (view !== "plan") setView("plan"); return; }
            if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; setWps(prev => prev.slice(0, -1)); }
          }}
          onMouseLeave={() => { if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; } }}
          onTouchStart={(e) => {
            if (wps.length === 0) return;
            longPressRef.current = setTimeout(() => { longPressRef.current = null; setWps([]); }, 700);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            if (wps.length === 0) { if (view !== "plan") setView("plan"); return; }
            if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; setWps(prev => prev.slice(0, -1)); }
          }}
          onTouchMove={() => { if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; } }}>
          {wps.length > 0 ? Ic.x : Ic.plus}<span className="btn-label"> {wps.length > 0 ? "Remove" : (view !== "plan" ? "Plan route" : "New route")}</span></button>
      </div>

      {/* INFO MODAL */}
      {infoOpen && (
        <div className="modal-overlay" onClick={() => setInfoOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setInfoOpen(false)}>{Ic.x}</button>
            <div className="wordmark" aria-label="bikeroutes.org">
              b<span className="i-slot"><span className="head"><svg viewBox="0 0 120 80"><use href="#cowboy-hat" /></svg></span><span className="stem" /></span>keroutes<span className="tld">.org</span>
            </div>
            <div className="modal-nav">
              <a href="#" className={(modalSection === null || modalSection === "main") && view === "plan" ? "active" : ""} onClick={(e) => { e.preventDefault(); setModalSection(null); setView("plan"); setInfoOpen(false); }}>Plan</a>
          <a href="#" className={(modalSection === null || modalSection === "main") && view === "explore" ? "active" : ""} onClick={(e) => { e.preventDefault(); setModalSection(null); setView("explore"); setInfoOpen(false); }}>Explore</a>
          <a href="#" className={(modalSection === null || modalSection === "main") && view === "map" ? "active" : ""} onClick={(e) => { e.preventDefault(); setModalSection(null); setView("map"); setInfoOpen(false); }}>Map</a>
          <a href="#" className={(modalSection === null || modalSection === "main") && view === "community" ? "active" : ""} onClick={(e) => { e.preventDefault(); setModalSection(null); setView("community"); setInfoOpen(false); }}>Community</a>
              <a href="#" className={modalSection === "map-data" ? "active" : ""} onClick={(e) => { e.preventDefault(); setModalSection(modalSection === "map-data" ? null : "map-data"); }}>Map data</a>
              <a href="#" className={modalSection === "donate" ? "active" : ""} onClick={(e) => { e.preventDefault(); setModalSection(modalSection === "donate" ? null : "donate"); }}>Donate</a>
              <a href="#" className={modalSection === "about" ? "active" : ""} onClick={(e) => { e.preventDefault(); setModalSection(modalSection === "about" ? null : "about"); }}>About</a>
            </div>
            {modalSection === "map-data" ? (
              <div className="modal-section" style={{ fontSize: 11.5, lineHeight: 1.55 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--ink)" }}>Map data sources</div>
                <div style={{ color: "var(--ink-2)", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div><b style={{ color: "var(--ink)" }}>Basemap</b><br />CARTO Voyager / Dark Matter tiles (R2-hosted tiles coming soon)</div>
                  <div><b style={{ color: "var(--ink)" }}>Cycling overlay</b><br />Waymarked Trails cycling map &mdash; &copy; waymarkedtrails.org. Purple lines are signed bike routes; the route-shield legend is in the Map panel when the overlay is on.</div>
                  <div><b style={{ color: "var(--ink)" }}>Trail data</b><br />OpenStreetMap contributors (ODbL), MARC ArcGIS, MetroGreen corridors</div>
                  <div><b style={{ color: "var(--ink)" }}>Geocoding</b><br />OpenStreetMap Nominatim</div>
                  <div><b style={{ color: "var(--ink)" }}>Routing</b><br />Valhalla (bicycle profile) with FOSSGIS &amp; BRouter fallback</div>
                </div>

              </div>
            ) : modalSection === "donate" ? (
              <div className="modal-section" style={{ fontSize: 11.5, lineHeight: 1.55 }}>
                <div style={{ fontWeight: 600, marginBottom: 10, color: "var(--ink)" }}>Support BikeRoutes.org</div>
                <DonatePanel />
              </div>
            ) : modalSection === "about" ? (
              <div className="modal-section" style={{ fontSize: 11.5, lineHeight: 1.55 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--ink)" }}>About BikeRoutes.org</div>
                <div style={{ color: "var(--ink-2)", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>Open cycling route planner and trail explorer for the Kansas City metro and Midwest.</div>
                  <div>Built with MapLibre GL JS, Cloudflare Workers, D1, and Vectorize. No tracking, no ads, no accounts required.</div>
                  <div>Source code available on GitHub. Contributions welcome.</div>
                  <div className="mono" style={{ fontSize: 10.5, color: "var(--muted-txt)" }}>v0.9 RC &middot; open cycling maps &middot; midwest</div>
                </div>
              </div>
            ) : (
              <>
              <div className="modal-section">
                <div className="modal-privacy">
                  <span className="modal-icon">{Ic.lock}</span>
                  <div>
                    <b>No tracking, no ads.</b><br />
                    <span className="mono">Open source &middot; OSM / ODbL</span>
                  </div>
                </div>
              </div>
              <div className="modal-section mono" style={{ fontSize: 11.5, color: "var(--muted-txt)" }}>
                bikeroutes.org &middot; v0.9 RC<br />
                open cycling maps &middot; midwest
              </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* PANEL */}
      <div className="panel">
        <div className="modetabs">
          <button className={view === "plan" ? "active" : ""} onClick={() => setView("plan")}>Plan a route</button>
          <button className={view === "explore" ? "active" : ""} onClick={() => setView("explore")}>Explore</button>
          <button className={view === "map" ? "active" : ""} onClick={() => setView("map")}>Map</button>
          <button className={view === "community" ? "active" : ""} onClick={() => setView("community")}>Community</button>
        </div>
        <div className="panel-scroll" ref={panelScrollRef}>
          {view === "plan" && <>
          <div style={{ marginBottom: 14, fontSize: 12.5, color: "var(--muted-txt)", lineHeight: 1.4 }}>
            Type a start and destination below, or click the map to set waypoints.
          </div>

          {/* waypoint inputs */}
          <div className="io" style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8 }}>
            {wps.map((w, i) => (
              <GeoInput key={i} dotClass={i === 0 ? "a" : i === wps.length - 1 ? "b" : "via"}
                dotNumber={i !== 0 && i !== wps.length - 1 ? i : null}
                value={w.label} placeholder={i === 0 ? "Start" : "Stop"}
                onPick={(d) => setWp(i, d)} canClear onClear={() => removeWp(i)}
                showLocate={i === 0} onLocate={locateMe} />
            ))}
            <GeoInput dotClass={wps.length === 0 ? "a" : "add"} value=""
              placeholder={wps.length === 0 ? "Choose start — or click the map" : wps.length === 1 ? "Choose destination" : "Add another stop"}
              onPick={appendWp} />
            {valid.length >= 2 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, alignSelf: "flex-start" }}>
                <button className="pillbtn" onClick={reverseWps} style={{ padding: "7px 11px", fontSize: 12 }}>{Ic.swap} Reverse</button>
                {loading && <span className="spin" />}
              </div>
            )}
          </div>

          <div className="seg-label">Route preference</div>
          <div className="seg">
            {[["balanced", "Balanced", "all-round"], ["quiet", "Quiet", "safest"], ["fast", "Fastest", "direct"]].map(([k, t, s]) => (
              <button key={k} className={pref === k ? "active" : ""} onClick={() => setPref(k)}>{t}<span className="sub">{s}</span></button>
            ))}
          </div>

          {/* states */}
          {valid.length < 2 ? (
            <div style={{ marginTop: 16, padding: "14px 12px", background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.45 }}>
              Pick a start and a destination — or click the map to set waypoints.
            </div>
          ) : loading ? (
            <div style={{ marginTop: 16 }}>
              <div className="route-skelly fade-in">
                <div className="row">
                  <div className="sk-blk big" />
                  <div className="sk-blk med" style={{ marginLeft: "auto" }} />
                </div>
                <div className="grid">
                  <div className="cell" />
                  <div className="cell" />
                </div>
                <div className="bar" />
              </div>
              <div style={{ marginTop: 10, padding: "14px 12px", background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.45 }}>
                Scouting the route for a bikeable way…
              </div>
            </div>
          ) : routeError ? (
            <div className="route-error fade-in">
              <div className="msg">Couldn&rsquo;t find a route &mdash; <strong>tap to retry</strong></div>
              <button onClick={() => setRetryKey(k => k + 1)}>Retry</button>
            </div>
          ) : result ? (
            <div className="fade-in">
              <div className="summary">
                <div className="summary-top">
                  <div className="dist mono">{BR.fmtKm(result.dist)}<span>km</span></div>
                  <div className="time">· <b>{BR.fmtTime(result.time)}</b></div>
                  <div style={{ flex: 1 }} />
                  {srcBadge}
                </div>
                <div className="stat-grid">
                  <div className="stat"><div className="k">Climb</div><div className="v mono">+{Math.round(result.ascend)}<small> m</small></div></div>
                  <div className="stat"><div className="k">Avg grade</div><div className="v mono">{grade.toFixed(1)}<small> %</small></div></div>
                </div>
                <div className="diffbar">
                  <div className="dots">{[1, 2, 3].map(n => <i key={n} className={n <= diff ? "on" : ""} />)}</div>
                  <span className="txt">{diffTxt} · {diffSub}</span>
                </div>
                <div className="surface">
                  <div className="bar"><div className="paved" style={{ width: result.surface.paved + "%" }} /><div className="gravel" style={{ width: result.surface.gravel + "%" }} /></div>
                  <div className="legend mono">
                    <span><i className="pv" />{result.surface.paved}% paved</span>
                    <span><i className="gv" />{result.surface.gravel}% gravel{result.surface.est ? " (est)" : ""}</span>
                  </div>
                </div>
              </div>

              <ElevLive elev={result.elev} dist={result.dist} onScrub={onScrub} />

              <div className="actions" style={{ flexWrap: "wrap" }}>
                <button className={saved ? "primary" : ""} onClick={() => setSaved(s => !s)}>{Ic.save}{saved ? "Saved" : "Save"}</button>
                <button onClick={() => navigator.clipboard && navigator.clipboard.writeText(location.href)}>{Ic.share} Share</button>
                <button onClick={exportGPX}>{Ic.gpx} GPX</button>
                <button onClick={exportKML}>{Ic.gpx} KML</button>
              </div>

              {result.source === "estimated" && <div style={{ marginTop: 14, padding: "14px 12px", background: "var(--orange-soft)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.45 }}>
                Trail signal is weak here — showing a best-estimate route.
              </div>}

              <div className="turns">
                <div className="turns-head">Directions · {result.turns.length} steps</div>
                {result.turns.map((t, i) => (
                  <div key={i} className="turn" onMouseEnter={() => setHoverTurn(i)} onMouseLeave={() => setHoverTurn(null)}>
                    <div className="ic">{turnIcon(t.type)}</div>
                    <div className="body">
                      <div className="road">{(t.type === "start" ? "Depart" : t.type === "arrive" ? "Arrive at destination" : t.type === "left" ? "Turn left" : t.type === "right" ? "Turn right" : "Continue") + ((t.road && t.type !== "start" && t.type !== "arrive" && !["Continue", "Start", "Arrive at destination"].includes(t.road)) ? ` onto ${t.road}` : "")}</div>
                      {t.dist > 0 && <div className="meta mono">{(t.dist / 1000).toFixed(1)} km</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          </>}
          {view === "explore" && <ExploreView
            mapObj={mapObj} query={exploreQuery} setQuery={setExploreQuery}
            results={exploreResults} setResults={setExploreResults}
            busy={exploreBusy} setBusy={setExploreBusy}
            categories={categories} selectedCats={selectedCats} onToggleCat={onToggleCat}
            trailsOverlay={trailsOverlay} railOverlay={railOverlay}
            toggleTrails={toggleTrails} toggleRail={toggleRail}
            clearExploreMarkers={clearExploreMarkers} setExploreMarkers={setExploreMarkers} />}
          {view === "map" && mapReady && <MapView mapObj={mapObj} />}
          {view === "community" && <CommunityView mapObj={mapObj} />}
          <div ref={scrollSentinelRef} style={{ height: 1 }} />
          <div className={"panel-fade" + (showScrollHint ? " show" : "")}>
            <span className="scroll-arrow">&darr; more</span>
          </div>
        </div>
      </div>

      {/* MAP CONTROLS */}
      <div className="mapctl">
        <div className="zoomstack">
          <button title="Zoom in" aria-label="Zoom in" onClick={() => mapObj.current && mapObj.current.zoomIn()}>+</button>
          <button title="Zoom out" aria-label="Zoom out" onClick={() => mapObj.current && mapObj.current.zoomOut()}>−</button>
        </div>
        <button className={"ctlbtn" + (trailsOverlay ? " active" : "")} onClick={toggleTrails} title={trailsOverlay ? "Hide trails" : "Show trails"}>{Ic.layers}<span className="ctl-label">Trails</span></button>
        <button className={"ctlbtn" + (railOverlay ? " active" : "")} onClick={toggleRail} title={railOverlay ? "Hide railways" : "Show railways"}>{Ic.layers}<span className="ctl-label">Rail</span></button>
      </div>

      {/* SCALE + COORDS */}
      <div className="readout">
        <div className="scalebar">
          <div className="bar" style={{ width: readout.scale ? readout.scale.px + "px" : "80px" }} />
          <div className="lbl mono">{readout.scale ? readout.scale.label : "—"}</div>
        </div>
        <div className="coords mono">{readout.coords || hint}</div>
      </div>
    </div>
  );
}
