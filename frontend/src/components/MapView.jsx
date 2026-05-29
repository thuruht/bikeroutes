import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './MapView.css'

// KC metro center
const DEFAULT_CENTER = [-94.5786, 39.0997]
const DEFAULT_ZOOM = 11

export default function MapView({ activeFilters, onRouteCalculated }) {
  const mapContainer = useRef(null)
  const map = useRef(null)

  useEffect(() => {
    if (map.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        name: 'BikeRoutes Dark',
        sources: {
          'osm-raster': {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
        },
        layers: [
          {
            id: 'osm-raster-layer',
            type: 'raster',
            source: 'osm-raster',
            paint: {
              // Dark punk filter — desaturate & darken the tiles
              'raster-brightness-max': 0.45,
              'raster-brightness-min': 0.02,
              'raster-saturation': -0.6,
              'raster-contrast': 0.3,
            },
          },
        ],
      },
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      maxZoom: 18,
      minZoom: 4,
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

  return (
    <div className="map-container" id="map-container">
      <div ref={mapContainer} className="map-canvas" />
      {/* Reki watermark */}
      <div className="map-watermark">
        <span className="watermark-icon">🦌</span>
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
