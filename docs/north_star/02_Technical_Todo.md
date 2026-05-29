# 2. Technical To-Do List

This document outlines the technical implementation steps, starting with the immediate requirements to clean up the scaffolded repository and moving through backend and frontend development phases.

## Phase 0: Immediate Architecture Cleanup & Finalization
The repository is currently in a partially scaffolded state. These steps must be completed before feature development begins.

*   [ ] **Directory Structure Realignment:**
    *   Create the missing `routing/` directory at the project root.
    *   Create the missing `tiles/` directory at the project root.
    *   Move `Dockerfile.valhalla` (currently inside `worker/` or missing) into the new `routing/valhalla/` directory.
    *   Create `routing/docker-compose.yml` to orchestrate Valhalla and the Cloudflare Tunnel connector.
    *   Set up the `tiles/Dockerfile` and `tiles/config/custom_style.json` based on the OpenStreetMap tiles docker pattern.
*   [ ] **Worker Configuration (`worker/wrangler.jsonc`):**
    *   Verify and configure KV namespaces (e.g., `ROUTE_CACHE`, `RATE_LIMITS`).
    *   Configure Vectorize bindings (`TRAIL_SEARCH`).
    *   Configure Durable Objects (`POI_STORE`, `ROUTE_SESSION`).
    *   Ensure the `Docker-tile` binding is correctly defined to point to the self-hosted tile service.
*   [ ] **Frontend Dependency Audit:**
    *   Ensure `@maplibre/maplibre-gl-directions`, `@mapbox/polyline`, `uplot` (for elevation), and `@paypal/paypal-js` are included in `frontend/package.json`.
    *   Verify Vite configuration for optimal tree-shaking and bundle size (< 350KB gzipped).

## Phase 1: Backend & Infrastructure Core (Cloudflare + Docker)
*   [ ] **Routing Service (Valhalla):**
    *   Tune the Valhalla Dockerfile specifically for bicycle routing profiles.
    *   Implement the HTTP wrapper for the Workers Tunnel.
*   [ ] **Tile Server:**
    *   Deploy the self-hosted OSM tile server on the designated VPS/Cloudflare paid tier.
    *   Implement the custom map style highlighting bike lanes, trails, and elevation contours.
*   [ ] **Worker Endpoints (`worker/src/routes.ts`):**
    *   `GET /tiles/*`: Proxy requests to the Docker tile worker with appropriate caching headers.
    *   `GET /route`: Forward routing requests to the Valhalla container, implementing KV caching (`ROUTE_CACHE`).
    *   `GET /search`: Implement semantic search queries against the Vectorize index.
    *   `POST /donate`: Handle PayPal order creation/capture, record in KV, and trigger fulfillment/email workflows.
*   [ ] **Data Ingestion:**
    *   Implement `worker/src/agents/ingestion.ts`: A scheduled Worker (cron) to trigger daily OSM extract imports and tile rebuilds.

## Phase 2: Frontend Implementation (React + MapLibre)
*   [ ] **Map Component (`Map.jsx`):**
    *   Integrate MapLibre GL JS loading vector tiles from the `/tiles/` endpoint.
    *   Implement the interactive draw-your-route feature using waypoint dragging (debounced to avoid Valhalla spam).
*   [ ] **UI Components:**
    *   Build the interactive Elevation Profile panel (parsing Valhalla polylines and rendering with `uplot`).
    *   Implement Trail-Type filter chips (Paved, Gravel, Dirt, MTB) that dynamically update Valhalla costing requests.
    *   Build the Semantic Search bar with rate-limiting UI feedback.
    *   Develop the `DonateBanner.jsx` and the slide-up PayPal integration drawer.
*   [ ] **Export Functionality:**
    *   Implement client-side GeoJSON to GPX/KML conversion (`togpx`).
*   [ ] **State Management & Performance:**
    *   Ensure smooth state transitions between sidebar, map, and filter states.
    *   Implement lazy loading for non-critical map layers (e.g., heatmaps, POIs).

## Phase 3: Technical Debt & Future Optimization
*   [ ] **Testing & CI/CD:**
    *   Establish end-to-end testing for critical routing paths.
    *   Finalize GitHub Actions workflows for deploying Workers and pushing Docker images.
*   [ ] **Vectorize Embeddings:**
    *   Build a pipeline to convert OSM trail metadata and descriptions into vector embeddings for the semantic search engine.

---
*Next: Review the [Product & Feature To-Do List](./03_Product_Todo.md)*
