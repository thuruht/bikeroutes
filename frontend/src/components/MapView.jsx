import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { buildMapStyle, DEFAULT_BASEMAP } from '../lib/basemaps'
import MapStyleSwitcher from './MapStyleSwitcher'
import './MapView.css'

// KC metro center
const DEFAULT_CENTER = [-94.5786, 39.0997]
const DEFAULT_ZOOM = 11

export default function MapView({ activeFilters, onRouteCalculated }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [activeBasemap, setActiveBasemap] = useState(DEFAULT_BASEMAP)
  const [activeOverlays, setActiveOverlays] = useState(['cycling_routes'])

  // Initialize map
  useEffect(() => {
    if (map.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: buildMapStyle(activeBasemap, activeOverlays),
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      maxZoom: 22,
      minZoom: 2,
      attributionControl: false,
    })

    // Attribution (bottom-left, minimal)
    map.current.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-left'
    )

    // Navigation controls
    map.current.addControl(
      new maplibregl.NavigationControl({ showCompass: true }),
      'bottom-right'
    )

    // Geolocation
    map.current.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'bottom-right'
    )

    // Scale
    map.current.addControl(
      new maplibregl.ScaleControl({ maxWidth: 120 }),
      'bottom-left'
    )

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Update map style when basemap or overlays change
  const handleBasemapChange = useCallback((key) => {
    setActiveBasemap(key)
    if (map.current) {
      map.current.setStyle(buildMapStyle(key, activeOverlays))
    }
  }, [activeOverlays])

  const handleOverlayToggle = useCallback((key) => {
    setActiveOverlays(prev => {
      const next = prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
      if (map.current) {
        map.current.setStyle(buildMapStyle(activeBasemap, next))
      }
      return next
    })
  }, [activeBasemap])

  return (
    <div className="map-container" id="map-container">
      <div ref={mapContainer} className="map-canvas" />

      {/* Basemap & overlay switcher */}
      <MapStyleSwitcher
        activeBasemap={activeBasemap}
        onBasemapChange={handleBasemapChange}
        activeOverlays={activeOverlays}
        onOverlayToggle={handleOverlayToggle}
      />

      {/* Reki watermark */}
      <div className="map-watermark">
        <img src="/reki.png" alt="" className="watermark-icon" width="20" height="20" />
        <span className="watermark-text">REKI SCOUTED THIS</span>
      </div>

      {/* Trail type legend */}
      <div className="map-legend glass">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: 'var(--paved)' }} />
          <span>Paved</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: 'var(--gravel)' }} />
          <span>Gravel</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: 'var(--dirt)' }} />
          <span>Dirt</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: 'var(--mtb)' }} />
          <span>MTB</span>
        </div>
      </div>
    </div>
  )
}
