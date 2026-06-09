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

// Module-level flags (not localStorage — sandbox-safe)
let _wcAcknowledged = false

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

  // Navigation Mode State
  const [routeOptions, setRouteOptions] = useState({
    minimizeHills: false,
    avoidRoads: false,
    pavedOnly: false
  })
  const [isNavigating, setIsNavigating] = useState(false)

  // World Cup Mode State
  const [wcMode, setWcMode] = useState(false)
  const [wcAcknowledged, setWcAcknowledged] = useState(_wcAcknowledged)
  const [activeOverlays, setActiveOverlays] = useState(['cycling_routes', 'marc_bikeways', 'marc_restrooms', 'marc_bikehubs'])

  const toggleFilter = useCallback((filter) => {
    setActiveFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    )
  }, [])

  const handleClearRoute = useCallback(() => {
    setWaypoints([])
    setRouteInfo(null)
    setRouteGeoJSON(null)
    setIsNavigating(false)
  }, [])

  const handleRouteCalculated = useCallback((info, _maneuvers, geojson) => {
    setRouteInfo(info)
    if (geojson) setRouteGeoJSON(geojson)
  }, [])

  const handleSnapToLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser")
      return
    }

    navigator.geolocation.getCurrentPosition((position) => {
      const { longitude, latitude } = position.coords
      setWaypoints(prev => {
        if (prev.length >= 2) {
          return [[longitude, latitude], prev[1]]
        } else if (prev.length === 1) {
          return [[longitude, latitude], prev[0]]
        } else {
          return [[longitude, latitude]]
        }
      })
    }, (error) => {
      alert("Unable to retrieve your location: " + error.message)
    })
  }, [])

  const handleToggleWcMode = () => {
    const next = !wcMode
    setWcMode(next)
    if (!wcAcknowledged) {
      _wcAcknowledged = true
      setWcAcknowledged(true)
    }
    if (next) {
      setRouteOptions({ avoidRoads: false, pavedOnly: true, minimizeHills: false })
      setActiveFilters(['paved'])
    }
  }

  const handleMatchDayRoutes = () => {
    setView('planner')
    handleSnapToLocation()
    setTimeout(() => {
      setWaypoints(prev => {
        if (prev.length >= 1) return [prev[0], [-94.4839, 39.0489]]
        return [[-94.5786, 39.0997], [-94.4839, 39.0489]]
      })
    }, 500)
  }

  const handleTrailsForVisitors = () => {
    setView('planner')
    setRouteOptions({ avoidRoads: true, pavedOnly: false, minimizeHills: true })
    setActiveFilters(['paved', 'gravel'])
  }

  const handleWcRouteSelect = (routeWaypoints) => {
    setWaypoints(routeWaypoints)
    if (!wcMode) handleToggleWcMode()
    setView('planner')
  }

  const handleSearch = async (query) => {
    if (!query) {
      setSearchResults(null)
      return
    }
    setIsSearching(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&bounded=1&viewbox=-102.0,40.6,-89.0,36.0`)
      const data = await res.json()

      setSearchResults({
        query,
        reki_says: data.length > 0
          ? `🦌 Reki scouted ${data.length} spots for you!`
          : "🦌 Hmm, Reki hasn't explored that area yet. Try different words?",
        results: data.map(item => ({
          id: item.place_id,
          name: item.display_name.split(',')[0],
          description: item.display_name,
          coords: [parseFloat(item.lon), parseFloat(item.lat)]
        }))
      })
    } catch (err) {
      console.error(err)
      setSearchResults({ error: true, reki_says: "Reki got distracted by a butterfly. Try again. 🦋🦌" })
    } finally {
      setIsSearching(false)
    }
  }

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

export default App
