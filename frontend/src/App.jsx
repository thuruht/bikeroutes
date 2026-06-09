import { useState, useCallback, useEffect } from 'react'
import ShellLayout from './components/ShellLayout'
import LandingView from './components/LandingView'
import Header from './components/Header'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import CommunityView from './components/CommunityView'
import AboutView from './components/AboutView'
import FulfillmentView from './components/FulfillmentView'
import WCContextBar from './components/WCContextBar'
import DonateBanner from './components/DonateBanner'
import './App.css'

function App() {
  const [view, setView] = useState('landing')
  const [activeFilters, setActiveFilters] = useState(['paved', 'gravel', 'dirt', 'mtb'])
  const [routeInfo, setRouteInfo] = useState(null)
  const [routeGeoJSON, setRouteGeoJSON] = useState(null)
  const [waypoints, setWaypoints] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showDonate, setShowDonate] = useState(false)
  const [routeOptions, setRouteOptions] = useState({ pavedOnly: false, avoidRoads: false })
  const [isNavigating, setIsNavigating] = useState(false)

  // World Cup Mode State
  const [wcMode, setWcMode] = useState(false)
  const [wcAcknowledged, setWcAcknowledged] = useState(false)
  const [activeOverlays, setActiveOverlays] = useState(['cycling_routes', 'marc_bikeways', 'marc_restrooms', 'marc_bikehubs'])

  // Theme
  const [theme, setTheme] = useState(() => localStorage.getItem('br-theme') || 'dark')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('br-theme', theme)
  }, [theme])
  const handleToggleTheme = useCallback((t) => setTheme(t), [])

  // Handlers
  const handleRouteCalculated = useCallback((info, geojson) => {
    setRouteInfo(info)
    setRouteGeoJSON(geojson)
  }, [])

  const toggleFilter = useCallback((filter) => {
    setActiveFilters(prev =>
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    )
  }, [])

  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
  }, [])

  const handleClearRoute = useCallback(() => {
    setRouteInfo(null)
    setRouteGeoJSON(null)
    setWaypoints([])
  }, [])

  const handleSnapToLocation = useCallback(() => {}, [])

  const handleToggleWcMode = useCallback(() => {
    setWcMode(prev => !prev)
    if (!wcAcknowledged) setWcAcknowledged(true)
  }, [wcAcknowledged])

  const handleMatchDayRoutes = useCallback(() => {}, [])
  const handleTrailsForVisitors = useCallback(() => {}, [])
  const handleWcRouteSelect = useCallback(() => {}, [])

  return (
    <ShellLayout>
      {view === 'landing' ? (
        <div className="content-view">
          <LandingView
            onOpenPlanner={() => setView('planner')}
            onAboutClick={() => setView('about')}
          />
        </div>
      ) : (
        <>
          <Header
            activeTab={view === 'planner' ? 'explore' : view}
            onTabChange={(tab) => setView(tab === 'explore' ? 'planner' : tab)}
            onDonateClick={() => setShowDonate(true)}
            wcMode={wcMode}
            wcAcknowledged={wcAcknowledged}
            onToggleWcMode={handleToggleWcMode}
            theme={theme}
            onToggleTheme={handleToggleTheme}
          />
          {wcMode && (
            <WCContextBar
              onMatchDayRoutes={handleMatchDayRoutes}
              onTrailsForVisitors={handleTrailsForVisitors}
              onExit={() => setWcMode(false)}
            />
          )}
          {view === 'planner' ? (
            <>
              <MapView
                activeFilters={activeFilters}
                onRouteCalculated={handleRouteCalculated}
                waypoints={waypoints}
                setWaypoints={setWaypoints}
                routeOptions={routeOptions}
                isNavigating={isNavigating}
                wcMode={wcMode}
              />
              <Sidebar
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
                onSnapLocation={handleSnapToLocation}
                wcMode={wcMode}
                setWaypoints={setWaypoints}
              />
            </>
          ) : view === 'community' ? (
            <div className="content-view">
              <CommunityView wcMode={wcMode} onWcRouteSelect={handleWcRouteSelect} />
            </div>
          ) : view === 'about' ? (
            <div className="content-view">
              <AboutView onFulfillmentClick={() => setView('fulfillment')} />
            </div>
          ) : (
            <div className="content-view">
              <FulfillmentView onBack={() => setView('about')} />
            </div>
          )}
        </>
      )}
      {showDonate && (
        <DonateBanner
          onClose={() => setShowDonate(false)}
          onFulfillmentClick={() => { setShowDonate(false); setView('fulfillment') }}
        />
      )}
    </ShellLayout>
  )
}

export default App
