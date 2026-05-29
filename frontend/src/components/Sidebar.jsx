import { useState } from 'react'
import './Sidebar.css'

const SURFACE_TYPES = [
  { id: 'paved', label: 'Paved', icon: '◆', color: 'var(--paved)' },
  { id: 'gravel', label: 'Gravel', icon: '◆', color: 'var(--gravel)' },
  { id: 'dirt', label: 'Dirt', icon: '◆', color: 'var(--dirt)' },
  { id: 'mtb', label: 'MTB', icon: '◆', color: 'var(--mtb)' },
]

function TurnByTurnList({ maneuvers }) {
  if (!maneuvers || maneuvers.length === 0) return null;
  return (
    <div className="tbt-list">
      {maneuvers.map((m, i) => (
        <div key={i} className="tbt-item">
          <div className="tbt-icon">
            {m.type === 10 ? '➡️' : m.type === 9 ? '⬅️' : m.type === 6 ? '🏁' : '⬆️'}
          </div>
          <div className="tbt-details">
            <span className="tbt-instruction">{m.instruction}</span>
            {m.length > 0 && <span className="tbt-distance">{(m.length * 0.621371).toFixed(2)} mi</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Sidebar({
  isOpen,
  activeFilters,
  onToggleFilter,
  routeInfo,
  searchQuery,
  onSearchChange,
  onClearRoute,
  routeOptions,
  setRouteOptions,
  maneuvers,
  isNavigating,
  setIsNavigating
}) {
  const [searchFocused, setSearchFocused] = useState(false)

  const toggleOption = (key) => {
    setRouteOptions(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <aside className={`sidebar glass camo-bg ${isOpen ? 'open' : 'closed'} ${isNavigating ? 'navigating-mode' : ''}`} id="sidebar">
      
      <div className="sidebar-scrollable-content">
        {/* Search & Surface Filters are hidden in Nav Mode */}
        {!isNavigating && (
          <>
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

            {/* Route Options */}
            <section className="sidebar-section">
              <div className="section-header">
                <h3 className="section-title">Route Options</h3>
              </div>
              <div className="route-options">
                <label className="toggle-label">
                  <input type="checkbox" checked={routeOptions.minimizeHills} onChange={() => toggleOption('minimizeHills')} />
                  Minimize Hills
                </label>
                <label className="toggle-label">
                  <input type="checkbox" checked={routeOptions.avoidRoads} onChange={() => toggleOption('avoidRoads')} />
                  Avoid Roads
                </label>
                <label className="toggle-label">
                  <input type="checkbox" checked={routeOptions.pavedOnly} onChange={() => toggleOption('pavedOnly')} />
                  Paved Only
                </label>
              </div>
            </section>
          </>
        )}

        {/* Route info */}
        <section className="sidebar-section">
          <div className="section-header">
            <h3 className="section-title">{isNavigating ? 'Active Ride' : 'Route'}</h3>
            {routeInfo && !isNavigating && <span className="blaze-badge">SCOUTED</span>}
            {isNavigating && <span className="blaze-badge" style={{backgroundColor: 'var(--accent)', color: '#000'}}>LIVE</span>}
          </div>
          {routeInfo ? (
            <>
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
              {isNavigating && <TurnByTurnList maneuvers={maneuvers} />}
            </>
          ) : (
            <div className="route-empty">
              <div className="route-empty-content">
                <img src="/reki.png" alt="Reki" className="route-empty-icon" width="40" height="40" />
                <div>
                  <p className="route-empty-text">Click the map to start a route</p>
                  <p className="route-empty-hint">Reki scouts the best path for you</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Actions */}
      <section className="sidebar-section mt-auto">
        {routeInfo && !isNavigating && (
          <button className="action-btn primary full-width mb-sm" onClick={() => setIsNavigating(true)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M14 8L3 14V2l11 6z"/>
            </svg>
            <span style={{fontWeight: 'bold', letterSpacing: '1px'}}>START RIDE</span>
          </button>
        )}
        {isNavigating && (
          <button className="action-btn destructive full-width mb-sm" onClick={() => setIsNavigating(false)}>
            <span style={{fontWeight: 'bold'}}>END RIDE</span>
          </button>
        )}
        {!isNavigating && (
          <div className="action-grid">
            <button className="action-btn" id="btn-gpx-export">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2M8 2v9M5 8l3 3 3-3"
                  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>GPX</span>
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
            <button className="action-btn destructive" id="btn-clear-route" onClick={onClearRoute}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <span>Clear</span>
            </button>
          </div>
        )}
      </section>

      {/* Footer */}
      {!isNavigating && (
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
      )}
    </aside>
  )
}
