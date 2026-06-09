/**
 * BikeRoutes.org — Basemap & Overlay Definitions
 * Direct raster sources for stability.
 */

// ─── BASEMAPS ──────────────────────────────────────────
export const BASEMAPS = {
  // STREETS
  voyager: {
    label: 'Voyager (Clean)',
    group: 'Streets',
    icon: '🏙️',
    tiles: [
      'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
    ],
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 20,
    tileSize: 256,
  },
  osm: {
    label: 'OpenStreetMap',
    group: 'Streets',
    icon: '🗺️',
    tiles: [
      'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
      'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
      'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ],
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    tileSize: 256,
  },

  // OUTDOOR
  cyclosm: {
    label: 'CyclOSM (Cycling)',
    group: 'Outdoor',
    icon: '🚲',
    tiles: [
      'https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
      'https://b.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
      'https://c.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    ],
    attribution: '&copy; OpenStreetMap &copy; CyclOSM',
    maxZoom: 20,
    tileSize: 256,
  },
  esri_topo: {
    label: 'Esri Topo',
    group: 'Outdoor',
    icon: '🏔️',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    ],
    attribution: '&copy; Esri &copy; OpenStreetMap',
    maxZoom: 19,
    tileSize: 256,
  },

  // DARK
  dark: {
    label: 'Dark Mode',
    group: 'Dark',
    icon: '🌑',
    tiles: [
      'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
    ],
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 20,
    tileSize: 256,
  },

  // SATELLITE
  satellite: {
    label: 'Satellite',
    group: 'Satellite',
    icon: '🛰️',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ],
    attribution: '&copy; Esri',
    maxZoom: 19,
    tileSize: 256,
  },
}

// Default basemap - Voyager is highly reliable and looks great
export const DEFAULT_BASEMAP = 'voyager'

// ─── OVERLAYS ──────────────────────────────────────────
export const OVERLAYS = {
  cycling_routes: {
    label: 'Cycling Routes',
    icon: '🚴',
    tiles: [
      'https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png',
    ],
    attribution: '&copy; Waymarked Trails',
    maxZoom: 18,
    tileSize: 256,
    opacity: 0.8,
  },
  railway: {
    label: 'Railways',
    icon: '🚂',
    tiles: [
      'https://a.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
      'https://b.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
      'https://c.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
    ],
    attribution: '&copy; OpenRailwayMap',
    maxZoom: 19,
    tileSize: 256,
    opacity: 0.7,
  },
}

/**
 * Build a MapLibre GL raster style object for a basemap key.
 */
export function buildMapStyle(basemapKey, activeOverlays = [], routeGeoJSON = null) {
  const basemap = BASEMAPS[basemapKey] || BASEMAPS[DEFAULT_BASEMAP]

  const sources = {
    basemap: {
      type: 'raster',
      tiles: basemap.tiles,
      tileSize: basemap.tileSize || 256,
      attribution: basemap.attribution,
      maxzoom: basemap.maxZoom || 19,
    },
  }

  const layers = [
    {
      id: 'basemap-layer',
      type: 'raster',
      source: 'basemap',
      paint: {},
    },
  ]

  // Add overlay sources and layers
  activeOverlays.forEach((overlayKey) => {
    const overlay = OVERLAYS[overlayKey]
    if (!overlay) return

    sources[`overlay-${overlayKey}`] = {
      type: 'raster',
      tiles: overlay.tiles,
      tileSize: overlay.tileSize || 256,
      attribution: overlay.attribution,
      maxzoom: overlay.maxZoom || 18,
    }

    layers.push({
      id: `overlay-${overlayKey}-layer`,
      type: 'raster',
      source: `overlay-${overlayKey}`,
      paint: {
        'raster-opacity': overlay.opacity || 0.7,
      },
    })
  })

  // Always include route source
  sources['route-source'] = {
    type: 'geojson',
    data: routeGeoJSON || { type: 'FeatureCollection', features: [] }
  }

  // Outer glow
  layers.push({
    id: 'route-glow',
    type: 'line',
    source: 'route-source',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': '#00ffcc', 
      'line-width': 12,
      'line-opacity': 0.3,
      'line-blur': 10
    }
  })

  // Inner core
  layers.push({
    id: 'route-core',
    type: 'line',
    source: 'route-source',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': '#1b7b81', 
      'line-width': 4
    }
  })

  return {
    version: 8,
    name: `BikeRoutes – ${basemap.label}`,
    sources,
    layers,
  }
}
