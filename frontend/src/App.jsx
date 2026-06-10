import { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import * as BR from './api';
import './tokens.css';
import './styles.css';

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
};
const turnIcon = (t) => t === "left" ? Ic.left : t === "right" ? Ic.right : t === "arrive" ? Ic.flag : Ic.dot;

/* ---- Reki mascot ---- */
function Reki({ size = 64, mood = "scout" }) {
  const lines = {
    scout: "Reki's scouting the route…",
    empty: "Pick a start and a destination — or click the map. I'll find the bikeable way.",
    estimate: "Trail signal's weak out here — showing a best estimate.",
  };
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 12px",
      background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 12 }}>
      <span style={{ flex: "none", width: size, height: size, borderRadius: 12,
        background: "var(--green-soft)", border: "1px solid var(--line)",
        display: "grid", placeItems: "center", overflow: "hidden" }}>
        <svg viewBox="34 20 172 172" width={size - 10} height={size - 10}
          role="img" aria-label="Reki the deer" style={{ display: "block" }}>
          <use href="#reki-head" x="34" y="20" width="172" height="172" />
        </svg>
      </span>
      <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.45 }}>{lines[mood]}</div>
    </div>
  );
}

/* ---- geocoding input with live autocomplete ---- */
function GeoInput({ dotClass, dotNumber, value, placeholder, onPick, onClear, canClear }) {
  const [q, setQ] = useState(value || "");
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const tRef = useRef(null);
  useEffect(() => { setQ(value || ""); }, [value]);

  const search = (text) => {
    clearTimeout(tRef.current);
    if (!text.trim()) { setList([]); return; }
    tRef.current = setTimeout(async () => {
      setBusy(true);
      const r = await BR.geocode(text);
      setBusy(false); setList(r); setOpen(true);
    }, 350);
  };
  return (
    <div style={{ position: "relative" }}>
      <div className="io-row" style={{ borderRadius: 12 }}>
        <span className={"io-dot " + dotClass} style={dotNumber ? { display: "grid", placeItems: "center", width: 16, height: 16, fontSize: 9, fontWeight: 700, color: "#fff" } : null}>{dotNumber || ""}</span>
        <input value={q} placeholder={placeholder}
          onChange={(e) => { setQ(e.target.value); search(e.target.value); }}
          onFocus={() => list.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 160)} />
        {busy && <span className="mono" style={{ fontSize: 10, color: "var(--muted-txt)" }}>···</span>}
        {canClear && !busy && (
          <button className="io-clear" title="Remove stop" aria-label="Remove stop"
            onMouseDown={(e) => { e.preventDefault(); onClear && onClear(); }}
            style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--muted-txt)", display: "grid", placeItems: "center", width: 22, height: 22, flex: "none", borderRadius: 6 }}>
            <span style={{ width: 13, height: 13, display: "block" }}>{Ic.x}</span>
          </button>
        )}
      </div>
      {open && list.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
          background: "var(--panel-solid)", border: "1px solid var(--line)", borderRadius: 12,
          boxShadow: "var(--shadow)", overflow: "hidden", maxHeight: 240, overflowY: "auto" }}>
          {list.map((d, i) => (
            <div key={i} onMouseDown={() => { onPick(d); setQ(d.short); setOpen(false); }}
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

/* ---- place search: jump the map to a place ---- */
function PlaceSearch({ onJump }) {
  const [q, setQ] = useState("");
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const tRef = useRef(null);
  const run = (text) => {
    clearTimeout(tRef.current);
    if (!text.trim()) { setList([]); setOpen(false); return; }
    tRef.current = setTimeout(async () => {
      setBusy(true); const r = await BR.geocode(text); setBusy(false); setList(r); setOpen(true);
    }, 350);
  };
  return (
    <div style={{ position: "relative", marginBottom: 14 }}>
      <div className="io-row" style={{ borderRadius: 12, background: "var(--paper-2)" }}>
        <span style={{ width: 16, height: 16, color: "var(--muted-txt)", flex: "none" }}>{Ic.search}</span>
        <input value={q} placeholder="Search places — jump the map"
          onChange={(e) => { setQ(e.target.value); run(e.target.value); }}
          onFocus={() => list.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 160)} />
        {busy && <span className="mono" style={{ fontSize: 10, color: "var(--muted-txt)" }}>···</span>}
      </div>
      {open && list.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 55,
          background: "var(--panel-solid)", border: "1px solid var(--line)", borderRadius: 12,
          boxShadow: "var(--shadow)", overflow: "hidden", maxHeight: 220, overflowY: "auto" }}>
          {list.map((d, i) => (
            <div key={i} onMouseDown={() => { onJump(d); setQ(d.short); setOpen(false); }}
              style={{ padding: "9px 13px", cursor: "pointer", borderBottom: i < list.length - 1 ? "1px solid var(--line)" : 0 }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-2)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{d.short}</div>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--muted-txt)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.label}</div>
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
  const [saved, setSaved] = useState(false);
  const [hoverTurn, setHoverTurn] = useState(null);
  const [readout, setReadout] = useState({ scale: null, coords: null });

  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const wpMarkers = useRef([]);
  const scrubMarker = useRef(null);
  const turnMarker = useRef(null);
  const reqId = useRef(0);
  const wpsRef = useRef(wps);
  useEffect(() => { wpsRef.current = wps; }, [wps]);

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
    map.on("load", () => { addRouteLayers(); updateScale(); });
    map.on("move", updateScale);
    map.on("mousemove", (e) => setReadout(r => ({ ...r, coords: `${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)}` })));
    map.on("click", async (e) => {
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
    map.once("styledata", () => { addRouteLayers(); pushRoute(result); });
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

  /* ---- compute route when waypoints / pref change ---- */
  useEffect(() => {
    const valid = wps.filter(Boolean);
    if (valid.length < 2) { setResult(null); pushRoute(null); return; }
    const id = ++reqId.current;
    setLoading(true);
    BR.route(valid, pref).then(res => {
      if (id !== reqId.current) return;
      setLoading(false); setResult(res); pushRoute(res);
      const map = mapObj.current;
      if (map && res && res.coords && res.coords.length) {
        const lngs = res.coords.map(c => c[0]), lats = res.coords.map(c => c[1]);
        map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          { padding: { top: 90, bottom: 90, left: 420, right: 90 }, duration: 700 });
      }
    }).catch(e => {
      if (id !== reqId.current) return;
      setLoading(false);
      console.error("Route error:", e);
    });
  }, [wps, pref]);

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
  const jumpTo = (d) => { const map = mapObj.current; if (map) map.flyTo({ center: [d.lng, d.lat], zoom: Math.max(map.getZoom(), 13), duration: 800 }); };

  const grade = result ? (result.ascend / Math.max(1, result.dist) * 100) : 0;
  const mPerKm = result ? result.ascend / Math.max(0.1, result.dist / 1000) : 0;
  const diff = !result ? 0 : mPerKm < 8 ? 1 : mPerKm < 18 ? 2 : 3;
  const diffTxt = ["", "Easy", "Moderate", "Hard"][diff];
  const diffSub = ["", "gentle grades", "rolling terrain", "serious climbing"][diff];

  const srcBadge = result && (
    <span className="mono" style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 5,
      background: result.source === "valhalla" ? "var(--green-soft)" : "var(--orange-soft)",
      color: result.source === "valhalla" ? "var(--green)" : "var(--orange)", fontWeight: 600 }}>
      {result.source === "valhalla" ? "live · Valhalla" : result.source || "estimate"}
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
            <svg viewBox="0 0 40 40"><use href="#mark-b" /></svg>
          </span>
          <div className="brand-txt">
            <div className="wordmark name" aria-label="bikeroutes.org">
              b<span className="i-slot"><span className="head"><svg viewBox="34 20 172 172"><use href="#reki-head" /></svg></span><span className="stem" /></span>keroutes<span className="tld">.org</span>
            </div>
            <div className="tag mono">open cycling maps · midwest</div>
          </div>
          <span className="ver-chip mono" title="Penultimate — release candidate">v0.9 · RC</span>
        </div>
        <nav className="nav">
          <a href="#" className="active">Plan</a>
          <a href="#">Explore</a>
          <a href="#">Map data</a>
          <a href="#">About</a>
        </nav>
        <div className="spacer" />
        <div className="theme-toggle" role="group" aria-label="Map theme">
          <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")} title="Daylight" aria-label="Daylight theme">{Ic.sun}</button>
          <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")} title="Tactical dark" aria-label="Dark theme">{Ic.moon}</button>
        </div>
        <button className="pillbtn solid" onClick={() => setWps([])} title="Clear route">{Ic.plus}<span className="btn-label"> New route</span></button>
      </div>

      {/* PRIVACY BADGE */}
      <div className="privacy">
        <div className="ic">{Ic.lock}</div>
        <div className="txt">
          <b>No tracking, no ads.</b><br />
          <span className="mono">Open source · OSM / ODbL</span>
        </div>
      </div>

      {/* PANEL */}
      <div className="panel">
        <div className="modetabs"><button className="active">Plan a route</button></div>
        <div className="panel-scroll">
          <PlaceSearch onJump={jumpTo} />

          {/* waypoint inputs */}
          <div className="io" style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8 }}>
            {wps.map((w, i) => (
              <GeoInput key={i} dotClass={i === 0 ? "a" : i === wps.length - 1 ? "b" : "via"}
                dotNumber={i !== 0 && i !== wps.length - 1 ? i : null}
                value={w.label} placeholder={i === 0 ? "Start" : "Stop"}
                onPick={(d) => setWp(i, d)} canClear onClear={() => removeWp(i)} />
            ))}
            <GeoInput dotClass={wps.length === 0 ? "a" : "add"} value=""
              placeholder={wps.length === 0 ? "Choose start — or click the map" : wps.length === 1 ? "Choose destination" : "Add another stop"}
              onPick={appendWp} />
            {valid.length >= 2 && (
              <button className="pillbtn" onClick={reverseWps} style={{ alignSelf: "flex-start", padding: "7px 11px", fontSize: 12 }}>{Ic.swap} Reverse</button>
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
            <div style={{ marginTop: 16 }}><Reki mood="empty" /></div>
          ) : loading ? (
            <div style={{ marginTop: 16 }}><Reki mood="scout" /></div>
          ) : result ? (
            <>
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

              {result.source === "estimated" && <div style={{ marginTop: 14 }}><Reki mood="estimate" /></div>}

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
            </>
          ) : null}
        </div>
      </div>

      {/* MAP CONTROLS */}
      <div className="mapctl">
        <div className="zoomstack">
          <button title="Zoom in" aria-label="Zoom in" onClick={() => mapObj.current && mapObj.current.zoomIn()}>+</button>
          <button title="Zoom out" aria-label="Zoom out" onClick={() => mapObj.current && mapObj.current.zoomOut()}>−</button>
        </div>
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
