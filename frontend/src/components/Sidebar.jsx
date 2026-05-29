import { useState } from 'react'
import './Sidebar.css'

const SURFACE_TYPES = [
  { id: 'paved', label: 'Paved', icon: '🛣️', color: 'var(--paved)' },
  { id: 'gravel', label: 'Gravel', icon: '🪨', color: 'var(--gravel)' },
  { id: 'dirt', label: 'Dirt', icon: '🌿', color: 'var(--dirt)' },
  { id: 'mtb', label: 'MTB', icon: '⚡', color: 'var(--mtb)' },
]

export default function Sidebar({
  isOpen,
  activeFilters,
  onToggleFilter,
  routeInfo,
  searchQuery,
  onSearchChange,
}) {
  const [searchFocused, setSearchFocused] = useState(false)

  return (
    <aside className={`sidebar glass camo-bg ${isOpen ? 'open' : 'closed'}`} id="sidebar">
      {/* Search */}
      <div className={`sidebar-search ${searchFocused ? 'focused' : ''}`}>
        <svg className="search-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M12 12l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder="Ask Reki... 'quiet trail near downtown'"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          id="trail-search-input"
        />
      </div>

      {/* Trail type filters */}
      <section className="sidebar-section">
        <h3 className="sidebar-section-title">
          <span>Trail Type</span>
          <span className="sticker" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>FILTER</span>
        </h3>
        <div className="filter-chips">
          {SURFACE_TYPES.map(({ id, label, icon, color }) => (
            <button
              key={id}
              className={`camo-chip ${activeFilters.includes(id) ? 'active' : ''}`}
              onClick={() => onToggleFilter(id)}
              id={`filter-${id}`}
              style={activeFilters.includes(id) ? { borderColor: color } : {}}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Route info (placeholder) */}
      <section className="sidebar-section">
        <h3 className="sidebar-section-title">Route Info</h3>
        {routeInfo ? (
          <div className="route-stats">
            <div className="stat">
              <span className="stat-value">{routeInfo.distance}</span>
              <span className="stat-label">Miles</span>
            </div>
            <div className="stat">
              <span className="stat-value">{routeInfo.elevation}</span>
              <span className="stat-label">ft Gain</span>
            </div>
            <div className="stat">
              <span className="stat-value">{routeInfo.time}</span>
              <span className="stat-label">Est. Time</span>
            </div>
          </div>
        ) : (
          <div className="route-empty">
            <span className="route-empty-icon">🦌</span>
            <p>Click the map to start a route.<br />
            <span className="route-empty-hint">Reki will scout the best path for you.</span></p>
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section className="sidebar-section">
        <h3 className="sidebar-section-title">Quick Actions</h3>
        <div className="quick-actions">
          <button className="action-btn" id="btn-gpx-export">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2M8 2v9M5 8l3 3 3-3"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export GPX
          </button>
          <button className="action-btn" id="btn-share-route">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="1.2"/>
              <circle cx="4" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/>
              <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M6 7l4-2M6 9l4 2" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            Share
          </button>
          <button className="action-btn" id="btn-clear-route">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Clear
          </button>
        </div>
      </section>

      {/* Footer */}
      <div className="sidebar-footer">
        <span className="blaze-badge">OPEN SOURCE</span>
        <span className="sidebar-version">v0.1.0-alpha</span>
      </div>
    </aside>
  )
}
