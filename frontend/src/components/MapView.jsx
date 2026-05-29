import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { buildMapStyle, DEFAULT_BASEMAP } from '../lib/basemaps'
import MapStyleSwitcher from './MapStyleSwitcher'
import './MapView.css'

// KC metro center
const DEFAULT_CENTER = [-94.5786, 39.0997]
const DEFAULT_ZOOM = 11

export default function MapView({ activeFilters, onRouteCalculated, waypoints, setWaypoints, routeOptions, isNavigating }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const geolocateControl = useRef(null)
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
    geolocateControl.current = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    })
    map.current.addControl(geolocateControl.current, 'bottom-right')

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

  // GPS Navigation Mode trigger
  useEffect(() => {
    if (isNavigating && geolocateControl.current) {
      // Small timeout ensures the control is mounted and map is ready
      setTimeout(() => {
        geolocateControl.current.trigger()
      }, 100)
    }
  }, [isNavigating])

  // Handle Map Clicks to add Waypoints
  useEffect(() => {
    if (!map.current || isNavigating) return

    const handleClick = (e) => {
      setWaypoints(prev => {
        if (prev.length >= 2) return prev // Max 2 for now
        return [...prev, [e.lngLat.lng, e.lngLat.lat]]
      })
    }

    map.current.on('click', handleClick)
    return () => map.current.off('click', handleClick)
  }, [isNavigating])

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

      // Hide markers during active navigation for a cleaner map
      if (isNavigating) el.style.opacity = '0'

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(pt)
        .addTo(map.current)
      
      markersRef.current.push(marker)
    })
  }, [waypoints, isNavigating])

  // Fetch Route when 2 waypoints are set
  useEffect(() => {
    if (waypoints.length !== 2) {
      setRouteGeoJSON(null)
      return
    }

    const fetchRoute = async () => {
      try {
        // Construct custom Valhalla costing options based on user toggles
        const costingOptions = {
          bicycle: {
            use_hills: routeOptions?.minimizeHills ? 0.1 : 0.5,
            use_roads: routeOptions?.avoidRoads ? 0.1 : 0.5,
          }
        }
        
        if (routeOptions?.pavedOnly) {
          costingOptions.bicycle.bicycle_type = "Road"
          costingOptions.bicycle.avoid_bad_surfaces = 0.9
        }

        const res = await fetch('/api/route', {
          method: 'POST',
          body: JSON.stringify({
            locations: waypoints.map(pt => ({ lon: pt[0], lat: pt[1] })),
            costing: 'bicycle',
            costing_options: costingOptions
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
            }, data.trip.legs[0].maneuvers)
          })
        }
      } catch (err) {
        console.error("Routing error:", err)
      }
    }
    
    fetchRoute()
  }, [waypoints, onRouteCalculated, routeOptions])

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

    </div>
  )
}
