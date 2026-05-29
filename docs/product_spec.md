# BikeRoutes.org Product & Technical Brainstorm

## 1️⃣ Target Audience & Pain Points

### Urban Commuters
- **Needs:** Reliable routing on bike lanes & protected paths; real‑time hazard awareness.
- **Frustrations:** Google Maps defaults to car‑centric routes; lane‑type clarity missing; “avoid highways” ineffective for bikes.
- **Key Features:** Turn‑by‑turn with bike‑lane preference, surface‑type filters, saved commute routes.

### Recreational Road Cyclists
- **Needs:** Smooth pavement, low‑traffic roads, loop routes with distance/elevation targets.
- **Frustrations:** Inaccurate/missing elevation data; lack of loop‑planning tools; apps don’t distinguish paved vs. gravel.
- **Key Features:** Elevation profile, loop‑builder, GPX export, distance/climb filters.

### Gravel Riders
- **Needs:** Mixed‑surface routing; know % of dirt/gravel vs. paved.
- **Frustrations:** Apps only know paved roads; OSM data gaps on rural roads.
- **Key Features:** Surface‑breakdown summary per route, trail‑type filters, community surface corrections.

### Mountain Bike Riders
- **Needs:** Trail difficulty ratings (green/blue/black), flow direction on one‑way trails, parking/trailhead POIs.
- **Frustrations:** General bike maps lump MTB trails with road routes; stale trail data.
- **Key Features:** MTB‑specific Valhalla profile/custom costing, difficulty overlay, user‑submitted POIs.

### Touring Cyclists
- **Needs:** Multi‑day route planning; water, food, lodging, bike‑shop POIs along route.
- **Frustrations:** No overnight‑planning tools; GPX import/export gaps; no offline option.
- **Key Features:** GPX export with waypoints, POI layers, route segmenting across days.

### Tourists & Casual Riders
- **Needs:** “Show me a nice ride near me” discovery; low cognitive load.
- **Frustrations:** Overwhelming UIs; too many options; no curated routes.
- **Key Features:** Semantic trail search (e.g., *flat family ride near downtown*), featured/curated routes, simple mobile UI.

### Local Advocates & Trail Planners
- **Needs:** Heatmaps showing where riders actually go; gap analysis in trail networks.
- **Frustrations:** No public‑facing analytics; hard to export/share route data.
- **Key Features:** Heatmap layer, route‑contribution tools, shareable route links, embed capability.

## 2️⃣ Core Feature Recommendations
| Feature | Priority | Verdict |
|---------|----------|---------|
| Interactive draw‑your‑route | MVP | Keep |
| Elevation profile panel | MVP | Keep |
| Trail‑type filters | MVP | Keep |
| Responsive mobile‑first UI | MVP | Keep |
| Donation CTA (PayPal) | MVP | Keep |
| Daily OSM data sync | MVP | Keep |
| Semantic trail search | MVP | Keep |
| GPX/KML export | MVP | Keep |
| Turn‑by‑turn voice guidance | Phase 2 | Delay |
| User‑submitted POIs | Phase 2 | Improve then ship |
| Heatmap of popular routes | Phase 2 | Delay |

### Feature Details (MVP)
- **Interactive Draw‑Your‑Route** – Use `@maplibre/maplibre-gl-directions` for waypoint dragging, debounce Valhalla calls (300 ms). Store in‑progress routes in Durable Objects.
- **Elevation Profile Panel** – Decode Valhalla polyline (`@mapbox/polyline`), render with `uplot` for a tiny bundle.
- **Trail‑Type Filters** – Pass surface costing to Valhalla bike profile; UI chips for Paved / Gravel / Dirt / MTB.
- **Semantic Trail Search** – Rate‑limit via KV token‑bucket; embed queries server‑side before hitting Vectorize.
- **GPX/KML Export** – Client‑side `togpx` conversion from GeoJSON.
- **Donation CTA** – PayPal JS SDK in a slide‑up drawer, backed by a Worker that creates/captures orders.

## 3️⃣ Technical Design
### Connecting Valhalla to Cloudflare Workers
- Deploy Valhalla in a Docker container on a cheap VPS (e.g., Hetzner CX21) **or** expose it via Cloudflare Tunnel (`cloudflared`).
- Workers call Valhalla with `fetch()`; cache responses in KV (`ROUTE_CACHE`) for 24 h (hash request body → cache key).
```js
const cacheKey = await sha256(JSON.stringify(body));
const cached = await env.ROUTE_CACHE.get(cacheKey, 'json');
if (cached) return Response.json(cached);
const res = await fetch(VALHALLA_URL, {method:'POST',body:JSON.stringify(body)});
await env.ROUTE_CACHE.put(cacheKey, await res.text(), {expirationTtl:86400});
return res;
```
### Caching Tile Requests
- Use Cloudflare Cache API (`caches.default`) inside the tile Worker. Set `Cache-Control: public, max‑age=86400`.
- After daily OSM import, purge cache via Cloudflare Cache‑Purge API (triggered by a scheduled Worker).
### Worker Bindings (`wrangler.toml`)
```toml
[[kv_namespaces]]
binding = "ROUTE_CACHE"
[[kv_namespaces]]
binding = "RATE_LIMITS"
[[vectorize]]
binding = "TRAIL_SEARCH"
[[durable_objects.bindings]]
name = "POI_STORE"
class_name = "POIStore"
[[durable_objects.bindings]]
name = "ROUTE_SESSION"
class_name = "RouteSession"
```
### Rate‑Limiting Semantic Search
- Token bucket stored in `RATE_LIMITS` KV (key = IP). Allow 10 queries/min.
- Use `waitUntil()` to update bucket without blocking response.
- Optional first‑request Turnstile challenge (`@turnstile/react`).
### PayPal Integration Security
- Never expose client secret; Worker creates order (`/api/paypal/create-order`) and captures (`/api/paypal/capture-order`).
- Store `PAYPAL_CLIENT_ID` & `PAYPAL_CLIENT_SECRET` as Cloudflare secrets.
- Client renders Smart Buttons via `@paypal/paypal-js` and passes `orderID` from Worker.
### Daily OSM Import & Tile Refresh
- Cron Worker at `0 3 * * *` triggers a webhook on the VPS to start `osm2pgsql` & tile rebuild.
- Use blue/green tile directory swap; purge Cloudflare cache after swap.
- Heartbeat KV key `LAST_IMPORT_SUCCESS` for health checks.
### MapLibre Mobile Performance
- Prefer vector tiles; lazy‑load optional layers (MTB, heatmap).
- Debounce map move events (300 ms) before requesting new routes.
- Keep bundle < 350 KB gzipped; Vite + tree‑shaking.

## 4️⃣ Mascot Candidates (Midwest‑USA animal)
| Animal | Tagline | Why it fits |
|--------|---------|-------------|
| 🦡 **Badger** – *Badge* | “Badge knows every path.” | Tough, determined, native to Midwest plains; conveys grit for gravel riders.
| 🦊 **Red Fox** – *Rusty* | “Find the smarter route.” | Clever, fast, adaptable; seen in both urban parks & rural trails.
| 🦌 **White‑Tailed Deer** – *Scout* | “Every trail has a story.” | Quintessential Midwestern forest animal; evokes open‑space riding.
| 🦝 **Raccoon** – *Remy* | “Ride everywhere, leave no trail unturned.” | Urban + wild; beloved mascot archetype, good for community vibe.
| 🐿️ **Prairie Dog** – *Dot* | “Your neighborhood trail guide.” | Hyper‑local Midwest icon; community‑building behavior mirrors user contributions.

*Top recommendation for immediate visual flexibility:* **Red Fox** – clean silhouette, strong brand potential.

## 5️⃣ Community & Donation Model
### UX for Donations
- Non‑blocking banner appears after first completed route (“You just planned a 14‑mile ride. BikeRoutes.org is free forever. Help keep it that way ☕”).
- Banner triggers a slide‑up drawer with PayPal Smart Buttons.
- Heart icon in nav shows donation status (no badge count, no guilt).
### PayPal CTA Integration
- Three tiers: $3 (Coffee), $10 (Trail Supporter), $25 (Route Builder).
- Worker endpoint creates order; client renders button via `@paypal/paypal-js`.
### Free T‑Shirt Incentive (≥ $25)
1. Collect mailing address in a form (encrypt & store in KV with UUID claim token).
2. Send confirmation email via Cloudflare Email Workers (or free Mailgun).
3. Fulfill via Printful API – no inventory, on‑demand printing.
### Encouraging Contributions
- **Contribution Badges** (magic‑link email login, no full account):
  - 🗺️ *Pathfinder* – first submitted route
  - 📍 *Scout* – 5 POIs submitted
  - 🔧 *Wrench* – surface tag corrected
  - 🌟 *Trail Champion* – 25+ accepted contributions
- Display community counters on homepage (e.g., “X routes contributed this month”).
- One‑click “Report inaccuracy” on routes → Durable Object moderation queue.
### Seasonal Campaigns
- **Bike Month (May):** “Every donation funds a new OSM import region.” Progress bar displayed.
- **Giving Tuesday:** Matching campaign messaging.
- **Winter:** “Keep the trails alive in the off‑season.”
### Ethical Messaging
- Show exact cost breakdown (e.g., Tile server $30/mo, Valhalla VPS $12/mo).
- Avoid dark‑patterns: no countdown timers, no “your access expires” language.
- Clearly state: *BikeRoutes.org will always be free. Donations keep it independent.*

---
*This document serves as the definitive product & technical spec for the BikeRoutes.org open‑source platform.*
