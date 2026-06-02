# Bug 3 Implementation Plan: Frontend Retry Storm

## Context
The frontend `MapView.jsx` component has a hot loop. It queries `POST /api/route` repeatedly. This happens because the routing `useEffect` hook depends on `routeGeoJSON`. When a mock 200 response arrives, `routeGeoJSON` is updated, triggering the effect again in a continuous cycle.

## Mitigation Plan
1. **Frontend side (`frontend/src/components/MapView.jsx`)**:
   - Remove `routeGeoJSON` from the dependency array of the routing `useEffect` hook so it only triggers on `waypoints` or `routeOptions` changes.
   - Introduce an `isRoutePending` boolean state (or utilize the one passed in via props) to shield against concurrent overlapping requests. Ensure a 2-second debounce is added between user requests.
   - Implement exponential backoff for `503` errors. Limit maximum retry attempts to 3. If it fails 3 times, stop retrying and notify the user.
2. **Worker side**: 
   - Handled in Bug 1: The mock fallback correctly returns a `503` status instead of `200`.
