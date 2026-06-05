# 12. Architecture Refactor Advisory (PMTiles & Valhalla)

This document captures technical advice and required architectural shifts regarding the MapLibre frontend and Cloudflare Worker backend, specifically concerning map tiles and routing infrastructure.

## 1. Map Tiles: Shift from Raster to Vector PMTiles
**Issue:** `worker/src/routes/tiles.ts` currently proxies raster PNG tiles from `tile.openstreetmap.org` and caches them in R2. MapLibre GL is a vector renderer; while it can display raster tiles, using them sacrifices the styling flexibility (dynamic highlighting, hiding road classes, custom palettes) that makes MapLibre powerful.

**Solution:** Shift to PMTiles hosted in R2.
*   **Backend (`tiles.ts`):** Replace the raster proxy with a PMTiles HTTP Range-request handler. This allows the frontend to fetch only the specific byte ranges it needs from a single `.pmtiles` archive stored in the `TILES` R2 bucket.
*   **Frontend (`MapView.jsx`):** Utilize the `pmtiles` package to register the `pmtiles://` protocol with `maplibregl.addProtocol()`. Update the `style.json` (or dynamic style builder) to use a `vector` source pointing to the R2 PMTiles endpoint.

## 2. Routing: Valhalla Container Integration
**Issue:** `worker/src/routes/route.ts` currently bypasses the local Docker container setup and hits a public FOSSGIS Valhalla instance (`valhalla1.openstreetmap.de`) as a temporary fallback. Furthermore, `Dockerfile.valhalla` does not actually build any OSM graph tiles, meaning if the bypass were removed, the local container would fail to route.

**Solution:** Fully integrate Cloudflare Containers for Valhalla.
*   **Dockerfile (`worker/Dockerfile.valhalla`):** Implement a multi-stage build. The first stage should use `valhalla_build_tiles` (and related commands) to download a regional OSM `.pbf` (e.g., Missouri/Kansas) and build the routing graph. The final stage should only contain the built `valhalla_tiles` directory and the service binary.
*   **Worker (`route.ts`):** Remove the public fallback. Use `getContainer(c.env.VALHALLA, "valhalla-router")` to instantiate the Durable Object container and `fetch` against it (`http://localhost:8002/route`).
*   **Wrangler (`wrangler.jsonc`):** Ensure the `containers` binding correctly references the Dockerfile and the `durable_objects` binding correctly maps the `ValhallaContainer` class. (Note: `compatibility_date` may need to be bumped to `2026-05-30` or later for full Containers API support).
