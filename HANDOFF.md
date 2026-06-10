# BikeRoutes.org — Agent Handoff

**Branch:** `claude/bold-volta-gtbz5j`
**Last session:** redesign from design handoff zip (`bikeroutes.org_v3.zip`)

---

## What was done this session

### Frontend (`frontend/src/`)
- `index.css` — full design token system (tokens.css + styles.css merged). Bunny Fonts @import (NOT Google). Dark tactical theme is primary brand expression.
- `App.jsx` (757 lines) — full LiveApp port from `final-app.jsx`. Multi-waypoint routing, draggable markers, PlaceSearch, elevation scrub → map dot, turn hover → locate, GPX/KML export, privacy badge, scale bar + coordinate readout, zoom controls, theme toggle.
- `lib/api.js` (373 lines) — `BR` object: `BR.route(points, pref)`, `BR.geocode(q)`, `BR.reverse(lng,lat)`, `BR.pointAtFrac`, `BR.fmtKm`, `BR.fmtTime`. Worker `/api/*` endpoints first, BRouter public fallback, straight-line estimate as final fallback. **Never dead-ends.**
- `components/BrandSprite.jsx` — canonical vector SVG sprite (`#mark-b`, `#mark-b-solid`, `#pin-wing`, `#reki`, `#reki-head`, `#reki-sil`). Render once near root, reference anywhere with `<svg><use href="#mark-b" /></svg>`.

### Shell
- `index.html` — proper OG/Twitter meta, theme-color, SVG favicon ref, Bunny Fonts preconnect, web manifest link. Removed Inter font (wrong brand), added IBM Plex Sans + IBM Plex Mono via Bunny.
- `public/favicon.svg` — replaced purple blob with the real b-wheel mark (dark-hoof bg, cream B, blaze-orange dot).
- `public/site.webmanifest` — PWA manifest with brand colors.
- `public/_headers` — updated CSP: allows Bunny Fonts (not Google), OSM tiles, BRouter, Valhalla, blob: workers.

### Worker (`worker/src/`)
- `routes/geocode.ts` — NEW: `GET /api/geocode?q=`, `GET /api/reverse?lng=&lat=`. Proxies Nominatim with proper `User-Agent` (OSM policy compliance). Caches in `GEO_CACHE` KV (geocode 30d, reverse 7d). Graceful fallback on error.
- `index.ts` — wired geocodeRoutes at `/api`.

---

## What's still TODO

### Immediate (before ship)
- [ ] **`main.jsx`** — render `<BrandSprite />` once before `<App />` so `<use href="#reki-head" />` etc. resolve. Just add `import BrandSprite from './components/BrandSprite'` and put `<BrandSprite />` inside the root render.
- [ ] **PlaceSearch component** — the agent inlined it inside App.jsx. Consider extracting to `components/PlaceSearch.jsx` for cleanliness (not blocking).
- [ ] **Reki.jsx / components** — the old standalone components (GeoInput, Summary, Turns, Elevation) now have inline equivalents inside App.jsx. The standalone files weren't updated. They're unused by the new App but they're still there — either delete or leave (won't affect build since App.jsx doesn't import them).

### Worker (Milestone 2 — not blocking MVP)
- [ ] `/api/route` response adapter — currently passes Valhalla JSON raw. Frontend `api.js` already adapts it, but a richer adapter in the Worker would enable caching the normalised shape.
- [ ] `/api/search` Vectorize integration — rate limiter is wired, but needs a real TRAILS_INDEX population.
- [ ] `/api/poi` D1 read + Durable Object write path.
- [ ] `/api/donate/*` PayPal + Printful (secrets already in wrangler secrets, not hardcoded).

### Infrastructure
- [ ] Valhalla container — currently using public FOSSGIS endpoint. The container image + `wrangler.jsonc` container binding exists but isn't deployed yet.
- [ ] OSM tile R2 bucket — `/api/tiles` proxies to OSM upstream. Self-hosting needs the tile import job.
- [ ] Vectorize index population (TRAILS_INDEX) — run the embed job from `scripts/`.

---

## Key design rules (never break)
1. **Bunny Fonts only — never Google.** `fonts.bunny.net`
2. **Dark tactical is primary** — `data-theme="dark"` on `<html>`, persisted in `localStorage` under `br-theme`.
3. **Never dead-end the UI** — `source:"estimated"` straight-line always fires if all routing fails.
4. **No secrets in the browser** — PayPal/Printful keys are Worker secrets only.
5. **Rich data in, calm UI out** — return full arrays from the Worker; the panel shows minimal UI. Never add permanent always-on panels; use progressive disclosure.
6. **CORS locked to bikeroutes.org** (+ localhost:5173 for dev).
7. **Brand tokens** are in `index.css` `:root` — never hardcode hex values in components.

---

## File map (quick ref)
```
frontend/
  index.html               shell — OG tags, Bunny fonts, manifest
  public/
    favicon.svg            b-wheel mark (SVG, on-brand)
    _headers               CSP, cache headers
    site.webmanifest       PWA manifest
  src/
    main.jsx               root — ADD <BrandSprite /> here
    index.css              design tokens + all component styles
    App.jsx                full LiveApp (757 lines)
    lib/api.js             BR data layer (373 lines)
    components/
      BrandSprite.jsx      SVG sprite — render once near root

worker/src/
  index.ts                 Hono router
  routes/
    geocode.ts             /api/geocode + /api/reverse  ← NEW
    route.ts               /api/route  (Valhalla proxy + KV cache)
    search.ts              /api/search (Vectorize, rate-limited)
    tiles.ts               /api/tiles  (R2/OSM proxy)
    donate.ts              /api/donate (PayPal)
    poi.ts                 /api/poi    (D1 + DO)
```

---

## Update — June 09 2026 (`claude/dreamy-brown-i56fmh`)

The **v1.0 brand package** (Brand Marks — Final, "Approved · v1.0" + Design System page) is now integrated:
- `frontend/public/design/` — tokens.css, styles.css, Design System (`index.html`), Brand Marks (`brand-marks.html`), served at `/design/`. These are the canonical reference docs.
- App header now renders the real lockup: `#mark-b` on a green app-tile, wordmark with `#reki-head` as the i-dot, `v1.0` chip (`App.jsx` topbar + lockup CSS in `index.css`).
- `favicon.svg` → solid b-wheel on **forest-green** tile (was dark-hoof).
- MapLibre attribution themed via `.maplibregl-ctrl-attrib` in `index.css`.
- **Canon note:** Reki's cap badge is the **diamond** (`M120,59.5 L127.5,68 L120,76.5 L112.5,68 Z`). The arrow variant found in some exploration-board files is superseded — don't "fix" the diamond.

## ⚠ Production incident + deploy fix — June 10 2026 (`claude/dreamy-brown-i56fmh`)

**Symptom:** bikeroutes.org serves a blank page. Console: `/src/main.jsx` blocked (MIME `text/jsx`), `favicon.svg`/`reki_icon.png` 404. `/api/*` also dead.

**Cause:** the root `wrangler.jsonc` (added by the workers-autoconfig PR #13) deployed an **assets-only** worker under the same name `bikeroutes-api` with `assets.directory: "frontend"` — i.e. the **raw un-built source** — overwriting the real worker (Hono API + built SPA from `worker/public/`) on every Workers Builds run. Unrelated to the v1.0 brand commit, which never reached main.

**Fix (this branch):**
- Deleted root `wrangler.jsonc`. `worker/wrangler.jsonc` is the ONLY worker config. Never re-add a root config with `assets: "frontend"`.
- Root `package.json` scripts are now the Workers Builds contract:
  - `build` → `cd frontend && npm ci && npm run build && cd ../worker && npm ci` (builds SPA into `worker/public/`, installs worker deps so wrangler can bundle `hono` etc. — this was the old "broken worker import")
  - `deploy` → `wrangler deploy --config worker/wrangler.jsonc --containers-rollout=none` (paths in that config resolve relative to it; containers skipped because CI has no Docker — remove the flag when shipping Valhalla)
- Verified: `npm ci` (worker) + dry-run deploy from repo root bundles successfully, reads 20 asset files from `worker/public`, all bindings (D1/KV×3/R2×2/Vectorize/AI/DO×3/containers) resolve.

**To restore production:** merge this branch to main (Workers Builds redeploys correctly), or deploy manually with CF creds: `npm run build && npm run deploy` from repo root. If Workers Builds errors "Could not read wrangler config" after merge, set its deploy command to `npm run deploy` in the dashboard.

## Dev setup
```bash
cd frontend && npm install && npm run dev   # Vite on :5173
cd worker  && npm install && wrangler dev   # Worker on :8787
```
Frontend proxies `/api/*` to `:8787` via `vite.config.js` (check it exists, add if missing).
