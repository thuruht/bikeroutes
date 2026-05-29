# BikeRoutes.org – Updated Open‑Source, Cloudflare‑Workers Trail Navigation Platform

## Goal Description
We will build a **free, donation‑driven, open‑source** bike‑navigation platform hosted on Cloudflare Workers. The stack is now locked in as:
- **Map library:** **MapLibre GL JS** (WebGL vector‑tile rendering)
- **Routing engine:** **Valhalla** (Docker container, bike‑specific profiles)
- **Tile provider:** **Dockerized Cloudflare tile host** (self‑hosted OSM tiles, leveraging your paid Cloudflare plan)
- **Mascot:** *Unidentified animal* – we will brainstorm the final mascot later.

## User Review Required
> **[!IMPORTANT]** Please confirm the above selections. If you would like to change any component, let me know now.
>
> - Map library: MapLibre GL JS ✅
> - Routing engine: Valhalla ✅
> - Tile source: Self‑hosted Docker tile server on Cloudflare (paid tier) ✅
> - Mascot: TBD (unidentified animal) ✅
>
> Reply with **“All set”** to proceed, or list any adjustments.

## Open Questions
1. **Donation UI:** PayPal link, GitHub Sponsors, or custom “free‑t‑shirt” form?
2. **Tile refresh cadence:** Daily OSM extract import via a cron job, or on‑demand?
3. **Community features:** Chat, user‑submitted trail uploads, rating system?
4. **Vectorize usage:** Will you store trail descriptions as embeddings for semantic search?

## Proposed Changes (concrete file actions)
---
### Frontend (React + Vite)
- **[NEW]** `frontend/` – scaffolded from `templates/vite-react-template`.
- **[NEW]** `frontend/src/components/Map.jsx` – MapLibre GL component loading vector tiles from the self‑hosted tile worker.
- **[NEW]** `frontend/src/components/DonateBanner.jsx` – simple donation CTA.
- **[NEW]** `frontend/public/mascot-placeholder.png` – placeholder image for the future mascot.

### Workers Backend
- **[MODIFY]** `cloudflare-docs/wrangler.jsonc` – add KV namespace `TRAILS`, Vectorize binding `TRAIL_VEC`, durable object `RoutingDO`, and a **Docker‑tile** binding pointing to the self‑hosted tile service.
- **[NEW]** `cloudflare-docs/src/routes.ts` – endpoints:
  - `GET /tiles/*` – proxy to the Docker tile worker.
  - `GET /route` – forwards to Valhalla container via a Cloudflare Tunnel.
  - `GET /search` – queries Vectorize index.
  - `POST /donate` – records donation info in KV and triggers Kumo email.
- **[NEW]** `cloudflare-docs/src/agents/ingestion.ts` – periodic OSM extract ingestion (cron via Workers scheduled events).

### Routing Service (Docker)
- **[NEW]** `routing/valhalla/` – copy of the Valhalla source from `DEVV/valhalla` with a Dockerfile tuned for bike profiles.
- **[NEW]** `routing/docker-compose.yml` – brings up the Valhalla service and a tiny HTTP wrapper for the Workers tunnel.

### Tile Server (Docker on Cloudflare)
- **[NEW]** `tiles/` – clone of `DEVV/openstreetmap-tiles-docker`.
- **[NEW]** `tiles/Dockerfile` – builds the tile server image.
- **[NEW]** `tiles/config/custom_style.json` – style that highlights bike lanes, trails, and elevation contours.
- **[NEW]** Cloudflare Workers **Docker‑tile** worker (`worker/tiles-worker.ts`) that forwards requests to the Docker container.

### Mascot (placeholder)
- **[NEW]** `assets/mascot/placeholder.svg` – generic silhouette; will be replaced after brainstorming.

---
## Verification Plan
### Automated
- `npm run test` in the Vite‑React frontend (provided by `vite-react-template`).
- Deploy the Workers preview (`wrangler preview`) and hit `/route` with sample coordinates – expect a valid GeoJSON route.
- Request `/tiles/0/0/0.pbf` (or PNG) and verify the tile server returns data.
- Run a Vectorize similarity query via `/search` and confirm a result set.

### Manual
- Open the site, confirm the MapLibre map loads with the custom bike‑trail style.
- Plan a short bike route and see turn‑by‑turn instructions.
- Submit a mock donation and verify a KV entry appears; optionally check a Kumo‑generated email.
- Verify the mascot placeholder appears in the UI.

---
## Next Steps (once approved)
1. Create the workspace at `/home/jojo/.gemini/antigravity-ide/scratch/bikeroutes/`.
2. Clone the selected templates (frontend, workers, Valhalla, tile server).
3. Generate the mascot placeholder image.
4. Wire up the Workers bindings and Docker services.
5. Set up CI/CD using the `workflows-starter-template`.

Please confirm the choices or let me know any adjustments.
