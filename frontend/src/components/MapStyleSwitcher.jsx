import { useState, useRef, useEffect } from 'react'
import { BASEMAPS, OVERLAYS, DEFAULT_BASEMAP } from '../lib/basemaps'
import './MapStyleSwitcher.css'

// Group basemaps by their group property
function groupBasemaps() {
  const groups = {}
  for (const [key, basemap] of Object.entries(BASEMAPS)) {
    const group = basemap.group || 'Other'
    if (!groups[group]) groups[group] = []
    groups[group].push({ key, ...basemap })
  }
  return groups
}

const GROUPED = groupBasemaps()

export default function MapStyleSwitcher({ activeBasemap, onBasemapChange, activeOverlays, onOverlayToggle }) {
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const current = BASEMAPS[activeBasemap] || BASEMAPS[DEFAULT_BASEMAP]

  return (
    <div className="map-style-switcher" ref={panelRef}>
      {/* Toggle button */}
      <button
        className="style-switcher-toggle glass"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change map style"
        id="map-style-toggle"
        title={`Map: ${current.label}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
          <polyline points="2 12 12 17 22 12"></polyline>
          <polyline points="2 17 12 22 22 17"></polyline>
        </svg>
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="style-switcher-panel glass-strong camo-bg animate-fade-in" id="map-style-panel">
          <div className="style-switcher-header">
            <h3>Map Style</h3>
            <button className="style-switcher-close" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          {/* Overlay toggles */}
          <div className="style-switcher-overlays">
            <span className="basemap-group-label">Overlays</span>
            <div className="overlay-items">
              {Object.entries(OVERLAYS).map(([key, overlay]) => (
                <button
                  key={key}
                  className={`overlay-item ${activeOverlays.includes(key) ? 'active' : ''}`}
                  onClick={() => onOverlayToggle(key)}
                  id={`overlay-${key}`}
                >
                  <span className="overlay-icon">{overlay.icon}</span>
                  <span className="overlay-label">{overlay.label}</span>
                  <span className={`overlay-toggle ${activeOverlays.includes(key) ? 'on' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Basemap groups */}
          <div className="style-switcher-basemaps">
            {Object.entries(GROUPED).map(([groupName, basemaps]) => (
              <div key={groupName} className="basemap-group">
                <span className="basemap-group-label">{groupName}</span>
                <div className="basemap-group-items">
                  {basemaps.map(({ key, label, icon }) => (
                    <button
                      key={key}
                      className={`basemap-item ${activeBasemap === key ? 'active' : ''}`}
                      onClick={() => { onBasemapChange(key); }}
                      id={`basemap-${key}`}
                      title={label}
                    >
                      <span className="basemap-icon">{icon}</span>
                      <span className="basemap-label">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
