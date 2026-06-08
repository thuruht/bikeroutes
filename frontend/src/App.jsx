import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Reki from './components/Reki';
import GeoInput from './components/GeoInput';
import Summary from './components/Summary';
import Elevation from './components/Elevation';
import Turns from './components/Turns';
import { API, getRoute } from './lib/api';
import './App.css';

const I = {
  bike: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="17" r="3.4"/><circle cx="18" cy="17" r="3.4"/><path d="M6 17l3.5-7h5l-3 7M9.5 10l2-3.5h3"/><circle cx="14.5" cy="6.5" r="0.6" fill="currentColor"/></svg>,
  sun: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>,
  moon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>,
  swap: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4v16M7 4l-3 3M7 4l3 3M17 20V4M17 20l3-3M17 20l-3-3"/></svg>,
};

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("br-theme") || "dark");
  const [mode, setMode] = useState("plan");
  const [start, setStart] = useState(null);
  const [dest, setDest] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hoverPt, setHoverPt] = useState(null);

  const mapContainer = useRef(null);
  const mapObj = useRef(null);
  const markers = useRef({});

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("br-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (mapObj.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: { "base": { type: "raster", tiles: [theme === "dark" ? API.TILES.dark : API.TILES.light], tileSize: 256, attribution: API.TILES.attribution } },
        layers: [{ id: "base", type: "raster", source: "base", paint: theme === "dark" ? { "raster-opacity": 0.85, "raster-brightness-max": 0.8 } : {} }]
      },
      center: [API.HOME.lng, API.HOME.lat], zoom: API.HOME.zoom, attributionControl: false
    });
    map.on("load", () => {
      map.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "route-glow", type: "line", source: "route", paint: { "line-color": "#ff6b1a", "line-width": 8, "line-opacity": 0.25, "line-blur": 4 } });
      map.addLayer({ id: "route-line", type: "line", source: "route", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#ff6b1a", "line-width": 3.5 } });
    });
    mapObj.current = map;
  }, []);

  useEffect(() => {
    const map = mapObj.current; if (!map) return;
    ["start", "dest"].forEach(key => {
      const pt = key === "start" ? start : dest;
      if (markers.current[key]) markers.current[key].remove();
      if (pt) {
        const el = document.createElement("div"); el.className = "marker " + key;
        markers.current[key] = new maplibregl.Marker({ element: el }).setLngLat([pt.lng, pt.lat]).addTo(map);
      }
    });
  }, [start, dest]);

  useEffect(() => {
    if (!start || !dest) { setResult(null); return; }
    setLoading(true);
    getRoute(start, dest).then(res => {
      setResult(res); setLoading(false);
      if (mapObj.current && res.coords.length) {
        mapObj.current.getSource("route").setData({ type: "Feature", geometry: { type: "LineString", coordinates: res.coords } });
        const bounds = res.coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(res.coords[0], res.coords[0]));
        mapObj.current.fitBounds(bounds, { padding: 60, duration: 1000 });
      }
    });
  }, [start, dest]);

  return (
    <div className="app">
      <div className="map-layer" ref={mapContainer} />

      <div className="topbar">
        <div className="brand">
          <div className="mark"><img src="/reki_icon.png" style={{ height: 28 }} /></div>
          <div>
            <div className="name">bikeroutes<span style={{ color: "var(--muted-txt)", fontWeight: 400 }}>.org</span></div>
            <div className="tag mono">open cycling maps</div>
          </div>
        </div>
        <nav className="nav">
          <a href="#" className={mode === "plan" ? "active" : ""} onClick={(e) => { e.preventDefault(); setMode("plan"); }}>Plan</a>
          <a href="#" className={mode === "explore" ? "active" : ""} onClick={(e) => { e.preventDefault(); setMode("explore"); }}>Explore</a>
          <a href="#">Map data</a>
        </nav>
        <div className="spacer" />
        <div className="theme-toggle">
          <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>{I.sun}</button>
          <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>{I.moon}</button>
        </div>
        <button className="pillbtn solid">{I.plus}<span className="btn-label"> Add a route</span></button>
      </div>

      <div className="privacy">
        <div className="ic">{I.lock}</div>
        <div className="txt">
          <b>No tracking, no ads.</b><br />
          <span className="mono">Open source · ODbL map data</span>
        </div>
      </div>

      <div className="panel">
        <div className="modetabs">
          <button className={mode === "plan" ? "active" : ""} onClick={() => setMode("plan")}>Plan a route</button>
          <button className={mode === "explore" ? "active" : ""} onClick={() => setMode("explore")}>Explore nearby</button>
        </div>

        <div className="panel-scroll">
          {mode === "plan" ? (
            <>
              <div className="io">
                <GeoInput dotClass="a" value={start?.short} placeholder="Start location..." onPick={setStart} />
                <div className="io-swap" onClick={() => { const t = start; setStart(dest); setDest(t); }}>{I.swap}</div>
                <GeoInput dotClass="b" value={dest?.short} placeholder="Destination..." onPick={setDest} />
              </div>

              {!result && !loading && <div style={{ marginTop: 24 }}><Reki mood="empty" /></div>}
              {loading && <div style={{ marginTop: 24 }}><Reki mood="scout" /></div>}
              {result && (
                <div className="result-area">
                  <Summary route={result} />
                  <Elevation route={result} onScrub={setHoverPt} />
                  <Turns turns={result.turns} />
                  {result.source === "estimated" && <div style={{ marginTop: 14 }}><Reki mood="estimate" /></div>}
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: 20, textAlign: "center", color: "var(--muted-txt)" }}>
              <div style={{ marginBottom: 16 }}><Reki mood="empty" /></div>
              Explore mode coming soon to your region.
            </div>
          )}
        </div>

        <footer>
          <div className="links"><a href="#">Terms</a> · <a href="#">Privacy</a> · <a href="#">Donate</a></div>
          <div className="creds">© 2026 BikeRoutes.org contributors.</div>
        </footer>
      </div>
    </div>
  );
}

export default App;
