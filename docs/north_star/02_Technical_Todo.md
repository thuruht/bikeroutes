# 02. Technical Todo List

## Completed
- [x] **Foundational Stabilization:** Build/Type/Lint cleanup.
- [x] **Design Tokens & Layout:** Implemented `index.css` tokens and `ShellLayout.jsx`.
- [x] **Redesign Scaffolding:** Integrated tactical design system into `LandingView` and `PlannerView`.
- [x] **Backend Architecture:** Refactored routing to Valhalla container and tile handler to PMTiles.

## In Progress / Pending

### Immediate Priority: Fix Build and Type Errors
- [x] **Frontend ESLint Cleanup:**
    - Fix impure function `Date.now()` in `CommunityView.jsx`.
    - Fix synchronous `setRouteGeoJSON` in `MapView.jsx` effects.
    - Resolve missing dependencies in `useEffect` arrays.
- [x] **Worker TypeScript Cleanup:**
    - Fix implicit `any` types in `search.ts` and `tiles.ts`.
    - Fix AI model response typing in `search.ts`.
    - Fix D1 query return type mismatch in `POIStore.ts`.

### High Priority: Frontend Missing Pieces
- [x] **Install Missing Dependencies:** `uplot`, `@mapbox/polyline`, `@paypal/paypal-js`, `togpx`.
- [x] **Implement Device Export:** Wire up GPX button in `Sidebar.jsx` using `togpx`.
- [x] **Telemetry & Logging:** Replace `console.log` with structured JSON logging or Cloudflare Analytics Engine in Worker.

### Medium Priority: Architecture & Data
- [x] **Data Ingestion:** Complete OSM graph tile build via Docker (`docker-compose up --build`).
- [x] **Environment Setup:** Configure `.dev.vars` with PayPal credentials.
- [ ] **PayPal Subscription Plans:** Create subscription plans in PayPal Developer Dashboard and update `SUBSCRIPTION_PLANS` IDs in `DonateBanner.jsx`.
- [x] **Frontend Polish:** Migrate `Sidebar` and `MapView` components to tactical UI system.
- [x] **Data Integrity:** Ensure explicit null-checks on all R2 and KV return values.
- [x] **D1 Prepared Statements:** Verify all queries use strictly prepared statements (no string interpolation).

### Future Priority: Core Features
- [x] **Elevation Profiles:** Build component using `uplot` with Valhalla data.
- [ ] **Backend Valhalla Integration:** Move from FOSSGIS fallback to local Container binding.
