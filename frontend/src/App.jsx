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
  const [searchQuery, setSearchQuery] = useState('')
  const [showDonate, setShowDonate] = useState(false)

  const toggleFilter = (filter) => {
    setActiveFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    )
  }

  return (
    <>
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onDonateClick={() => setShowDonate(true)}
      />
      <main className="app-layout">
        <Sidebar
          isOpen={sidebarOpen}
          activeFilters={activeFilters}
          onToggleFilter={toggleFilter}
          routeInfo={routeInfo}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <MapView
          activeFilters={activeFilters}
          onRouteCalculated={setRouteInfo}
        />
      </main>
      {showDonate && (
        <DonateBanner onClose={() => setShowDonate(false)} />
      )}
    </>
  )
}

export default App
