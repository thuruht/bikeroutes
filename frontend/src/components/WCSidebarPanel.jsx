import { useState } from 'react'
import './WCSidebarPanel.css'

const VENUES = [
  { id: 'arrowhead', name: 'Arrowhead Stadium', icon: '⚽', coords: [-94.4839, 39.0489] },
  { id: 'union', name: 'Union Station', icon: '🚉', coords: [-94.5838, 39.0997] },
  { id: 'pnl', name: 'Power & Light', icon: '🎉', coords: [-94.5786, 39.0999] },
  { id: 'westbottoms', name: 'West Bottoms', icon: '🌉', coords: [-94.5950, 39.1020] },
  { id: 'berkley', name: 'Berkley Riverfront', icon: '🏞️', coords: [-94.5784, 39.1082] },
]

const ROUTE_PROFILES = [
  {
    id: 'fast',
    label: 'Fast & Direct',
    icon: '🛣️',
    options: { avoidRoads: false, pavedOnly: true, minimizeHills: false },
    filters: ['paved'],
  },
  {
    id: 'scenic',
    label: 'Trail & Scenic',
    icon: '🌿',
    options: { avoidRoads: true, pavedOnly: false, minimizeHills: true },
    filters: ['paved', 'gravel'],
  },
  {
    id: 'accessible',
    label: 'Accessible',
    icon: '♿',
    options: { avoidRoads: false, pavedOnly: true, minimizeHills: true },
    filters: ['paved'],
  },
]

const TIPS = [
  '🚲 Bike share stations near Arrowhead open on matchdays',
  '🚇 Shuttle buses run between Union Station and Arrowhead every 15 min',
  '🅿️ Driving? Consider parking at Union Station and biking the last mile',
  '🌡️ June/July in KC: bring water, expect 85–95°F',
]

export default function WCSidebarPanel({ onSetWaypoints, onSetRouteOptions, onSnapLocation, activeFilters, onToggleFilter }) {
  const [activeProfile, setActiveProfile] = useState('fast')
  const [tipsOpen, setTipsOpen] = useState(false)

  const handleVenueClick = (venue) => {
    // Set venue as B waypoint. If no A, snap to current location.
    onSetWaypoints(prev => {
      if (prev.length === 0) {
        // No A waypoint — snap to GPS then set B
        onSnapLocation()
        return [prev[0] || [-94.5786, 39.0997], venue.coords]
      } else if (prev.length === 1) {
        return [prev[0], venue.coords]
      } else {
        return [prev[0], venue.coords]
      }
    })
  }

  const handleProfileClick = (profile) => {
    setActiveProfile(profile.id)
    onSetRouteOptions(profile.options)
    // Set the filters to match the profile
    const desired = profile.filters
    const current = activeFilters || []
    // Turn off all, then turn on desired
    const all = ['paved', 'gravel', 'dirt', 'mtb']
    all.forEach(f => {
      if (desired.includes(f) && !current.includes(f)) onToggleFilter(f)
      if (!desired.includes(f) && current.includes(f)) onToggleFilter(f)
    })
  }

  return (
    <div className="wc-sidebar-panel animate-fade-in" id="wc-sidebar-panel">
      {/* Venue Quick-Select */}
      <div className="wc-panel-section">
        <h4 className="wc-panel-title">Quick Destinations</h4>
        <div className="wc-venue-grid">
          {VENUES.map(v => (
            <button
              key={v.id}
              className="wc-venue-btn"
              onClick={() => handleVenueClick(v)}
              title={v.name}
            >
              <span className="wc-venue-icon">{v.icon}</span>
              <span className="wc-venue-name">{v.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Route Profiles */}
      <div className="wc-panel-section">
        <h4 className="wc-panel-title">Route Profile</h4>
        <div className="wc-profile-chips">
          {ROUTE_PROFILES.map(p => (
            <button
              key={p.id}
              className={`wc-profile-chip ${activeProfile === p.id ? 'active' : ''}`}
              onClick={() => handleProfileClick(p)}
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Visitor Tips */}
      <div className="wc-panel-section">
        <button className="wc-tips-toggle" onClick={() => setTipsOpen(!tipsOpen)}>
          <span className="wc-tips-title">Visitor Tips</span>
          <span className={`wc-tips-chevron ${tipsOpen ? 'open' : ''}`}>▸</span>
        </button>
        {tipsOpen && (
          <div className="wc-tips-list animate-fade-in">
            {TIPS.map((tip, i) => (
              <div key={i} className="wc-tip-item">{tip}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
