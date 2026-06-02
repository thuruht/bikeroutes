# Bug 1 Implementation Plan: Valhalla Container DO Offline / Fallback Flaw

## Context
Routing requests continuously fail with distance limit exceedances (error_code 154) and a mock fallback triggers a misleading HTTP 200.

## Mitigation Plan
1. **Keepalives in `ValhallaContainer.ts`**
   - The documentation explicitly states not to override `alarm()` directly.
   - We will use `schedule()` to fire a keepalive method every 4 minutes (since `sleepAfter` is 5 minutes).
   - Use `renewActivityTimeout()` to reset the idle timer.

2. **Valhalla Caller and /api/health (`worker/src/routes/route.ts`)**
   - **Coordinate Validation**: Add boundary checks to reject requests where coordinates are `0,0` or outside a valid format.
   - **Status Code Fix**: Replace the mock `200` response with a proper `503 Service Unavailable` to signal frontend backoff.
   - **Health Check API**: Implement `GET /api/health` that utilizes the native Durable Object RPC method `getState()` to query the container state independently, returning `{ valhalla: state.status, lastChange, timestamp }`.
