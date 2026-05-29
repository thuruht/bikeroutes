import { useState } from 'react'
import Header from './components/Header'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import DonateBanner from './components/DonateBanner'
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
          <img src="/reki.png" alt="Reki" style={{ width: '100px', marginTop: '30px', opacity: 0.5 }} />
        </div>
      ) : (
        <div style={{ padding: '40px', color: 'var(--text-primary)', textAlign: 'center', marginTop: '100px', maxWidth: '600px', margin: '100px auto' }}>
          <h2>About BikeRoutes.org</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '20px', lineHeight: 1.6 }}>
            BikeRoutes.org is an open-source tactical routing platform designed for the US Midwest. 
            Powered by Valhalla and custom OSM extracts, we aim to provide the safest, most efficient 
            routing for cyclists traversing urban and rural terrain.
          </p>
          <p style={{ color: 'var(--text-muted)', marginTop: '20px', fontSize: '12px' }}>
            v0.1.0 (Alpha)
          </p>
        </div>
      )}
      {showDonate && (
        <DonateBanner onClose={() => setShowDonate(false)} />
      )}
    </>
  )
}

export default App
