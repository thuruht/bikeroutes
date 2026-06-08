/* ============================================================
   app.jsx — compose the map-first homepage
   ============================================================ */
const { useState, useEffect, useMemo } = React;

function Toggle({ on, label, hint, onClick }) {
  return (
    <div className={"opt " + (on ? "on" : "")} onClick={onClick}>
      <div className="lbl">{label}{hint && <span className="hint">{hint}</span>}</div>
      <div className="switch" />
    </div>
  );
}

function pxToGeo(p) {
  if (!p) return null;
  const lon = -122.452 + (p[0] / 1600) * 0.272;
  const lat = 47.662 - (p[1] / 1000) * 0.122;
  return `${lat.toFixed(4)}° N  ${Math.abs(lon).toFixed(4)}° W`;
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("br-theme") || "light");
  const [mode, setMode] = useState("plan");
  const [pref, setPref] = useState("balanced");
  const [avoidTraffic, setAvoidTraffic] = useState(true);
  const [bikeLanes, setBikeLanes] = useState(true);
  const [surface, setSurface] = useState(false);
  const [highlight, setHighlight] = useState(null);
  const [scrubFrac, setScrubFrac] = useState(null);
  const [activeTrail, setActiveTrail] = useState("riverline");
  const [filter, setFilter] = useState("All");
  const [mapPt, setMapPt] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("br-theme", theme);
  }, [theme]);

  const route = ROUTES[pref];
  const scrub = (mode === "plan" && scrubFrac != null) ? pointAt(route.pts, scrubFrac) : null;
  const trail = TRAILS.find(t => t.id === activeTrail);
  const filteredTrails = TRAILS.filter(t => filter === "All" || t.surface === filter || (filter === "Easy" && t.diff === "Easy"));

  const coords = pxToGeo(mapPt) || "47.6097° N  122.3331° W";

  return (
    <div className="app">
      {/* MAP */}
      <div className="map-layer">
        <MapCanvas
          theme={theme}
          route={mode === "plan" ? route : null}
          gravelOn={surface && mode === "plan"}
          activeTrail={mode === "explore" ? trail : null}
          highlight={highlight}
          scrub={scrub}
          onMapPoint={setMapPt}
        />
      </div>

      {/* TOP BAR */}
      <div className="topbar">
        <div className="brand">
          <div className="mark">{I.bike}</div>
          <div>
            <div className="name">bikeroutes<span style={{ color: "var(--muted-txt)", fontWeight: 400 }}>.org</span></div>
            <div className="tag mono">open cycling maps</div>
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
          <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")} title="Light map">{I.sun}</button>
          <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")} title="Dark map">{I.moon}</button>
        </div>
        <button className="pillbtn solid">{I.plus}<span className="btn-label"> Add a route</span></button>
      </div>

      {/* PRIVACY BADGE (understated) */}
      <div className="privacy">
        <div className="ic">{I.lock}</div>
        <div className="txt">
          <b>No tracking, no ads.</b><br />
          <span className="mono">Open source · ODbL map data</span>
        </div>
      </div>

      {/* LEFT PANEL */}
      <div className="panel">
        <div className="modetabs">
          <button className={mode === "plan" ? "active" : ""} onClick={() => setMode("plan")}>Plan a route</button>
          <button className={mode === "explore" ? "active" : ""} onClick={() => setMode("explore")}>Explore nearby</button>
        </div>

        {mode === "plan" ? (
          <div className="panel-scroll">
            {/* from / to */}
            <div className="io">
              <div className="io-row">
                <span className="io-dot a" />
                <input defaultValue="Cedar Mill Greenway, Dock St" aria-label="Start" />
              </div>
              <div className="io-row">
                <span className="io-dot b" />
                <input defaultValue="Summit Vista Lookout" aria-label="Destination" />
              </div>
              <button className="io-swap" title="Swap">{I.swap}</button>
            </div>

            {/* preference */}
            <div className="seg-label">Route preference</div>
            <div className="seg">
              {[["balanced", "Balanced", "all-round"], ["quiet", "Quiet", "less traffic"], ["fast", "Fastest", "most direct"]].map(([k, t, s]) => (
                <button key={k} className={pref === k ? "active" : ""} onClick={() => setPref(k)}>
                  {t}<span className="sub">{s}</span>
                </button>
              ))}
            </div>

            {/* options */}
            <div className="opts">
              <Toggle on={avoidTraffic} label="Avoid busy roads" hint="Prefer low-traffic streets" onClick={() => setAvoidTraffic(v => !v)} />
              <Toggle on={bikeLanes} label="Prefer protected bike lanes" onClick={() => setBikeLanes(v => !v)} />
              <Toggle on={surface} label="Show surface type" hint="Highlight gravel segments on map" onClick={() => setSurface(v => !v)} />
            </div>

            <Summary route={route} />
            <Elevation route={route} onScrub={setScrubFrac} />

            <div className="actions">
              <button className={saved ? "primary" : ""} onClick={() => setSaved(s => !s)}>{I.save}{saved ? "Saved" : "Save"}</button>
              <button>{I.share} Share</button>
              <button>{I.gpx} GPX</button>
            </div>

            <Turns route={route} onHover={setHighlight} />
          </div>
        ) : (
          <div className="panel-scroll">
            <div className="explore-head">
              <h3>Trails near you</h3>
              <p>{TRAILS.length} routes within 6 km · sorted by distance</p>
            </div>
            <div className="chips">
              {["All", "Paved", "Gravel", "Mixed", "Trail"].map(c => (
                <button key={c} className={"chip " + (filter === c ? "active" : "")} onClick={() => setFilter(c)}>{c}</button>
              ))}
            </div>
            {filteredTrails.map(t => (
              <div key={t.id} className={"trail " + (activeTrail === t.id ? "active" : "")} onClick={() => setActiveTrail(t.id)}>
                <div className="spark"><Spark seed={t.seed} /></div>
                <div className="info">
                  <div className="nm">{t.name}</div>
                  <div className="sub mono">{t.dist} · {t.diff} · {t.near}</div>
                  <div className="tags">
                    {t.tags.map(([lbl, cls], i) => <span key={i} className={cls}>{lbl}</span>)}
                  </div>
                </div>
              </div>
            ))}
            {filteredTrails.length === 0 && (
              <div style={{ padding: "24px 8px", color: "var(--muted-txt)", fontSize: 13, textAlign: "center" }}>
                No {filter.toLowerCase()} trails nearby.
              </div>
            )}
          </div>
        )}
      </div>

      {/* MAP CONTROLS */}
      <div className="mapctl">
        <div className="zoomstack">
          <button title="Zoom in">+</button>
          <button title="Zoom out">−</button>
        </div>
      </div>

      {/* SCALE + COORDS */}
      <div className="readout">
        <div className="scalebar">
          <div className="bar" />
          <div className="lbl mono">1 km</div>
        </div>
        <div className="coords mono">{coords}</div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
