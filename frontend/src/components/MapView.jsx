import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { buildMapStyle, DEFAULT_BASEMAP } from '../lib/basemaps'
import MapStyleSwitcher from './MapStyleSwitcher'
import './MapView.css'

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

export default function MapView({ activeFilters, onRouteCalculated, waypoints, setWaypoints, routeOptions, isNavigating, wcMode }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const geolocateControl = useRef(null)
  const [activeBasemap, setActiveBasemap] = useState(DEFAULT_BASEMAP)
  const [activeOverlays, setActiveOverlays] = useState(['cycling_routes'])
  const [routeGeoJSON, setRouteGeoJSON] = useState(null)

  const markersRef = useRef([])
  const wcMarkersRef = useRef([])

  // Initialize map

  // Global helper for popup buttons
  useEffect(() => {
    window.routeTo = (coords) => {
      setWaypoints(prev => {
        if (prev.length >= 1) return [prev[0], coords];
        return [[-94.5786, 39.0997], coords]; // Fallback A
      });
      document.querySelector('.maplibregl-popup-close-button')?.click();
    };
    return () => { delete window.routeTo; };
  }, [setWaypoints]);

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
            }, data.trip.legs[0].maneuvers, geojson)
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

  // ─── World Cup Mode: Venue Markers & MKT Corridor ───────────
  useEffect(() => {
    if (!map.current) return

    // Clean up previous WC markers
    wcMarkersRef.current.forEach(m => m.remove())
    wcMarkersRef.current = []

    if (!wcMode) {
      // Remove MKT corridor layer/source if they exist
      const m = map.current
      if (m.getLayer('wc-mkt-corridor-line')) m.removeLayer('wc-mkt-corridor-line')
      if (m.getLayer('wc-mkt-corridor-label')) m.removeLayer('wc-mkt-corridor-label')
      if (m.getSource('wc-mkt-corridor')) m.removeSource('wc-mkt-corridor')
      return
    }

    // Add venue markers with staggered bounce-in
    WC_VENUES.forEach((venue, i) => {
      const el = document.createElement('div')
      el.className = 'wc-venue-marker'
      el.innerHTML = `<span class="wc-marker-icon">${venue.icon}</span>`
      el.style.animationDelay = `${i * 100}ms`

      const popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div class="wc-popup">
          <strong>${venue.icon} ${venue.name}</strong>
          <button type="button" class="wc-popup-route-btn" data-venue-id="${venue.id}">Route here →</button>
        </div>
      `)

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(venue.coords)
        .setPopup(popup)
        .addTo(map.current)

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
      const m = map.current
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
    if (map.current.isStyleLoaded()) {
      addCorridorLayer()
    } else {
      map.current.once('style.load', addCorridorLayer)
    }

    // Also re-add corridor after any future style changes
    map.current.on('style.load', addCorridorLayer)

    // Add interactions for overlays (like worldcup_bbq)
    map.current.on('mouseenter', 'overlay-worldcup_bbq-layer', (e) => {
      map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'overlay-worldcup_bbq-layer', () => {
      map.current.getCanvas().style.cursor = '';
    });
    map.current.on('click', 'overlay-worldcup_bbq-layer', (e) => {
      if (!e.features || !e.features[0]) return;
      const props = e.features[0].properties;
      const name = props.Name || props.NAME || props.name || 'BBQ Joint';
      const address = props.Address || props.ADDRESS || props.address || '';

      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="wc-popup">
            <strong>🍖 ${name}</strong>
            ${address ? `<p style="font-size:0.75rem; color:#666; margin: 4px 0;">${address}</p>` : ''}
            <button type="button" class="wc-popup-route-btn" style="margin-top: 8px;" onclick="window.routeTo([${e.lngLat.lng}, ${e.lngLat.lat}])">Route here →</button>
          </div>
        `)
        .addTo(map.current);
    });


    return () => {
      if (map.current) {
        map.current.off('style.load', addCorridorLayer)
      }
    }
  }, [wcMode])

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
        <img src="/reki.png" alt="Reki the Deer - BikeRoutes Mascot" title="Reki has scouted this area!" className="watermark-icon" width="20" height="20" />
        <span className="watermark-text">REKI SCOUTED THIS</span>
      </div>

    </div>
  )
}

