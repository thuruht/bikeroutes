import { useState } from 'react'
import Header from './components/Header'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import CommunityView from './components/CommunityView'
import AboutView from './components/AboutView'
import WCContextBar from './components/WCContextBar'
import './App.css'

// Module-level flags (not localStorage — sandbox-safe)
let _wcAcknowledged = false

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeFilters, setActiveFilters] = useState(['paved', 'gravel', 'dirt', 'mtb'])
  const [routeInfo, setRouteInfo] = useState(null)
  const [waypoints, setWaypoints] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showDonate, setShowDonate] = useState(false)

  // Navigation Mode State
  const [routeOptions, setRouteOptions] = useState({
    minimizeHills: false,
    avoidRoads: false,
    pavedOnly: false
  })
  const [maneuvers, setManeuvers] = useState([])
  const [isNavigating, setIsNavigating] = useState(false)
  const [activeTab, setActiveTab] = useState('explore')

  // World Cup Mode State
  const [wcMode, setWcMode] = useState(false)
  const [wcAcknowledged, setWcAcknowledged] = useState(_wcAcknowledged)

  const toggleFilter = (filter) => {
    setActiveFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    )
  }

  const handleClearRoute = () => {
    setWaypoints([])
    setRouteInfo(null)
    setManeuvers([])
    setIsNavigating(false)
  }

  const handleSnapToLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser")
      return
    }

    navigator.geolocation.getCurrentPosition((position) => {
      const { longitude, latitude } = position.coords
      setWaypoints(prev => {
        // If there's already an A and B, just replace A
        if (prev.length >= 2) {
          return [[longitude, latitude], prev[1]]
        } else if (prev.length === 1) {
          // If there's one waypoint, just prepend as A
          return [[longitude, latitude], prev[0]]
        } else {
          // Empty waypoints
          return [[longitude, latitude]]
        }
      })
    }, (error) => {
      alert("Unable to retrieve your location: " + error.message)
    })
  }

  const handleToggleWcMode = () => {
    const next = !wcMode
    setWcMode(next)
    if (!wcAcknowledged) {
      _wcAcknowledged = true
      setWcAcknowledged(true)
    }
    // Default to "Fast & Direct" when activating
    if (next) {
      setRouteOptions({ avoidRoads: false, pavedOnly: true, minimizeHills: false })
      setActiveFilters(['paved'])
    }
  }

  // WCContextBar handlers
  const handleMatchDayRoutes = () => {
    setActiveTab('explore')
    // Set Arrowhead as B, snap GPS as A
    handleSnapToLocation()
    setTimeout(() => {
      setWaypoints(prev => {
        if (prev.length >= 1) return [prev[0], [-94.4839, 39.0489]]
        return [[-94.5786, 39.0997], [-94.4839, 39.0489]]
      })
    }, 500)
  }

  const handleTrailsForVisitors = () => {
    setActiveTab('explore')
    setRouteOptions({ avoidRoads: true, pavedOnly: false, minimizeHills: true })
    setActiveFilters(['paved', 'gravel'])
  }

  // WCLeaderboard "Try this route" handler
  const handleWcRouteSelect = (routeWaypoints) => {
    setWaypoints(routeWaypoints)
    if (!wcMode) handleToggleWcMode()
    setActiveTab('explore')
  }

  return (
    <>
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
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
      {activeTab === 'explore' ? (
        <main className={`app-layout ${sidebarOpen ? 'sidebar-open' : ''} ${isNavigating ? 'navigating' : ''}`}>
          <Sidebar
            isOpen={sidebarOpen}
            activeFilters={activeFilters}
            onToggleFilter={toggleFilter}
            routeInfo={routeInfo}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onClearRoute={handleClearRoute}
            routeOptions={routeOptions}
            setRouteOptions={setRouteOptions}
            maneuvers={maneuvers}
            isNavigating={isNavigating}
            setIsNavigating={setIsNavigating}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onSnapLocation={handleSnapToLocation}
            wcMode={wcMode}
            setWaypoints={setWaypoints}
          />
          <MapView
            activeFilters={activeFilters}
            onRouteCalculated={(info, newManeuvers) => {
              setRouteInfo(info)
              if (newManeuvers) setManeuvers(newManeuvers)
            }}
            waypoints={waypoints}
            setWaypoints={setWaypoints}
            routeOptions={routeOptions}
            isNavigating={isNavigating}
            wcMode={wcMode}
          />
        </main>
      ) : activeTab === 'community' ? (
        <CommunityView wcMode={wcMode} onWcRouteSelect={handleWcRouteSelect} />
      ) : (
        <AboutView />
      )}
      {showDonate && (
        <DonateBanner onClose={() => setShowDonate(false)} />
      )}
    </>
  )
}

export default App
