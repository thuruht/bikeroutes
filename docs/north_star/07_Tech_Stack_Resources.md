# 7. Tech Stack & Resources

Here is a comprehensive list of all the libraries, frameworks, tools, and services used in the BikeRoutes project, along with their GitHub repositories and official documentation.

## Frontend Frameworks & Libraries

| Resource | Description | GitHub Repository | Documentation |
| :--- | :--- | :--- | :--- |
| **React** | UI library | [facebook/react](https://github.com/facebook/react) | [react.dev](https://react.dev) |
| **Vite** | Build tool & dev server | [vitejs/vite](https://github.com/vitejs/vite) | [vitejs.dev](https://vitejs.dev) |
| **MapLibre GL JS** | Open-source map rendering | [maplibre/maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js) | [maplibre.org/maplibre-gl-js/docs](https://maplibre.org/maplibre-gl-js/docs/) |
| **MapLibre GL Directions** | Routing control for MapLibre | [maplibre/maplibre-gl-directions](https://github.com/maplibre/maplibre-gl-directions) | [Docs](https://github.com/maplibre/maplibre-gl-directions#readme) |
| **uPlot** | Exceptionally fast, tiny time series chart for Elevation Profiles | [leeoniya/uPlot](https://github.com/leeoniya/uPlot) | [Docs](https://github.com/leeoniya/uPlot#readme) |
| **@mapbox/polyline** | Decodes Valhalla routing polylines | [mapbox/polyline](https://github.com/mapbox/polyline) | [Docs](https://github.com/mapbox/polyline#readme) |
| **togpx** | Converts GeoJSON routes to GPX for device export | [tyrasd/togpx](https://github.com/tyrasd/togpx) | [Docs](https://github.com/tyrasd/togpx#readme) |
| **@turnstile/react** | Cloudflare CAPTCHA alternative to prevent form/API spam | [cloudflare/turnstile](https://github.com/cloudflare/turnstile) | [Turnstile Docs](https://developers.cloudflare.com/turnstile/) |

## Backend Frameworks & Cloudflare Services

| Resource | Description | GitHub Repository | Documentation |
| :--- | :--- | :--- | :--- |
| **Cloudflare Workers** | Serverless compute platform | [cloudflare/workers-sdk](https://github.com/cloudflare/workers-sdk) | [Workers Docs](https://developers.cloudflare.com/workers/) |
| **Hono** | Ultrafast web framework for the Edge (API Routing) | [honojs/hono](https://github.com/honojs/hono) | [hono.dev](https://hono.dev) |
| **Cloudflare D1** | Serverless SQL database (SQLite) for POIs & Trails | N/A | [D1 Docs](https://developers.cloudflare.com/d1/) |
| **Cloudflare KV** | Key-Value global storage (Route Caching) | N/A | [KV Docs](https://developers.cloudflare.com/kv/) |
| **Cloudflare Vectorize** | Vector database for semantic search | N/A | [Vectorize Docs](https://developers.cloudflare.com/vectorize/) |
| **Cloudflare Durable Objects** | Strongly consistent state storage (Moderation queues) | N/A | [Durable Objects Docs](https://developers.cloudflare.com/durable-objects/) |
| **Cloudflare Containers** | Containerized workloads on Edge | N/A | [Containers Docs](https://developers.cloudflare.com/containers/) |
| **Cloudflare Tunnels (cloudflared)** | Secure connection to VPS Valhalla instance | [cloudflare/cloudflared](https://github.com/cloudflare/cloudflared) | [Tunnels Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) |

## Routing, Maps & Data

| Resource | Description | GitHub Repository | Documentation |
| :--- | :--- | :--- | :--- |
| **Valhalla** | Open-source routing engine | [valhalla/valhalla](https://github.com/valhalla/valhalla) | [valhalla.github.io](https://valhalla.github.io) |
| **OpenStreetMap** | Global map data source | [openstreetmap/openstreetmap-website](https://github.com/openstreetmap/openstreetmap-website) | [wiki.openstreetmap.org](https://wiki.openstreetmap.org) |
| **OSM Tile Server** | Self-hosted tile rendering | [Overv/openstreetmap-tile-server](https://github.com/Overv/openstreetmap-tile-server) | [Switch2OSM Docs](https://switch2osm.org/serving-tiles/) |

## Tooling & APIs

| Resource | Description | GitHub Repository | Documentation |
| :--- | :--- | :--- | :--- |
| **TypeScript** | Typed JavaScript | [microsoft/TypeScript](https://github.com/microsoft/TypeScript) | [typescriptlang.org](https://www.typescriptlang.org/) |
| **ESLint** | JS/TS Linter | [eslint/eslint](https://github.com/eslint/eslint) | [eslint.org](https://eslint.org/) |
| **Wrangler** | CLI for Cloudflare Workers | [cloudflare/workers-sdk](https://github.com/cloudflare/workers-sdk) | [Wrangler Docs](https://developers.cloudflare.com/workers/wrangler/) |
| **PayPal JS SDK** | Payments integration for donations | [paypal/paypal-js](https://github.com/paypal/paypal-js) | [PayPal Developer Docs](https://developer.paypal.com/docs/business/javascript-sdk/) |
| **Printful API** | Print-on-demand fulfillment for T-shirts/Hoodies | N/A | [Printful Developers](https://developers.printful.com/docs/) |
