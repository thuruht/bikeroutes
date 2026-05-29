import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { buildMapStyle, DEFAULT_BASEMAP } from '../lib/basemaps'
import MapStyleSwitcher from './MapStyleSwitcher'
import './MapView.css'

// KC metro center
const DEFAULT_CENTER = [-94.5786, 39.0997]
const DEFAULT_ZOOM = 11

export default function MapView({ activeFilters, onRouteCalculated, waypoints, setWaypoints }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [activeBasemap, setActiveBasemap] = useState(DEFAULT_BASEMAP)
  const [activeOverlays, setActiveOverlays] = useState(['cycling_routes'])

  const markersRef = useRef([])

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

    map.current.on('load', () => {
      // Add empty route source & glowing layers
      map.current.addSource('route-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })

      // Outer glow
      map.current.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': 'var(--accent)',
          'line-width': 12,
          'line-opacity': 0.3,
          'line-blur': 10
        }
      })

      // Inner core
      map.current.addLayer({
        id: 'route-core',
        type: 'line',
        source: 'route-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': 'var(--accent-light)',
          'line-width': 4
        }
      })
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Handle Map Clicks to add Waypoints
  useEffect(() => {
    if (!map.current) return

    const handleClick = (e) => {
      setWaypoints(prev => {
        if (prev.length >= 2) return prev // Max 2 for now
        return [...prev, [e.lngLat.lng, e.lngLat.lat]]
      })
    }

    map.current.on('click', handleClick)
    return () => map.current.off('click', handleClick)
  }, [])

  // Sync Markers to Waypoints
  useEffect(() => {
    if (!map.current) return

    // Clear old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    waypoints.forEach((pt, i) => {
      const el = document.createElement('div')
      el.className = `waypoint-marker ${i === 0 ? 'start' : 'end'}`
      el.innerHTML = i === 0 ? 'A' : 'B'

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(pt)
        .addTo(map.current)
      
      markersRef.current.push(marker)
    })
  }, [waypoints])

  // Fetch Route when 2 waypoints are set
  useEffect(() => {
    if (waypoints.length !== 2) {
      if (map.current && map.current.getSource('route-source')) {
        map.current.getSource('route-source').setData({ type: 'FeatureCollection', features: [] })
      }
      return
    }

    const fetchRoute = async () => {
      try {
        const res = await fetch('/api/route', {
          method: 'POST',
          body: JSON.stringify({
            locations: waypoints.map(pt => ({ lon: pt[0], lat: pt[1] })),
            costing: 'bicycle'
          })
        })
        const data = await res.json()
        
        if (data.trip && data.trip.legs) {
          // Decode polyline6 (we'll implement this helper next)
          import('../lib/polyline.js').then(({ decodePolyline }) => {
            const coords = decodePolyline(data.trip.legs[0].shape)
            
            // Draw on map
            map.current.getSource('route-source').setData({
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: coords
              }
            })

            // Send stats to Sidebar
            onRouteCalculated({
              distance: data.trip.summary.length.toFixed(1),
              elevation: Math.round(data.trip.summary.elevation || 0),
              time: Math.round(data.trip.summary.time / 60) + ' min'
            })
          })
        }
      } catch (err) {
        console.error("Routing error:", err)
      }
    }
    
    fetchRoute()
  }, [waypoints, onRouteCalculated])

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
