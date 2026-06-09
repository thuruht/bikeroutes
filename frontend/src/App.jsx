import { useState, useCallback } from 'react'
import ShellLayout from './components/ShellLayout'
import LandingView from './components/LandingView'
import PlannerView from './components/PlannerView'
import Header from './components/Header'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import CommunityView from './components/CommunityView'
import AboutView from './components/AboutView'
import FulfillmentView from './components/FulfillmentView'
import WCContextBar from './components/WCContextBar'
import DonateBanner from './components/DonateBanner'
import './App.css'

/* ---- icons ---- */
const Ic = {
  bike: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="17" r="3.2"/><circle cx="18" cy="17" r="3.2"/><path d="M6 17l4-8h6l-3 8M10 9l-1.5-3H6"/><circle cx="14.5" cy="6" r="1"/></svg>,
  swap: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4v13M7 4L4 7M7 4l3 3M17 20V7M17 20l3-3M17 20l-3-3"/></svg>,
  sun: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>,
  moon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z"/></svg>,
};

function App() {
  const [view, setView] = useState('landing') // 'landing' | 'planner' | 'community' | 'about' | 'fulfillment'
  const [activeFilters, setActiveFilters] = useState(['paved', 'gravel', 'dirt', 'mtb'])
  const [routeInfo, setRouteInfo] = useState(null)
  const [routeGeoJSON, setRouteGeoJSON] = useState(null)
  const [waypoints, setWaypoints] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showDonate, setShowDonate] = useState(false)

  const mapContainer = useRef(null);
  const mapObj = useRef(null);
  const markers = useRef({});

  // World Cup Mode State
  const [wcMode, setWcMode] = useState(false)
  const [wcAcknowledged, setWcAcknowledged] = useState(_wcAcknowledged)
  const [activeOverlays, setActiveOverlays] = useState(['cycling_routes', 'marc_bikeways', 'marc_restrooms', 'marc_bikehubs'])

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
    <ShellLayout>
      {view === 'landing' ? (
        <LandingView 
          onOpenPlanner={() => setView('planner')} 
          onAboutClick={() => setView('about')}
        />
      ) : (
        <>
          <Header
            activeTab={view === 'planner' ? 'explore' : view}
            onTabChange={(tab) => setView(tab === 'explore' ? 'planner' : tab)}
            onToggleSidebar={() => {}} // Legacy
            onDonateClick={() => setShowDonate(true)}
            wcMode={wcMode}
            wcAcknowledged={wcAcknowledged}
            onToggleWcMode={handleToggleWcMode}
          />
          {wcMode && (
            <WCContextBar
              onMatchDayRoutes={handleMatchDayRoutes}
              onTrailsForVisitors={handleTrailsForVisitors}
              onExit={() => setWcMode(false)}
            />
          )}
          {view === 'planner' ? (
            <PlannerView
              hasBanner={wcMode}
              leftColumn={
                <Sidebar
                  isOpen={true}
                  activeFilters={activeFilters}
                  onToggleFilter={toggleFilter}
                  routeInfo={routeInfo}
                  routeGeoJSON={routeGeoJSON}
                  waypoints={waypoints}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onSearchSubmit={handleSearch}
                  searchResults={searchResults}
                  isSearching={isSearching}
                  onClearRoute={handleClearRoute}
                  routeOptions={routeOptions}
                  setRouteOptions={setRouteOptions}
                  isNavigating={isNavigating}
                  setIsNavigating={setIsNavigating}
                  activeTab="explore"
                  onTabChange={() => {}}
                  onSnapLocation={handleSnapToLocation}
                  wcMode={wcMode}
                  setWaypoints={setWaypoints}
                />
              }
              rightColumn={
                <MapView
                  activeFilters={activeFilters}
                  onRouteCalculated={handleRouteCalculated}
                  waypoints={waypoints}
                  setWaypoints={setWaypoints}
                  routeOptions={routeOptions}
                  isNavigating={isNavigating}
                  wcMode={wcMode}
                />
              }
            />
          ) : view === 'community' ? (
            <CommunityView wcMode={wcMode} onWcRouteSelect={handleWcRouteSelect} />
          ) : view === 'about' ? (
            <AboutView onFulfillmentClick={() => setView('fulfillment')} />
          ) : (
            <FulfillmentView onBack={() => setView('about')} />
          )}
        </>
      )}
      {showDonate && (
        <DonateBanner 
          onClose={() => setShowDonate(false)} 
          onFulfillmentClick={() => { setShowDonate(false); setView('fulfillment'); }}
        />
      )}
    </ShellLayout>
  )
}

export default App;
