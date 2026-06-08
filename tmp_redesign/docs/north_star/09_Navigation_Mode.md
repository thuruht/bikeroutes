# Active Navigation Mode

The Active Navigation Mode upgrades the BikeRoutes.org Route Builder into a live, in-ride assistant.

## Core Features

### 1. Route Customization (Costing Options)
Users can toggle routing preferences before scouting a route. These toggles directly influence the Valhalla `bicycle` costing model in the backend:
- **Minimize Hills:** Sets Valhalla's `use_hills` parameter to `0.1` (default is `0.5`).
- **Avoid Roads:** Sets Valhalla's `use_roads` parameter to `0.1` (default is `0.5`).
- **Paved Only:** Sets Valhalla's `bicycle_type` to `Road` and `avoid_bad_surfaces` to `0.9`.

These toggles are available in the Sidebar under a new "Route Options" section. When toggled, if a route is currently active, it will automatically re-fetch the route using the new options.

### 2. Turn-by-Turn Maneuvers
When a route is fetched, the frontend extracts the `trip.legs[0].maneuvers` array from the Valhalla response.
- A new UI component, `<TurnByTurnList />`, renders these instructions in the Sidebar.
- Instructions display the maneuver text (e.g., "Turn right onto Oak St") along with the distance for that specific leg.

### 3. "Start Ride" Mode
When a route is scouted, the user can click a **START RIDE** button in the Sidebar. Entering this mode triggers the following UX changes:
- The Sidebar search and surface filters are hidden to prioritize the `TurnByTurnList`.
- The "START RIDE" button becomes a red "END RIDE" button.
- The MapLibre map programmatically activates the `GeolocateControl` to lock the camera to the user's live GPS coordinates.
- A live blue GPS dot indicates the user's progress along the glowing tactical path.

## Compatibility & Architecture
- **State Management:** Route options and `isNavigating` state are lifted to `App.jsx` to ensure both `Sidebar.jsx` and `MapView.jsx` react seamlessly.
- **Backend:** The `/api/route` endpoint accepts an optional `options` object in the POST body to dynamically override the default `costing_options` in the Valhalla request payload.
- **GPS:** We leverage MapLibre's native `GeolocateControl` which has built-in high-accuracy GPS tracking and camera-following capabilities, avoiding the need for a complex custom `navigator.geolocation` loop.
