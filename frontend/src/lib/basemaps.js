/**
 * BikeRoutes.org — Basemap & Overlay Definitions
 * Ported from Leaflet → MapLibre GL JS raster sources
 */

// ─── BASEMAPS ──────────────────────────────────────────
export const BASEMAPS = {
  // DARK & NIGHT
  dark: {
    label: 'Dark',
    group: 'Dark & Night',
    icon: '🌑',
    tiles: [
      'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
    ],
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 20,
    tileSize: 256,
  },
  night: {
    label: 'Night (NASA)',
    group: 'Dark & Night',
    icon: '🌃',
    tiles: [
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png',
    ],
    attribution: '&copy; NASA GIBS',
    maxZoom: 8,
    tileSize: 256,
  },
  esri_dark: {
    label: 'Esri Dark Gray',
    group: 'Dark & Night',
    icon: '⬛',
    tiles: [
      'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    ],
    attribution: '&copy; Esri',
    maxZoom: 16,
    tileSize: 256,
  },

  // SATELLITE
  satellite: {
    label: 'Satellite (Esri)',
    group: 'Satellite',
    icon: '🛰️',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ],
    attribution: '&copy; Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP',
    maxZoom: 19,
    tileSize: 256,
  },
  google_sat: {
    label: 'Google Satellite',
    group: 'Satellite',
    icon: '🌍',
    tiles: [
      'https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      'https://mt2.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      'https://mt3.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    ],
    attribution: '&copy; Google',
    maxZoom: 20,
    tileSize: 256,
  },
  google_hybrid: {
    label: 'Google Hybrid',
    group: 'Satellite',
    icon: '🗺️',
    tiles: [
      'https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      'https://mt2.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      'https://mt3.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    ],
    attribution: '&copy; Google',
    maxZoom: 20,
    tileSize: 256,
  },
  usgs_imagery: {
    label: 'USGS Imagery',
    group: 'Satellite',
    icon: '🇺🇸',
    tiles: [
      'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
    ],
    attribution: '&copy; USGS',
    maxZoom: 16,
    tileSize: 256,
  },

  // STREETS
  voyager: {
    label: 'Voyager',
    group: 'Streets',
    icon: '🏙️',
    tiles: [
      'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
    ],
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
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
  osm_fr: {
    label: 'OSM France',
    group: 'Streets',
    icon: '🇫🇷',
    tiles: [
      'https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
      'https://b.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
      'https://c.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    ],
    attribution: '&copy; OpenStreetMap &copy; OSM France',
    maxZoom: 19,
    tileSize: 256,
  },
  osm_ch: {
    label: 'OSM Swiss',
    group: 'Streets',
    icon: '🇨🇭',
    tiles: [
      'https://tile.osm.ch/switzerland/{z}/{x}/{y}.png',
    ],
    attribution: '&copy; OpenStreetMap &copy; Swiss OSM',
    maxZoom: 18,
    tileSize: 256,
  },
  public_transport: {
    label: 'Public Transport',
    group: 'Streets',
    icon: '🚌',
    tiles: [
      'https://a.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=6170aad10dfd42a38d4d8c709a536f38',
      'https://b.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=6170aad10dfd42a38d4d8c709a536f38',
      'https://c.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=6170aad10dfd42a38d4d8c709a536f38',
    ],
    attribution: '&copy; Thunderforest &copy; OSM',
    maxZoom: 22,
    tileSize: 256,
  },

  // TOPO
  terrain: {
    label: 'OpenTopoMap',
    group: 'Topo',
    icon: '⛰️',
    tiles: [
      'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
      'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
      'https://c.tile.opentopomap.org/{z}/{x}/{y}.png',
    ],
    attribution: 'Map data: &copy; OSM contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)',
    maxZoom: 17,
    tileSize: 256,
  },
  esri_topo: {
    label: 'Esri Topo',
    group: 'Topo',
    icon: '🏔️',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    ],
    attribution: '&copy; Esri &copy; OpenStreetMap',
    maxZoom: 19,
    tileSize: 256,
  },
  usgs_topo: {
    label: 'USGS Topo',
    group: 'Topo',
    icon: '🇺🇸',
    tiles: [
      'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
    ],
    attribution: '&copy; USGS &copy; OpenStreetMap',
    maxZoom: 16,
    tileSize: 256,
  },

  // OUTDOOR / CYCLING
  cyclosm: {
    label: 'CyclOSM',
    group: 'Outdoor',
    icon: '🚲',
    tiles: [
      'https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
      'https://b.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
      'https://c.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    ],
    attribution: '&copy; OpenStreetMap contributors &copy; CyclOSM',
    maxZoom: 20,
    tileSize: 256,
  },
  pioneer: {
    label: 'Pioneer',
    group: 'Outdoor',
    icon: '🧭',
    tiles: [
      'https://a.tile.thunderforest.com/pioneer/{z}/{x}/{y}.png?apikey=6170aad10dfd42a38d4d8c709a536f38',
      'https://b.tile.thunderforest.com/pioneer/{z}/{x}/{y}.png?apikey=6170aad10dfd42a38d4d8c709a536f38',
      'https://c.tile.thunderforest.com/pioneer/{z}/{x}/{y}.png?apikey=6170aad10dfd42a38d4d8c709a536f38',
    ],
    attribution: '&copy; Thunderforest &copy; OSM',
    maxZoom: 22,
    tileSize: 256,
  },
  outdoors: {
    label: 'Outdoors',
    group: 'Outdoor',
    icon: '🏕️',
    tiles: [
      'https://a.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=6170aad10dfd42a38d4d8c709a536f38',
      'https://b.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=6170aad10dfd42a38d4d8c709a536f38',
      'https://c.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=6170aad10dfd42a38d4d8c709a536f38',
    ],
    attribution: '&copy; Thunderforest &copy; OSM',
    maxZoom: 22,
    tileSize: 256,
  },
}

// Default basemap — matches the tactical hi-tech vibe
export const DEFAULT_BASEMAP = 'usgs_topo'

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
  hiking_trails: {
    label: 'Hiking Trails',
    icon: '🥾',
    tiles: [
      'https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png',
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
  marc_bikeways: {
    label: 'Official KC Trails (MARC)',
    icon: '🗺️',
    type: 'geojson',
    geometryType: 'line',
    url: 'https://gis2.marc2.org/arcgis/rest/services/Recreation/BikewaysAndTrails/MapServer/10/query?where=1=1&outFields=*&f=geojson',
    attribution: '&copy; MARC',
    paint: {
      'line-color': '#33FF57',
      'line-width': 3,
      'line-opacity': 0.8
    }
  },
  marc_restrooms: {
    label: 'Public Restrooms (MARC)',
    icon: '🚻',
    type: 'geojson',
    geometryType: 'circle',
    url: 'https://gis2.marc2.org/arcgis/rest/services/Recreation/PublicRestrooms/MapServer/0/query?where=1=1&outFields=*&f=geojson',
    attribution: '&copy; MARC',
    paint: {
      'circle-color': '#4285F4',
      'circle-radius': 5,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff'
    }
  },
  marc_bikehubs: {
    label: 'RideKC Bike Hubs',
    icon: '🚲',
    type: 'geojson',
    geometryType: 'circle',
    url: 'https://gis2.marc2.org/arcgis/rest/services/Recreation/RideKCBikehubs/MapServer/0/query?where=1=1&outFields=*&f=geojson',
    attribution: '&copy; MARC',
    paint: {
      'circle-color': '#EA4335',
      'circle-radius': 5,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff'
    }
  },
  worldcup_bbq: {
    label: 'Top KC BBQ (World Cup 26)',
    icon: '🍖',
    type: 'geojson',
    geometryType: 'circle',
    url: 'https://gis2.marc2.org/arcgis/rest/services/Temporary/WorldCup/MapServer/1/query?where=1=1&outFields=*&f=geojson',
    attribution: '&copy; MARC',
    paint: {
      'circle-color': '#FBBC05',
      'circle-radius': 6,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#333333'
    }
  },
  worldcup_stadium: {
    label: 'Arrowhead Stadium (World Cup 26)',
    icon: '🏟️',
    type: 'geojson',
    geometryType: 'circle',
    url: 'https://gis2.marc2.org/arcgis/rest/services/Temporary/WorldCup/MapServer/4/query?where=1=1&outFields=*&f=geojson',
    attribution: '&copy; MARC',
    paint: {
      'circle-color': '#E85D4A',
      'circle-radius': 8,
      'circle-stroke-width': 3,
      'circle-stroke-color': '#ffffff'
    }
  }
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

  // Apply dark filter to non-dark basemaps for consistency with the UI
  // (skip for dark/night/esri_dark which are already dark)
  const darkBasemaps = ['dark', 'night', 'esri_dark']
  if (!darkBasemaps.includes(basemapKey)) {
    layers[0].paint = {
      'raster-brightness-max': 0.5,
      'raster-brightness-min': 0.02,
      'raster-saturation': -0.4,
      'raster-contrast': 0.2,
    }
  }

  // Add overlay sources and layers
  activeOverlays.forEach((overlayKey) => {
    const overlay = OVERLAYS[overlayKey]
    if (!overlay) return

    const overlayType = overlay.type || 'raster'

    if (overlayType === 'raster') {
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
    } else if (overlayType === 'geojson') {
      sources[`overlay-${overlayKey}`] = {
        type: 'geojson',
        data: overlay.url,
        attribution: overlay.attribution,
      }

      if (overlay.geometryType === 'line') {
        layers.push({
          id: `overlay-${overlayKey}-layer`,
          type: 'line',
          source: `overlay-${overlayKey}`,
          paint: overlay.paint || {
            'line-color': '#ff6b1a',
            'line-width': 2,
          },
        })
      } else if (overlay.geometryType === 'circle') {
        layers.push({
          id: `overlay-${overlayKey}-layer`,
          type: 'circle',
          source: `overlay-${overlayKey}`,
          paint: overlay.paint || {
            'circle-color': '#ff6b1a',
            'circle-radius': 4,
          },
        })
      }
    }
  })

  // ─── TACTICAL ROUTE DRAWING ───────────────────────────
  // Always include an empty route-source so it survives basemap switches
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
      'line-color': '#00ffcc', // var(--accent)
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
      'line-color': '#e6fff9', // var(--accent-light)
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
