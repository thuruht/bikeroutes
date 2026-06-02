import { useState, useRef, useEffect } from 'react'
import { BASEMAPS, OVERLAYS, DEFAULT_BASEMAP } from '../lib/basemaps'
import styles from './MapStyleSwitcher.module.css'

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
    <div className={styles.mapStyleSwitcher} ref={panelRef}>
      {/* Toggle button */}
      <button
        className={`${styles.styleSwitcherToggle} glass`}
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
        <div className={`${styles.styleSwitcherPanel} glass-strong camo-bg animate-fade-in`} id="map-style-panel">
          <div className={styles.styleSwitcherHeader}>
            <h3>Map Style</h3>
            <button type="button" className={styles.styleSwitcherClose} onClick={() => setIsOpen(false)}>✕</button>
          </div>

          {/* Overlay toggles */}
          <div className={styles.styleSwitcherOverlays}>
            <span className={styles.basemapGroupLabel}>Overlays</span>
            <div className={styles.overlayItems}>
              {Object.entries(OVERLAYS).map(([key, overlay]) => (
                <button
                  key={key}
                  className={`${styles.overlayItem} ${activeOverlays.includes(key) ? styles.active : ''}`}
                  onClick={() => onOverlayToggle(key)}
                  id={`overlay-${key}`}
                >
                  <span className="overlay-icon">{overlay.icon}</span>
                  <span className={styles.overlayLabel}>{overlay.label}</span>
                  <span className={`${styles.overlayToggle} ${activeOverlays.includes(key) ? styles.on : ''}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Basemap groups */}
          <div className={styles.styleSwitcherBasemaps}>
            {Object.entries(GROUPED).map(([groupName, basemaps]) => (
              <div key={groupName} className="basemap-group">
                <span className={styles.basemapGroupLabel}>{groupName}</span>
                <div className={styles.basemapGroupItems}>
                  {basemaps.map(({ key, label, icon }) => (
                    <button
                      key={key}
                      className={`${styles.basemapItem} ${activeBasemap === key ? styles.active : ''}`}
                      onClick={() => { onBasemapChange(key); }}
                      id={`basemap-${key}`}
                      title={label}
                    >
                      <span className={styles.basemapIcon}>{icon}</span>
                      <span className={styles.basemapLabel}>{label}</span>
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
