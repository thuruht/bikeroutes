import { useState } from 'react'
import Header from './components/Header'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import AboutView from './components/AboutView'
import './App.css'

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

  return (
    <>
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onDonateClick={() => setShowDonate(true)}
      />
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
          />
        </main>
      ) : activeTab === 'community' ? (
        <div style={{ padding: '40px', color: 'var(--text-primary)', textAlign: 'center', marginTop: '100px' }}>
          <h2>Community Routes</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '20px' }}>
            Leaderboards and curated user routes are coming soon!
          </p>
          <img src="/reki_icon.png" alt="Reki" style={{ width: '100px', marginTop: '30px', opacity: 0.5 }} />
        </div>
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
