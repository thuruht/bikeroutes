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
  const [routeGeoJSON, setRouteGeoJSON] = useState(null)

  const markersRef = useRef([])

  // Initialize map
  useEffect(() => {
    if (map.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: buildMapStyle(activeBasemap, activeOverlays, routeGeoJSON),
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
      setRouteGeoJSON(null)
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
          import('../lib/polyline.js').then(({ decodePolyline }) => {
            const coords = decodePolyline(data.trip.legs[0].shape)
            
            const geojson = {
              type: 'FeatureCollection',
              features: [{
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: coords
                }
              }]
            }
            setRouteGeoJSON(geojson)

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

  // Update map style when basemap, overlays, or route changes
  useEffect(() => {
    if (map.current) {
      map.current.setStyle(buildMapStyle(activeBasemap, activeOverlays, routeGeoJSON))
    }
  }, [activeBasemap, activeOverlays, routeGeoJSON])

  // Update map style when basemap or overlays change
  const handleBasemapChange = useCallback((key) => {
    setActiveBasemap(key)
  }, [])

  const handleOverlayToggle = useCallback((key) => {
    setActiveOverlays(prev => {
      const next = prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
      return next
    })
  }, [])

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
