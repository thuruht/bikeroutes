# Revision Audit & Next Steps

This document provides a comprehensive audit of the BikeRoutes.org repository, comparing its current state against the North Star Guide, assessing code viability, and outlining clear, actionable next steps.

## Executive Summary
The project has made significant progress in scaffolding the frontend and backend architectures. The core React/Vite frontend is established with MapLibre integration. The Cloudflare Workers backend has routes defined for routing, tiles, search, auth, and POIs, utilizing D1, KV, Vectorize, and Durable Objects.

However, there are several critical technical debt items, missing dependencies, and partially implemented features that need immediate attention before the MVP can be considered complete. The recent addition of the "FIFA World Cup 26 — Kansas City Mode" (FWC26) has been integrated into the codebase but requires some cleanup and backend support.

## 1. Documentation Consistency Review
*   **Action Taken:** Four new documentation files (`mascot_identity.md`, `navigation_mode.md`, `route_builder.md`, `fwc26_prompt.md`) were integrated into the `docs/north_star/` directory (numbered 08 to 11).
*   **Action Taken:** The `00_Table_of_Contents.md` and `06_Index.md` files were updated to include and cross-reference these new documents.
*   **Status:** The documentation is now consistent and acts as a unified source of truth.

## 2. Code Viability Assessment
Extensive static analysis and build testing were performed on both the frontend and backend.

### Backend (`worker/`)
*   **Build Status:** The initial `npm run build` failed because the `build` script was missing from `package.json`.
*   **Type Checking:** Running `npm run check` (TypeScript compilation) revealed multiple errors:
    *   Missing `Env` type definitions in almost all files. (Partially resolved by generating `worker-configuration.d.ts` using `wrangler types`, but requires removing `@cloudflare/workers-types` and updating `tsconfig.json`).
    *   TypeScript errors related to missing properties on `Env` (e.g., `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` in `donate.ts` which are not defined in `wrangler.jsonc` or `.dev.vars`).
    *   Type mismatch in `POIStore.ts` (`Record<string, SqlStorageValue>` vs `POISubmission`).
    *   Implicit `any` types in `search.ts` and `tiles.ts`.
    *   Property `data` does not exist on the response object from the `baai/bge-base-en-v1.5` AI model in `search.ts`.
*   **Architecture:** The routing logic correctly falls back to a public Valhalla instance (`valhalla1.openstreetmap.de`) while the Docker container setup is pending. Durable Objects (`POIStore`, `RouteSession`, `ValhallaContainer`) are scaffolded but type-check fails.

### Frontend (`frontend/`)
*   **Build Status:** The frontend builds successfully (`npm run build`).
*   **Linting:** ESLint analysis revealed several issues:
    *   `react-hooks/purity` error in `CommunityView.jsx`: Calling `Date.now()` (an impure function) directly during render inside `getTimeAgo`.
    *   `react-hooks/set-state-in-effect` error in `MapView.jsx`: Calling `setRouteGeoJSON(null)` synchronously within an effect.
    *   Several missing dependency warnings in `useEffect` hooks in `MapView.jsx`.
    *   Unused variables (`err`, `activeFilters`, `factor`).
*   **Dependencies:** The `package.json` is missing several critical dependencies listed in the Technical Todo:
    *   `uplot` (for elevation profiles)
    *   `@mapbox/polyline` (for decoding Valhalla routes)
    *   `@paypal/paypal-js` (for donation engine)
    *   `togpx` (for device export)

## 3. Progress Against Plans

### Phase 0: Architecture Cleanup
*   [ ] **Directory Structure:** `routing/` and `tiles/` directories are **missing**. `Dockerfile.valhalla` is still inside `worker/`.
*   [~] **Worker Config:** KV, Vectorize, and Durable Objects are configured in `wrangler.jsonc`, but environment variables for PayPal are missing.
*   [ ] **Frontend Dependencies:** Audit failed (missing `uplot`, `@mapbox/polyline`, `@paypal/paypal-js`, `togpx`).

### Phase 1: Backend Infrastructure
*   [ ] **Routing Service (Valhalla):** Docker setup is incomplete. The Worker currently hardcodes a fallback to a public OSM server.
*   [ ] **Tile Server:** Not implemented (currently falls back to public OSM tiles in `tiles.ts`).
*   [~] **Worker Endpoints:** Endpoints exist, but contain TypeScript errors. Search uses Vectorize and Workers AI successfully (conceptually, though types are wrong). Donate endpoint lacks PayPal secrets.
*   [~] **Data Ingestion:** `worker/src/tasks/sync-gis.ts` exists but needs review and error fixing.

### Phase 2: Frontend MVP Features
*   [x] **Interactive Route Drawing:** Basic scaffolding exists using MapLibre.
*   [ ] **Elevation Profiles:** Missing (`uplot` not installed, UI panel missing).
*   [x] **Granular Filters:** UI toggles exist.
*   [~] **Semantic Search:** UI exists, backend endpoint exists (but has type errors).
*   [x] **Device Export:** Implemented via `togpx` library, converting Valhalla-decoded GeoJSON to GPX file downloads.
*   [x] **Donation Engine:** UI (`DonateBanner.jsx`) is built, but PayPal SDK integration is missing.
*   [x] **Mascot Integration:** Reki is heavily integrated into the UI copy and empty states.

### New Feature: FWC26 Mode
*   [x] **UI Components:** `WCBadge`, `WCContextBar`, `WCSidebarPanel`, and `WCLeaderboard` are all fully implemented and integrated into `App.jsx`.
*   [x] **State Management:** `wcMode` state is correctly passed down.

## 4. Verbose Next Steps

Based on the audit, the following steps must be taken, prioritized from most critical to least:

### Immediate Priority: Fix Build and Type Errors (The "Viability" Blockers)
1.  **Frontend ESLint Cleanup:**
    *   Fix the impure function `Date.now()` in `frontend/src/components/CommunityView.jsx` (move it outside the component or use a hook).
    *   Fix the `setRouteGeoJSON` synchronous update inside `useEffect` in `frontend/src/components/MapView.jsx`.
    *   Resolve missing dependencies in `useEffect` arrays in `MapView.jsx`.
2.  **Worker TypeScript Cleanup:**
    *   Uninstall `@cloudflare/workers-types` and update `tsconfig.json` as requested by Wrangler.
    *   Add `@types/node` to worker devDependencies.
    *   Fix the implicit `any` types in `search.ts` and `tiles.ts`.
    *   Fix the AI model response typing in `search.ts` (the `data` property issue).
    *   Fix the D1 query return type mismatch in `POIStore.ts`.

### High Priority: Frontend Missing Pieces
3.  **Install Missing Dependencies:** Run `npm install uplot @mapbox/polyline @paypal/paypal-js` in the `frontend` directory.
4.  *(Completed)* **Implement Device Export:** GPX button is now wired up using `togpx`.

### Medium Priority: Architecture Realignment
5.  **Directory Restructuring:** Move `Dockerfile.valhalla` to a new `routing/valhalla/` directory and create the `routing/docker-compose.yml` as specified in `02_Technical_Todo.md`.
6.  **Environment Variables:** Define the expected secrets (like `PAYPAL_CLIENT_ID`) in a `.dev.vars` file for the Worker to resolve the type errors in `donate.ts`.

### Future Priority: Core Features
7.  **Elevation Profiles:** Build the elevation profile component using `uplot` to render the data returned from Valhalla.
8.  **Backend Valhalla Integration:** Move away from the FOSSGIS fallback and properly integrate the Cloudflare Container binding for Valhalla.
