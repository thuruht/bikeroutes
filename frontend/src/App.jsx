import React, { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Reki from './components/Reki';
import GeoInput from './components/GeoInput';
import Elevation from './components/Elevation';
import Summary from './components/Summary';
import Turns from './components/Turns';
import { API, getRoute } from './lib/api';
import './App.css';

/* ---- icons ---- */
const Ic = {
  bike: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="17" r="3.2"/><circle cx="18" cy="17" r="3.2"/><path d="M6 17l4-8h6l-3 8M10 9l-1.5-3H6"/><circle cx="14.5" cy="6" r="1"/></svg>,
  swap: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4v13M7 4L4 7M7 4l3 3M17 20V7M17 20l3-3M17 20l-3-3"/></svg>,
  sun: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>,
  moon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z"/></svg>,
};

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("br-theme") || "dark");
  const [pref, setPref] = useState("balanced");
  const [start, setStart] = useState(null);
  const [dest, setDest] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hoverPt, setHoverPt] = useState(null);
  const [setNext, setSetNext] = useState("start");

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
        sources: {
          "base": {
            type: "raster",
            tiles: [theme === "dark" ? API.TILES.dark : API.TILES.light],
            tileSize: 256,
            attribution: API.TILES.attribution
          }
        },
        layers: [
          { id: "base", type: "raster", source: "base", paint: theme === "dark" ? { "raster-opacity": 0.85 } : {} }
        ]
      },
      center: [API.HOME.lng, API.HOME.lat],
      zoom: API.HOME.zoom,
      attributionControl: false
    });

    map.on("load", () => {
      map.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "route-glow", type: "line", source: "route", paint: { "line-color": "#ff6b1a", "line-width": 8, "line-opacity": 0.25, "line-blur": 4 } });
      map.addLayer({ id: "route-line", type: "line", source: "route", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#ff6b1a", "line-width": 3.5 } });
      map.addSource("hover", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "hover-pt", type: "circle", source: "hover", paint: { "circle-radius": 6, "circle-color": "#fff", "circle-stroke-color": "#ff6b1a", "circle-stroke-width": 2 } });
    });

    map.on("click", (e) => {
      const pt = { lng: e.lngLat.lng, lat: e.lngLat.lat, short: "Dropped Pin" };
      if (setNext === "start") setStart(pt); else setDest(pt);
      setSetNext(prev => prev === "start" ? "dest" : "start");
    });

    mapObj.current = map;
  }, []);

  useEffect(() => {
    const map = mapObj.current;
    if (!map) return;
    ["start", "dest"].forEach(key => {
      const pt = key === "start" ? start : dest;
      if (markers.current[key]) markers.current[key].remove();
      if (pt) {
        const el = document.createElement("div");
        el.className = "marker " + key;
        markers.current[key] = new maplibregl.Marker({ element: el }).setLngLat([pt.lng, pt.lat]).addTo(map);
      }
    });
  }, [start, dest]);

  useEffect(() => {
    if (!start || !dest) { setResult(null); return; }
    setLoading(true);
    getRoute(start, dest, pref).then(res => {
      setResult(res);
      setLoading(false);
      if (mapObj.current && res.coords.length) {
        mapObj.current.getSource("route").setData({ type: "Feature", geometry: { type: "LineString", coordinates: res.coords } });
        const bounds = res.coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(res.coords[0], res.coords[0]));
        mapObj.current.fitBounds(bounds, { padding: 60, duration: 1000 });
      }
    });
  }, [start, dest, pref]);

  useEffect(() => {
    if (mapObj.current && mapObj.current.getSource("hover")) {
      mapObj.current.getSource("hover").setData(hoverPt ? { type: "Feature", geometry: { type: "Point", coordinates: [hoverPt.lng || hoverPt[0], hoverPt.lat || hoverPt[1]] } } : { type: "FeatureCollection", features: [] });
    }
  }, [hoverPt]);

  return (
    <>
      <div id="tentacles" ref={(el) => { if (el && !el.children.length) { for (let i = 0; i < 20; i++) { const s = document.createElement("span"); s.className = "tentacle"; s.style.setProperty("--x", Math.random() * 100 + "%"); s.style.setProperty("--len", 30 + Math.random() * 45 + "vh"); s.style.setProperty("--rot", 3 + Math.random() * 10 + "deg"); s.style.setProperty("--dur", 4 + Math.random() * 5 + "s"); s.style.opacity = 0.3 + Math.random() * 0.5; el.appendChild(s); } } }} />
      <div className="app">
        <div className="panel">
          <header>
            <div className="logo"><span className="icon">🦌</span><span className="name">bikeroutes.org</span></div>
            <button className="theme-toggle" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>{theme === "dark" ? Ic.sun : Ic.moon}</button>
          </header>
          <main>
            <div className="io">
              <GeoInput dotClass="start" value={start?.short} placeholder="Start location..." onPick={setStart} />
              <button className="swap" onClick={() => { const t = start; setStart(dest); setDest(t); }}>{Ic.swap}</button>
              <GeoInput dotClass="dest" value={dest?.short} placeholder="Destination..." onPick={setDest} />
            </div>
            <div className="prefs">
              {["balanced", "quiet", "fast"].map(p => (
                <button key={p} className={pref === p ? "active" : ""} onClick={() => setPref(p)}>{p.charAt(0).toUpperCase() + p.slice(1)}</button>
              ))}
            </div>
            {!result && !loading && <div style={{ marginTop: 16 }}><Reki mood="empty" /></div>}
            {loading && <div style={{ marginTop: 16 }}><Reki mood="scout" /></div>}
            {result && (
              <div className="result-area">
                <Summary route={result} />
                <Elevation route={result} onScrub={setHoverPt} />
                <Turns turns={result.turns} onHover={setHoverPt} />
                {result.source === "estimated" && <div style={{ marginTop: 14 }}><Reki mood="estimate" /></div>}
              </div>
            )}
          </main>
          <footer>
            <div className="links"><a href="#">About</a> · <a href="#">Community</a> · <a href="#">Donate</a></div>
            <div className="creds">Open source routing for the Midwest.</div>
          </footer>
        </div>
        <div className="map-wrap" ref={mapContainer} />
      </div>
    </>
  );
}

export default App;
