# Housekeeping Implementation Plan

## Context
General codebase review for Cloudflare Workers and React best practices, identifying potential errors and optimization areas.

## Identified Issues & Mitigation Plan
1. **Telemetry & Logging**:
   - **Issue**: The `bikeroutes-api` worker uses `console.log` and `console.error` for logging, which is against the Cloudflare Workers standard protocols outlined in Phase 3.
   - **Mitigation**: Replace `console.log` executions with JSON-structured logging or Cloudflare Analytics Engine. Ensure any custom logging logic uses `ctx.waitUntil()` so it doesn't block responses.
2. **KV and Cache Handling**:
   - **Issue**: Need to guarantee explicit null-checks on all R2 and KV return values.
   - **Mitigation**: Ensure that when fetching from `ROUTE_CACHE`, we handle `null` gracefully and type the outputs properly. Avoid loading huge GeoJSON strings into memory when streams could be passed directly.
3. **Frontend Global Mutations**:
   - **Issue**: In `MapView.jsx`, there is a global mutation `window.routeTo = (coords) => { ... }` used for popup buttons.
   - **Mitigation**: Refactor popup event handlers to use standard DOM event listeners instead of attaching methods to the global `window` object to prevent scope leaks.
4. **Data Integrity & Typings**:
   - **Issue**: Usage of implicit `any` in `route.ts` (e.g. `const routeData = await valhallaResp.json()`).
   - **Mitigation**: Define strict TypeScript interfaces for Valhalla request payload, response shapes, and Env bindings drawn from `@cloudflare/workers-types`.
5. **D1 Queries**:
   - **Issue**: While `route.ts` uses `.bind()`, we must double-check all other D1 queries to ensure strictly prepared statements are used. No string interpolation.
