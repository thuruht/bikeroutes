# Bug 4 Implementation Plan: MapLibre WebGL Context Loss

## Context
Fetching from USGS Topo basemaps causes persistent CORS/Network errors. MapLibre exhausts tile retries and ultimately crashes the WebGL context due to the continuous render failure cycle.

## Mitigation Plan
1. **Frontend side (`frontend/src/lib/basemaps.js` & `MapView.jsx`)**:
   - Update the `tiles` URLs for `usgs_topo` and `usgs_imagery` to proxy through our Cloudflare Worker instead of directly hitting `basemap.nationalmap.gov`.
   - Example update: `/api/proxy/tiles/usgs_topo/{z}/{y}/{x}`.
   - Add an error listener to MapLibre (`map.current.on('error', ...)`) to catch tile loading errors and implement a clean fallback bounds (e.g., automatically switching to `osm` or `dark` basemaps) before WebGL context crashes.
2. **Worker side (`worker/src/routes/tiles.ts`)**:
   - Create a new route proxy for tile requests.
   - Inject appropriate CORS headers (`Access-Control-Allow-Origin: *`).
   - Cache successful tile responses in the `ROUTE_CACHE` KV namespace with a 7-day TTL (`expirationTtl: 604800`) to minimize upstream hits.
