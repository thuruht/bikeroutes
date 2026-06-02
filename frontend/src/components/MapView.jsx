import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { buildMapStyle, DEFAULT_BASEMAP } from '../lib/basemaps'
import MapStyleSwitcher from './MapStyleSwitcher'
import styles from './MapView.module.css'

// KC metro center
const DEFAULT_CENTER = [-94.5786, 39.0997]
const DEFAULT_ZOOM = 11

// WC Venue data
const WC_VENUES = [
  { id: 'arrowhead', name: 'Arrowhead Stadium', icon: '⚽', coords: [-94.4839, 39.0489] },
  { id: 'union', name: 'Union Station', icon: '🚉', coords: [-94.5838, 39.0997] },
  { id: 'pnl', name: 'Power & Light District', icon: '🎉', coords: [-94.5786, 39.0999] },
  { id: 'westbottoms', name: 'West Bottoms Fan Zone', icon: '🌉', coords: [-94.5950, 39.1020] },
  { id: 'berkley', name: 'Berkley Riverfront', icon: '🏞️', coords: [-94.5784, 39.1082] },
]

// Approximate MKT Nature/Fitness Trail corridor (midtown → Union Station direction)
const MKT_CORRIDOR_GEOJSON = {
  type: 'Feature',
  properties: { name: 'Recommended Visitor Corridor' },
  geometry: {
    type: 'LineString',
    coordinates: [
      [-94.5786, 39.0550],
      [-94.5790, 39.0600],
      [-94.5795, 39.0650],
      [-94.5800, 39.0700],
      [-94.5810, 39.0750],
      [-94.5820, 39.0800],
      [-94.5825, 39.0850],
      [-94.5830, 39.0900],
      [-94.5835, 39.0950],
      [-94.5838, 39.0997],
    ],
  },
}

export default function MapView({ onRouteCalculated, waypoints, setWaypoints, routeOptions, isNavigating, wcMode }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const geolocateControl = useRef(null)
  const [activeBasemap, setActiveBasemap] = useState(DEFAULT_BASEMAP)
  const [activeOverlays, setActiveOverlays] = useState(['cycling_routes'])
  const [routeGeoJSON, setRouteGeoJSON] = useState(null)

  const markersRef = useRef([])
  const wcMarkersRef = useRef([])

  // Initialize map

  // Removed global helper to avoid scope leaks

  // WebGL Context Loss Recovery
  useEffect(() => {
    const container = mapContainer.current;
    if (!container) return;

    const handleContextLost = (e) => {
      e.preventDefault();
      console.error("WebGL context lost. Attempting recovery...");
    };

    const handleContextRestored = () => {
      console.warn("WebGL context restored. Reloading map...");
      if (map.current) {
        map.current.remove();
        map.current = null;
        setActiveBasemap(prev => prev);
      }
    };

    container.addEventListener('webglcontextlost', handleContextLost, false);
    container.addEventListener('webglcontextrestored', handleContextRestored, false);

    return () => {
      container.removeEventListener('webglcontextlost', handleContextLost);
      container.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, []);

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

    // MapLibre Error Bounds (Bug 4 Fallback)
    map.current.on('error', (e) => {
      if (e && e.error && e.error.message) {
        console.warn('MapLibre resource error:', e.error.message)
        if (activeBasemap.includes('usgs') && e.error.message.includes('fetch')) {
          console.warn('Falling back from USGS to OSM basemap due to persistent errors.')
          setActiveBasemap('osm')
        }
      }
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [activeBasemap, activeOverlays, routeGeoJSON])

  // GPS Navigation Mode trigger
  useEffect(() => {
    if (isNavigating && geolocateControl.current) {
      // Small timeout ensures the control is mounted and map is ready
      const timer = setTimeout(() => {
        geolocateControl.current.trigger()
      }, 100)
      return () => clearTimeout(timer)
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
    return () => {
      if (map.current) map.current.off('click', handleClick)
    }
  }, [isNavigating, setWaypoints])

  // Sync Markers to Waypoints
  useEffect(() => {
    if (!map.current) return

    // Clear old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    waypoints.forEach((pt, i) => {
      const el = document.createElement('div')
      el.className = `${styles.waypointMarker} ${i === 0 ? 'start' : 'end'}`
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
    let active = true

    if (waypoints.length !== 2) {
      // Defer to avoid synchronous state update warning
      const timer = setTimeout(() => {
        if (active) {
          setRouteGeoJSON(null)
          onRouteCalculated(null, [], null)
        }
      }, 0)
      return () => { active = false; clearTimeout(timer) }
    }

    let retryCount = 0
    const maxRetries = 3

    const fetchRoute = () => {
      const attempt = async () => {
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
              costing_options: costingOptions,
              heights: true // Request elevation data
            })
          })

          if (res.status === 503) {
            if (retryCount < maxRetries) {
              retryCount++
              const backoff = Math.pow(2, retryCount) * 1000 // 2s, 4s, 8s
              console.warn(`[Routing] 503 Engine Offline. Retrying in ${backoff}ms (Attempt ${retryCount}/${maxRetries})`)
              setTimeout(() => { if (active) attempt() }, backoff)
              return
            } else {
              console.error("[Routing] Max retries reached. Routing engine is offline.")
              return
            }
          }

          const data = await res.json()
          
          if (!active) return

          if (data.trip && data.trip.legs) {
            const { decodePolyline } = await import('../lib/polyline.js')
            const coords = decodePolyline(data.trip.legs[0].shape, 6, 3)
            
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

            onRouteCalculatedRef.current({
              distance: data.trip.summary.length.toFixed(1),
              elevation: Math.round(data.trip.summary.elevation || 0),
              time: Math.round(data.trip.summary.time / 60) + ' min'
            }, data.trip.legs[0].maneuvers, geojson)
          }
        } catch (err) {
          console.error("Routing error:", err)
        }
      }

      // Initial debounce of 1s to prevent rapid requests when markers are rapidly clicked
      const debounceTimer = setTimeout(() => {
        if (active) attempt()
      }, 1000)

      return () => clearTimeout(debounceTimer)
    }
    
    const cleanup = fetchRoute()
    return () => { 
      active = false
      if (cleanup) cleanup()
    }
  }, [waypoints, routeOptions])

  // Update map style when basemap, overlays, or route changes
  useEffect(() => {
    if (map.current) {
      map.current.setStyle(buildMapStyle(activeBasemap, activeOverlays, routeGeoJSON))
    }
  }, [activeBasemap, activeOverlays, routeGeoJSON])

  // ─── World Cup Mode: Venue Markers & MKT Corridor ───────────
  useEffect(() => {
    const m = map.current
    if (!m) return

    // Clean up previous WC markers
    wcMarkersRef.current.forEach(marker => marker.remove())
    wcMarkersRef.current = []

    if (!wcMode) {
      // Remove MKT corridor layer/source if they exist
      if (m.getLayer('wc-mkt-corridor-line')) m.removeLayer('wc-mkt-corridor-line')
      if (m.getLayer('wc-mkt-corridor-label')) m.removeLayer('wc-mkt-corridor-label')
      if (m.getSource('wc-mkt-corridor')) m.removeSource('wc-mkt-corridor')
      return
    }

    // Add venue markers with staggered bounce-in
    WC_VENUES.forEach((venue, i) => {
      const el = document.createElement('div')
      el.className = styles.wcVenueMarker
      el.innerHTML = `<span class="${styles.wcMarkerIcon}">${venue.icon}</span>`
      el.style.animationDelay = `${i * 100}ms`

      const popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div class="${styles.wcPopup}">
          <strong>${venue.icon} ${venue.name}</strong>
          <button type="button" class="${styles.wcPopupRouteBtn}" data-venue-id="${venue.id}">Route here →</button>
        </div>
      `)

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(venue.coords)
        .setPopup(popup)
        .addTo(m)

      // Listen for popup open to attach "Route here" click
      popup.on('open', () => {
        setTimeout(() => {
          const btn = document.querySelector(`[data-venue-id="${venue.id}"]`)
          if (btn) {
            btn.addEventListener('click', () => {
              setWaypoints(prev => {
                if (prev.length >= 1) return [prev[0], venue.coords]
                return [DEFAULT_CENTER, venue.coords]
              })
              popup.remove()
            })
          }
        }, 50)
      })

      wcMarkersRef.current.push(marker)
    })

    // Add MKT corridor on style load (needed because setStyle may reset layers)
    const addCorridorLayer = () => {
      if (!m || !m.isStyleLoaded()) return

      if (!m.getSource('wc-mkt-corridor')) {
        m.addSource('wc-mkt-corridor', {
          type: 'geojson',
          data: MKT_CORRIDOR_GEOJSON,
        })
      }

      if (!m.getLayer('wc-mkt-corridor-line')) {
        m.addLayer({
          id: 'wc-mkt-corridor-line',
          type: 'line',
          source: 'wc-mkt-corridor',
          paint: {
            'line-color': '#c8102e',
            'line-opacity': 0.6,
            'line-width': 4,
            'line-dasharray': [2, 2],
          },
        })
      }
    }

    // Try adding immediately, or wait for style load
    if (m.isStyleLoaded()) {
      addCorridorLayer()
    } else {
      m.once('style.load', addCorridorLayer)
    }

    // Also re-add corridor after any future style changes
    m.on('style.load', addCorridorLayer)

    // Add interactions for overlays (like worldcup_bbq)
    const onBBQEnter = () => { m.getCanvas().style.cursor = 'pointer' }
    const onBBQLeave = () => { m.getCanvas().style.cursor = '' }
    const onBBQClick = (e) => {
      if (!e.features || !e.features[0]) return;
      const props = e.features[0].properties;
      const name = props.Name || props.NAME || props.name || 'BBQ Joint';
      const address = props.Address || props.ADDRESS || props.address || '';

      const safeLng = e.lngLat.lng.toFixed(5).replace('.','_');
      const safeLat = e.lngLat.lat.toFixed(5).replace('.','_');
      const btnId = `btn-route-${safeLng}-${safeLat}`;

      const popup = new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="${styles.wcPopup}">
            <strong>🍖 ${name}</strong>
            ${address ? `<p style="font-size:0.75rem; color:#666; margin: 4px 0;">${address}</p>` : ''}
            <button type="button" class="${styles.wcPopupRouteBtn}" style="margin-top: 8px;" id="${btnId}">Route here →</button>
          </div>
        `)
        .addTo(m);
        
      setTimeout(() => {
        const btn = document.getElementById(btnId);
        if (btn) {
          btn.addEventListener('click', () => {
            setWaypoints(prev => {
              if (prev.length >= 1) return [prev[0], [e.lngLat.lng, e.lngLat.lat]];
              return [DEFAULT_CENTER, [e.lngLat.lng, e.lngLat.lat]];
            });
            popup.remove();
          });
        }
      }, 50);
    }

    m.on('mouseenter', 'overlay-worldcup_bbq-layer', onBBQEnter)
    m.on('mouseleave', 'overlay-worldcup_bbq-layer', onBBQLeave)
    m.on('click', 'overlay-worldcup_bbq-layer', onBBQClick)

    return () => {
      if (m) {
        m.off('style.load', addCorridorLayer)
        m.off('mouseenter', 'overlay-worldcup_bbq-layer', onBBQEnter)
        m.off('mouseleave', 'overlay-worldcup_bbq-layer', onBBQLeave)
        m.off('click', 'overlay-worldcup_bbq-layer', onBBQClick)
      }
    }
  }, [wcMode, setWaypoints])

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
    <div className={styles.mapContainer} id="map-container">
      <div ref={mapContainer} className={styles.mapCanvas} />

      {/* Basemap & overlay switcher */}
      <MapStyleSwitcher
        activeBasemap={activeBasemap}
        onBasemapChange={handleBasemapChange}
        activeOverlays={activeOverlays}
        onOverlayToggle={handleOverlayToggle}
      />

      {/* Reki watermark */}
      <div className={styles.mapWatermark}>
        <img src="/reki.png" alt="Reki the Deer - BikeRoutes Mascot" title="Reki has scouted this area!" className={styles.watermarkIcon} width="20" height="20" />
        <span className={styles.watermarkText}>REKI SCOUTED THIS</span>
      </div>

    </div>
  )
}
