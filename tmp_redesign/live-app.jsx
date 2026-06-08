/* ============================================================
   live-app.jsx — functional BikeRoutes app
   Real MapLibre basemap + live geocoding + live bike routing.
   UI chrome reuses styles.css (Tactical Hi-Tech / MO Camo).
   ============================================================ */
const { useState, useEffect, useRef, useCallback } = React;

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
  nav: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 11l18-8-8 18-2-7-8-3z"/></svg>,
  left: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 6l-6 6 6 6"/></svg>,
  right: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 6l6 6-6 6"/></svg>,
  flag: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V4M5 4h12l-2 4 2 4H5"/></svg>,
  dot: <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
};
const turnIcon = (t) => t === "left" ? Ic.left : t === "right" ? Ic.right : t === "arrive" ? Ic.flag : Ic.dot;

/* ---- Reki mascot (uses real asset) ---- */
function Reki({ size = 64, mood = "scout" }) {
  const lines = {
    scout: "Reki's scouting the route…",
    empty: "Pick a start and a destination — I'll find the bikeable way.",
    estimate: "Trail signal's weak out here — showing a best estimate.",
  };
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 12px",
      background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 12 }}>
      <img src="reki_icon.png" width={size} height={size} alt="Reki the deer"
        style={{ flex: "none", borderRadius: 10, objectFit: "contain" }} />
      <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.45 }}>{lines[mood]}</div>
    </div>
  );
}

/* ---- geocoding input with live autocomplete ---- */
function GeoInput({ dotClass, value, placeholder, onPick }) {
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
        <span className={"io-dot " + dotClass} />
        <input value={q} placeholder={placeholder}
          onChange={(e) => { setQ(e.target.value); search(e.target.value); }}
          onFocus={() => list.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 160)} />
        {busy && <span className="mono" style={{ fontSize: 10, color: "var(--muted-txt)" }}>···</span>}
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

/* ---- elevation chart from live profile ---- */
function ElevLive({ elev, onScrub }) {
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
  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onScrub && onScrub(frac);
  };
  return (
    <div className="elev">
      <div className="elev-head">
        <span className="t">Elevation</span>
        <span className="r mono">{Math.round(lo)}–{Math.round(hi)} m</span>
      </div>
      <div className="elev-chart" onMouseMove={onMove} onMouseLeave={() => onScrub && onScrub(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <path d={area} fill="var(--orange)" opacity="0.12" />
          <path d={line} fill="none" stroke="var(--orange)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  );
}

/* ============================ APP ============================ */
function LiveApp() {
  const [theme, setTheme] = useState(() => localStorage.getItem("br-theme") || "dark");
  const [pref, setPref] = useState("balanced");
  const [start, setStart] = useState(null);
  const [dest, setDest] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hover, setHover] = useState(null);
  const [setNext, setSetNext] = useState("start"); // map-click target

  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const markers = useRef({ a: null, b: null });
  const reqId = useRef(0);

  /* ---- map init ---- */
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

  useEffect(() => {
    if (!window.maplibregl || mapObj.current) return;
    const map = new maplibregl.Map({
      container: mapRef.current, style: styleFor(theme),
      center: [BR.HOME.lng, BR.HOME.lat], zoom: BR.HOME.zoom, attributionControl: false,
    });
    mapObj.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    map.on("load", addRouteLayers);
    map.on("click", async (e) => {
      const pt = { lng: e.lngLat.lng, lat: e.lngLat.lat };
      pt.label = await BR.reverse(pt.lng, pt.lat);
      setSetNext(prev => {
        if (prev === "start") { setStart(pt); return "dest"; }
        else { setDest(pt); return "start"; }
      });
    });
    return () => { map.remove(); mapObj.current = null; };
  }, []);

  /* ---- theme ---- */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("br-theme", theme);
    const map = mapObj.current; if (!map) return;
    map.setStyle(styleFor(theme));
    map.once("styledata", () => { addRouteLayers(); pushRoute(result); });
  }, [theme]);

  /* ---- markers ---- */
  const setMarker = (key, pt, color) => {
    const map = mapObj.current; if (!map) return;
    if (markers.current[key]) { markers.current[key].remove(); markers.current[key] = null; }
    if (!pt) return;
    const el = document.createElement("div");
    el.style.cssText = `width:18px;height:18px;border-radius:50%;background:${color};border:3px solid ${theme === "dark" ? "#0b0c08" : "#fffdf7"};box-shadow:0 2px 6px rgba(0,0,0,.5);`;
    markers.current[key] = new maplibregl.Marker({ element: el }).setLngLat([pt.lng, pt.lat]).addTo(map);
  };
  useEffect(() => { setMarker("a", start, "#9fb84a"); }, [start, theme]);
  useEffect(() => { setMarker("b", dest, "#ff6b1a"); }, [dest, theme]);

  /* ---- push route geometry to map ---- */
  const pushRoute = (res) => {
    const map = mapObj.current; if (!map || !map.getSource) return;
    const src = map.getSource("route"); if (!src) return;
    src.setData(res ? { type: "Feature", geometry: { type: "LineString", coordinates: res.coords } } : { type: "FeatureCollection", features: [] });
  };

  /* ---- compute route on change ---- */
  useEffect(() => {
    if (!start || !dest) { setResult(null); pushRoute(null); return; }
    const id = ++reqId.current;
    setLoading(true);
    BR.route(start, dest, pref).then(res => {
      if (id !== reqId.current) return;
      setLoading(false); setResult(res); pushRoute(res);
      const map = mapObj.current;
      if (map && res.coords.length) {
        const lngs = res.coords.map(c => c[0]), lats = res.coords.map(c => c[1]);
        map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          { padding: { top: 90, bottom: 90, left: 420, right: 90 }, duration: 700 });
      }
    });
  }, [start, dest, pref]);

  const exportGPX = () => {
    if (!result) return;
    const pts = result.coords.map(c => `<trkpt lat="${c[1]}" lon="${c[0]}"></trkpt>`).join("");
    const gpx = `<?xml version="1.0"?><gpx version="1.1" creator="bikeroutes.org"><trk><name>BikeRoutes route</name><trkseg>${pts}</trkseg></trk></gpx>`;
    const url = URL.createObjectURL(new Blob([gpx], { type: "application/gpx+xml" }));
    const a = document.createElement("a"); a.href = url; a.download = "route.gpx"; a.click(); URL.revokeObjectURL(url);
  };

  const srcBadge = result && (
    <span className="mono" style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 5,
      background: result.source === "brouter" ? "var(--green-soft)" : "var(--orange-soft)",
      color: result.source === "brouter" ? "var(--green)" : "var(--orange)", fontWeight: 600 }}>
      {result.source === "brouter" ? "live · BRouter" : "estimate"}
    </span>
  );

  return (
    <div className="app">
      <div className="map-layer" ref={mapRef} />

      {/* TOP BAR */}
      <div className="topbar">
        <div className="brand">
          <div className="mark">{Ic.bike}</div>
          <div>
            <div className="name">bikeroutes<span style={{ color: "var(--muted-txt)", fontWeight: 400 }}>.org</span></div>
            <div className="tag mono">open cycling maps · midwest</div>
          </div>
        </div>
        <nav className="nav">
          <a href="#" className="active">Plan</a>
          <a href="#">Explore</a>
          <a href="#">Map data</a>
          <a href="#">About</a>
        </nav>
        <div className="spacer" />
        <div className="theme-toggle" role="group" aria-label="Map theme">
          <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")} title="Daylight">{Ic.sun}</button>
          <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")} title="Tactical dark">{Ic.moon}</button>
        </div>
        <button className="pillbtn solid">{Ic.plus}<span className="btn-label"> Add a route</span></button>
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
          <div className="io">
            <GeoInput dotClass="a" value={start && start.label} placeholder="Choose start — or click the map"
              onPick={(d) => { setStart({ lng: d.lng, lat: d.lat, label: d.short }); setSetNext("dest"); }} />
            <div style={{ height: 8 }} />
            <GeoInput dotClass="b" value={dest && dest.label} placeholder="Choose destination"
              onPick={(d) => { setDest({ lng: d.lng, lat: d.lat, label: d.short }); }} />
            {start && dest && (
              <button className="io-swap" style={{ top: "calc(50% - 4px)" }} title="Swap"
                onClick={() => { const a = start, b = dest; setStart(b); setDest(a); }}>{Ic.swap}</button>
            )}
          </div>

          <div className="seg-label">Route preference</div>
          <div className="seg">
            {[["balanced", "Balanced", "all-round"], ["quiet", "Quiet", "safest"], ["fast", "Fastest", "direct"]].map(([k, t, s]) => (
              <button key={k} className={pref === k ? "active" : ""} onClick={() => setPref(k)}>{t}<span className="sub">{s}</span></button>
            ))}
          </div>

          {/* states */}
          {!start || !dest ? (
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
                  <div className="stat"><div className="k">Profile</div><div className="v" style={{ textTransform: "capitalize" }}>{result.profile}</div></div>
                </div>
                <div className="surface">
                  <div className="bar"><div className="paved" style={{ width: result.surface.paved + "%" }} /><div className="gravel" style={{ width: result.surface.gravel + "%" }} /></div>
                  <div className="legend mono">
                    <span><i className="pv" />{result.surface.paved}% paved</span>
                    <span><i className="gv" />{result.surface.gravel}% gravel{result.surface.est ? " (est)" : ""}</span>
                  </div>
                </div>
              </div>

              <ElevLive elev={result.elev} onScrub={() => {}} />

              <div className="actions">
                <button className={saved ? "primary" : ""} onClick={() => setSaved(s => !s)}>{Ic.save}{saved ? "Saved" : "Save"}</button>
                <button onClick={() => navigator.clipboard && navigator.clipboard.writeText(location.href)}>{Ic.share} Share</button>
                <button onClick={exportGPX}>{Ic.gpx} GPX</button>
              </div>

              {result.source === "estimated" && <div style={{ marginTop: 14 }}><Reki mood="estimate" /></div>}

              <div className="turns">
                <div className="turns-head">Directions · {result.turns.length} steps</div>
                {result.turns.map((t, i) => (
                  <div key={i} className="turn" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                    <div className="ic">{turnIcon(t.type)}</div>
                    <div className="body">
                      <div className="road">{t.type === "start" ? "Depart" : t.type === "arrive" ? "Arrive at destination" : t.type === "left" ? "Turn left" : "Turn right"}</div>
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
          <button title="Zoom in" onClick={() => mapObj.current && mapObj.current.zoomIn()}>+</button>
          <button title="Zoom out" onClick={() => mapObj.current && mapObj.current.zoomOut()}>−</button>
        </div>
      </div>

      {/* click hint */}
      <div className="readout">
        <div className="coords mono">{!start ? "click map to set start" : !dest ? "click map to set destination" : `${BR.fmtKm(result ? result.dist : 0)} km route`}</div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<LiveApp />);
