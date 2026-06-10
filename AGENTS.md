# AGENTS.md — BikeRoutes.org

## Architecture
- **Frontend**: React + Vite + MapLibre GL JS (`frontend/`)
- **Backend**: Cloudflare Worker + Hono (`worker/`)
- **Infra**: D1, KV (3), R2 (2), Vectorize, Durable Objects (3), Containers (1), Workers AI
- **Build flow**: `frontend npm run build` → outputs to `worker/public/` → `worker npm run deploy`

## Exact Commands (order matters)

```bash
# Development
cd frontend && npm run dev          # Vite dev server :5173, proxies /api to :8787
cd worker && npm run dev            # Wrangler local dev

# Build (MUST run before deploy)
cd frontend && npm run build        # SPA → worker/public/

# Verify
cd worker && npx tsc --noEmit       # Type-check. Must pass before deploy.
cd worker && npm run check          # tsc + wrangler deploy --dry-run

# Deploy (runs D1 migrations automatically via predeploy)
cd worker && npm run deploy

# Deploy when Docker is unavailable (skips Valhalla container build)
cd worker && npx wrangler deploy --containers-rollout=none

# Tail logs
cd worker && wrangler tail
```

## Git State & Workflow
- **Commit often, push often** — regressions from lost work kill progress. Every meaningful change gets committed and pushed immediately.
- `origin/main` often has merged PRs that delete V3 files. **Always merge with `-X ours`** to preserve local redesign.
- Detached commits (`9a57fbc`, `2e2ac96`) exist from earlier redesign attempts. They are NOT on any branch.
- `design_handoff_backend/` is the **V3 aesthetic source of truth**. Port from it; do not ship it directly.

## Environment & Secrets
- **`worker/.dev.vars`** = local-only. **Never deployed.**
- **Production secrets** via `wrangler secret put NAME`. Current secrets: `ADMIN_SECRET`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`.
- **D1 migrations** live in `worker/migrations/`. `predeploy` applies them remotely. If code references new tables, **create a migration first** or production throws "table not found".
- `ADMIN_SECRET` = `2GxyyUw9mCW1/6MWu7/P0GyjjzV9J0nIPh+qMhN9vVE=` (set as production secret, also in `.dev.vars`).

## Routing & API Contract
- `/api/geocode?q=` — Nominatim proxy (cached via KV)
- `/api/reverse?lat=&lon=` — reverse geocode proxy (cached via KV)
- `/api/route` — Valhalla container → FOSSGIS → BRouter fallback chain
- `/api/search?q=` — semantic search via Vectorize + Workers AI
- `/api/tiles/*.pmtiles` — PMTiles range proxy from R2
- `/api/features?category=|type=` — GeoJSON from `trails` D1 table. `type=trail` includes all OSM + MARC bikeway categories; `type=rail` covers railway, station, halt, light_rail, tram. Optional `?bbox=south,west,north,east`
- `/api/admin/ingest` — OSM Overpass or D1→Vectorize seeding (admin-protected). Supports `?types=trail,rail` param
- `/api/admin/sync-gis` — MARC ArcGIS POI sync (admin-protected)
- `/api/poi/categories` — POI category list

## Frontend: Panel Views
The UI has two panel modes controlled by `view` state:

### Plan (`view === "plan"`)
- GeoInput waypoints with autocomplete (/api/geocode)
- Route preference segmented control (balanced/quiet/fast)
- Route summary, elevation chart, turn-by-turn directions, export (GPX/KML)
- Map click to add waypoints, drag markers, reverse waypoints

### Explore (`view === "explore"`)
- Search bar calls `/api/search` for semantic POI search (Vectorize + Workers AI)
- Results show name, category, match %
- Click a result → map flies to that POI
- Separate `ExploreView` component in `App.jsx`

## Data Stores: Current State
All seeded and live for KC metro area:

| Store | Contents | Source |
|-------|----------|--------|
| D1 `pois` table | OSM trails + MARC POIs (restrooms, bike hubs, food, stadiums, trail access points) | Overpass API + MARC ArcGIS |
| D1 `trails` table | Full GeoJSON geometries for trails, bikeways (11 facility types), MetroGreen corridors, railways, stations | Overpass API (`out center 500`) + MARC ArcGIS |
| Vectorize `bikeroutes-trails` | AI embeddings of all POIs + trail features | OSM ingest + MARC sync |
| KV `ROUTE_CACHE` | Cached route responses | /api/route |
| KV `RATE_LIMITS` | Per-IP rate limit counters | middleware |

Production counts as of June 2026:
- **Bikeways (MARC ArcGIS)**: ~4,600 features across shared_use_path (1,577), bike_lane (358), separated_bike_lane (34), marked_bike_route (748), mountain_bike (263), equestrian_trail (140), paved_shoulder (44), walking_trail (550), bikeway fallback (495)
- **MetroGreen corridors**: 705 existing segments (of 1,662 total including planned)
- **Trail access points**: 1,062 (in `pois` table)
- **OSM cycleways**: 774 + **OSM paths**: 8
- **Railway lines**: 1,099 + **Junctions**: 59 + **Stations**: 4
- **MARC POIs**: restrooms, bike hubs, BBQ/food, stadiums

## MARC ArcGIS Sources
All endpoints on `gis2.marc2.org` support `f=geojson&outSR=4326` for WGS84 output:

| Service | Layer | Features | Map |
|---------|-------|----------|-----|
| BikewaysAndTrails | 10 (combined) | 4,605 | `shared_use_path`, `bike_lane`, `separated_bike_lane`, `paved_shoulder`, `marked_bike_route`, `walking_trail`, `mountain_bike`, `equestrian_trail`, `national_historic_trail`, `share_the_road` |
| Metrogreen_Corridors | 0 | 1,662 | MetroGreen regional trail plan (Existing/Planned) |
| Trail_Address | 0 | 1,062 | Trailhead access points |
| PublicRestrooms | 0 | — | Park restrooms (in existing sync-gis) |
| RideKCBikehubs | 0 | — | Bike share hubs (in existing sync-gis) |
| WorldCup | 1, 4 | — | BBQ/food + stadiums (in existing sync-gis) |

### MARC Ingestion
- Sync module: `worker/src/tasks/sync-marc-bikeways.ts`
- Handles pagination via `resultOffset` (maxRecordCount per layer varies: 1000-5000)
- Dedup via `INSERT OR IGNORE` with `marc:bikeway:`, `marc:metrogreen:`, `marc:trail_access:` ID prefixes
- Vectorize embedding batches at 100, upsert batches at 100
- Trigger: `POST /api/admin/sync-gis` (X-Admin-Secret) or daily cron

## Brand / UI Decisions (implemented)
- **No always-visible nav bar** — placeholder nav links and privacy badge removed from desktop. Single info button (ℹ️) opens a modal with: wordmark, nav links (Plan/Explore/Map data/About), privacy notice, version chip, tagline.
- **Wordmark** is clickable → opens info modal.
- **Reki deer head** SVG in wordmark "i" dot uses viewBox `0 -3 172 172` (centered, no antler clipping). Same viewBox in the mascot component.
- **Modal wordmark** rendered at 28px via `.modal .wordmark { font-size: 28px; display: flex; justify-content: center; }`.
- **Typography**: Outfit heading font, IBM Plex Sans body.
- **Theme toggle**: sun/moon buttons, persisted in localStorage `br-theme`.

## Known Gotchas
- **Valhalla container** is alpha (`@cloudflare/containers` v0.1.0). Docker must be running locally for `wrangler deploy` to build it. Use `--containers-rollout=none` to skip; routing falls back to FOSSGIS then BRouter.
- **BRouter fallback** converts GeoJSON to synthetic Valhalla trip format so frontend parsing code works unchanged.
- **Frontend geocoding** goes through `/api/geocode` proxy (KV-cached), not directly to Nominatim.
- **Tiles 404** means no `.pmtiles` file exists in R2 yet. Data ingestion issue, not a code bug.
- **Workers AI model names** (`@cf/baai/bge-base-en-v1.5`) can change. Verify in Cloudflare dashboard if `/api/search` throws model-not-found.
- **`worker-configuration.d.ts`** is auto-generated by `wrangler types`. Regenerate after changing `wrangler.jsonc` bindings.
- **OSM Overpass** requires `User-Agent` header; missing header causes 406 errors.
- **Ingest deduplication** uses `INSERT OR IGNORE` by name+coords to avoid duplicates.
- **Daily cron** (3AM UTC) runs MARC GIS sync + OSM data sync to keep trails, bridges, rail, construction fresh.
- **Bridges & construction**: Overpass query covers footbridges, mixed-use bridges (`bridge=yes` + `highway=path/cycleway`), and construction sites (`highway=construction` + `construction=cycleway/path/footbridge`). New segments get picked up daily.
- **CSP** must allow `static.cloudflareinsights.com` (script-src) and `cloudflareinsights.com` (connect-src) for Cloudflare Web Analytics. Both `frontend/public/_headers` and `worker/public/_headers` must stay in sync.

## Testing Production
```bash
curl https://bikeroutes.org/api/health          # D1/KV/R2 checks
curl "https://bikeroutes.org/api/geocode?q=test" # Nominatim proxy
curl "https://bikeroutes.org/api/reverse?lat=39&lon=-94"
curl -X POST https://bikeroutes.org/api/route \
  -H "Content-Type: application/json" \
  -d '{"locations":[{"lat":39.1,"lon":-94.6},{"lat":39.0,"lon":-94.5}],"costing":"bicycle"}'
curl "https://bikeroutes.org/api/search?q=trail"
curl https://bikeroutes.org/api/donate/stats
curl https://bikeroutes.org/api/poi/categories
```

## Next Steps (proposed)
1. Make remaining nav links functional: "Map data" (tile attribution / data sources), "About" (project info)
2. Wire tile hosting from R2 bucket to replace CARTO tile dependency
3. Build "Saved routes" feature (D1-backed)
4. Add POI markers on map for explore results
5. Donate flow: PayPal integration behind `/api/donate`

## Style
- Hono routers in `worker/src/routes/`. Use `logger` from `../lib/logger` for structured JSON logs.
- Frontend: no CSS Modules — plain CSS files (`styles.css`, `index.css`).
- Mascot voice: friendly, deer/nature puns, ends with 🦌.
- Commit format: `type: description` (e.g. `feat:`, `fix:`, `chore:`).
