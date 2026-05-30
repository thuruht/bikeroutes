# Interactive Route Builder

The Interactive Route Builder is the core feature of BikeRoutes.org, allowing users to drop custom waypoints on the map and instantly receive an optimal tactical bike route powered by Valhalla.

## Architecture

The system operates using a hybrid frontend-backend architecture:

1. **Frontend Interaction (`MapView.jsx` & `App.jsx`)**
   - The user clicks on the MapLibre canvas, triggering an `onClick` event.
   - Up to two waypoints (Start/A and End/B) are captured and stored in the global `App.jsx` state.
   - When exactly two waypoints are present, the frontend dispatches a `POST` request to the Cloudflare Worker backend at `/api/route`.

2. **Routing Engine (`worker/src/routes/route.ts` & Valhalla)**
   - The Cloudflare Worker acts as a proxy and cache layer.
   - It forwards the request to the Valhalla routing container using Cloudflare's new Containers API.
   - Valhalla processes the waypoints using the `bicycle` costing model (optimized for the Midwest OSM tile extract).
   - Valhalla returns the optimal route as an encoded `polyline6` string to minimize payload size.
   - The Worker caches the response in Cloudflare KV for 24 hours (hashed by request body) and logs the request to D1.

3. **Rendering (`polyline.js` & `MapView.jsx`)**
   - The frontend receives the encoded polyline and decodes it using `lib/polyline.js` into standard GeoJSON coordinate arrays `[longitude, latitude]`.
   - The geometry is assigned to a MapLibre GeoJSON Source (`route-source`).
   - Two distinct layers render the route:
     - `route-glow`: A wide, semi-transparent base that gives the path a neon tactical glow.
     - `route-core`: A sharp inner line for exact precision.
   - Finally, Valhalla's route summary (distance in km, time, elevation) is pushed up to `App.jsx` and piped down into `Sidebar.jsx` for the user to view.

## Fallback & Mocking
If the Valhalla container is offline or currently crunching new OSM extracts, the backend will catch the failure and return a `mock` route JSON. This ensures the frontend UI can still be developed, verified, and demonstrated without relying on heavy C++ routing dependencies during iteration.

## Clearing the Route
Users can reset their scouting session via the `Clear` button in the Sidebar. This triggers `onClearRoute()` in `App.jsx`, which flushes the `waypoints` array. `MapView.jsx` reacts by purging the waypoint markers and resetting the GeoJSON source to an empty `FeatureCollection`.

## Active Navigation
The Route Builder is being upgraded into an Active Navigation system. See [Active Navigation Mode](file:///home/jojo/Desktop/DEVV/bikeroutes/docs/navigation_mode.md) for architecture details on route customization, turn-by-turn maneuvers, and live GPS integration.
