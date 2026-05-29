import { useState } from 'react'
import './Sidebar.css'

const SURFACE_TYPES = [
  { id: 'paved', label: 'Paved', icon: '◆', color: 'var(--paved)' },
  { id: 'gravel', label: 'Gravel', icon: '◆', color: 'var(--gravel)' },
  { id: 'dirt', label: 'Dirt', icon: '◆', color: 'var(--dirt)' },
  { id: 'mtb', label: 'MTB', icon: '◆', color: 'var(--mtb)' },
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
        <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder='Search trails... "quiet riverside path"'
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          id="trail-search-input"
        />
        <kbd className="search-kbd">⌘K</kbd>
      </div>

      {/* Trail type filters */}
      <section className="sidebar-section">
        <div className="section-header">
          <h3 className="section-title">Surface</h3>
          <span className="section-count">{activeFilters.length}/4</span>
        </div>
        <div className="filter-chips">
          {SURFACE_TYPES.map(({ id, label, icon, color }) => (
            <button
              key={id}
              className={`camo-chip ${activeFilters.includes(id) ? 'active' : ''}`}
              onClick={() => onToggleFilter(id)}
              id={`filter-${id}`}
            >
              <span style={{ color: activeFilters.includes(id) ? color : 'inherit', fontSize: '0.6rem' }}>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Route info */}
      <section className="sidebar-section">
        <div className="section-header">
          <h3 className="section-title">Route</h3>
          {routeInfo && <span className="blaze-badge">ACTIVE</span>}
        </div>
        {routeInfo ? (
          <div className="route-stats">
            <div className="stat">
              <span className="stat-value">{routeInfo.distance}</span>
              <span className="stat-label">mi</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value">{routeInfo.elevation}</span>
              <span className="stat-label">ft ↑</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value">{routeInfo.time}</span>
              <span className="stat-label">est</span>
            </div>
          </div>
        ) : (
          <div className="route-empty">
            <div className="route-empty-content">
              <span className="route-empty-icon">🦌</span>
              <div>
                <p className="route-empty-text">Click the map to start a route</p>
                <p className="route-empty-hint">Reki scouts the best path for you</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Actions */}
      <section className="sidebar-section">
        <div className="section-header">
          <h3 className="section-title">Actions</h3>
        </div>
        <div className="action-grid">
          <button className="action-btn" id="btn-gpx-export">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2M8 2v9M5 8l3 3 3-3"
                stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Export GPX</span>
          </button>
          <button className="action-btn" id="btn-share-route">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="12" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <circle cx="4" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <circle cx="12" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M5.5 7.2l5-2.4M5.5 8.8l5 2.4" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            <span>Share</span>
          </button>
          <button className="action-btn" id="btn-elevation">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M1 13l4-6 3 3 4-7 3 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Elevation</span>
          </button>
          <button className="action-btn destructive" id="btn-clear-route">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <span>Clear</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-left">
          <span className="blaze-badge">OPEN SOURCE</span>
          <span className="sidebar-version">v0.1.0</span>
        </div>
        <a href="https://github.com/bikeroutes" className="sidebar-github" target="_blank" rel="noopener">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
        </a>
      </div>
    </aside>
  )
}
