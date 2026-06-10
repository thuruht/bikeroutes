# 11. Frontend ⇄ Backend Wiring — Handoff for the Worker Build

**Audience:** the coding LLM/engineer wiring the Cloudflare Worker to the existing UI.
**Goal:** replace the public-API stand-ins in `live-api.js` with first-party Worker
endpoints **without changing a single line of UI code.**

> This document is the contract. The UI (`live-app.jsx`, `panels.jsx`, `map.jsx`)
> already consumes a stable shape; your job is to make the Worker return that exact
> shape. Read `live-api.js` alongside this — every integration point is already
> marked there with a `// @SEAM` comment.

---

## A. Integration decisions (read first)

These answer the open scoping questions directly so you don't have to guess.

**A1 · Scope — integrate, don't replace.** This package is a *design-system + functional
prototype*, not a drop-in `frontend/src`. Lift the **tokens (`tokens.css`), component
styles (`styles.css`), and the data-layer seam pattern (`live-api.js`)** into the existing
app. Port the prototype's component *patterns* into your real component tree; do **not**
bulk-replace the existing `frontend/src` directory.

**A2 · Live is the primary template.** `BikeRoutes Live.html` → `live-app.jsx` →
`live-api.js` is the functional entry point and the one to wire the backend to. The
static `BikeRoutes.org.html` / `app.jsx` pair is an **SVG design mock** (no real map/
routing) — treat it as visual reference only, not the integration target.

**A3 · File structure — keep the existing `components/` organization.** The flat
top-level files here (`panels.jsx`, `map.jsx`, `data.jsx`) are prototype convenience.
When porting, map them into the existing module layout (e.g. `components/Panel/`,
`components/Map/`, `lib/api.js`). The contract that must not change is the **data shape**
(§3), not the file tree.

**A4 · Functionality parity — port-and-retain.** The Live prototype implements the
**MVP routing surface**: interactive route, elevation profile, surface breakdown,
difficulty read, turn list, GPX/KML export, and the semantic-search seam. It does **not**
include community/POI views, profiles/badges, donations, or any bespoke mode (e.g. a
"World Cup"/event mode) — if those exist in the current production app, **retain them**
and re-skin with the tokens; if they don't yet, they are Milestone 2/3 work (§5). Nothing
in this package should cause a regression of existing features.

**A5 · Mobile — one responsive app, not a separate entry point.** `Mobile Layout.html` /
`mobile.jsx` are responsive *explorations*, not a second build target. The shipped
`styles.css` is now mobile-first (touch-target floors, the panel becomes a bottom sheet
≤720px). Build a single responsive app; delete the separate mobile entry rather than
maintaining two.

**A6 · Backend — wire to the existing Worker via the seams.** Yes: connect to the
existing Cloudflare Worker stack (Valhalla routing, D1/KV, Vectorize). The `live-api.js`
`// @SEAM` markers *are* the intended integration pattern — swap each `fetch()` target for
its `/api/*` Worker endpoint (§2) and the UI is untouched. Do not introduce a parallel
data-fetching pattern.

**A7 · Assets — the vector marks are canonical; PNGs are exports.** The source of truth
is the **SVG** (the b-wheel logo mark + the flat-vector Reki). `reki_icon.png` is a raster
export already wired into `live-app.jsx`'s empty/error state — keep using it there and
regenerate it from the vector if the mark changes. `reki_concept.png` is **concept art /
reference only** — never ship it in the UI. Don't blanket-replace existing mascot assets;
replace per-slot, vector-first.

---

## B. Feature parity & regression ledger

Comparing the **static design mock** (`app.jsx` + `panels.jsx`, the richer reference) against the **functional Live build** (`live-app.jsx`) and the **docs**, several complete features regressed or were left unwired when the app became functional.

**Status (updated):** R2, R3, R5, R6, R7, R8, R9 have been **re-integrated into the Live build** and verified end-to-end against live BRouter routing. R1, R4, R10 are **held for a product decision** (they need backend/data that doesn't exist yet — see notes). The CSS for the restored features already shipped in `styles.css` (formerly dead styles, now wired).

| # | Feature | Status | Notes |
|---|---|---|---|
| R2 | **Elevation interactivity** — hover tooltip + crosshair + gridlines + gradient, **synced map scrub dot** | ✅ **Done** | `ElevLive` now fires `onScrub`; `BR.pointAtFrac` interpolates the map dot along `coords` |
| R3 | **Difficulty rating** + avg grade | ✅ **Done** | Derived from ascent ÷ distance (m/km → Easy/Moderate/Hard); `.diffbar` restored |
| R5 | **Turn hover-to-locate** on map | ✅ **Done** | Hovering a cue drops a marker at `turns[i].at`. *Road-name text still needs Valhalla `street_names` — documented in §3.1* |
| R6 | **Scale bar + live coordinate readout** | ✅ **Done** | Scale computed from map zoom/lat; coords update on `mousemove` |
| R7 | **Place search** | ✅ **Done (re-imagined)** | Geocode-backed "search places → jump the map". *True natural-language/semantic trail search upgrades this via `/api/search` + Vectorize (§3.3)* |
| R8 | **KML export** | ✅ **Done** | KML alongside GPX (both now embed elevation where present) |
| R9 | **Multi-waypoint + drag-to-adjust** | ✅ **Done** | Waypoint array; click appends; per-waypoint remove; **draggable markers** reverse-geocode + recompute; `BR.route` takes N points |
| R1 | **Explore / trail-discovery** | ⏸ **Held** | Needs the curated-trail DB + Vectorize. Faking cards = data slop. *Recommend: build once `/api/search` + a trails index exist; could re-imagine as "loops from here" using the R9 engine* |
| R4 | **"Show surface on map"** (gravel highlight) | ⏸ **Held** | Needs per-segment geometry (`surface.segments[]`, §3.1) the data layer doesn't return yet. Routing-bias prefs are already covered by the segmented control |
| R10 | **404 / loading / donation surfaces** | ⏸ **Held** | Separate pages, not the planner. The **full mascot** + voice copy are ready in the Design System when you want them built |

> **Caveat:** this ledger compares the artifacts *in this package*. If the **existing production app** carries features not represented here (e.g. a bespoke event/"World Cup" mode, community views, profiles), diff against that codebase too and **retain** them — nothing in this redesign should regress shipped functionality (see A4). The redesign changes the *skin and tokens*, not the feature set.

---

## 0. The one rule: rich data in, clean UI out

This is the tightrope. **Walk it deliberately.**

- **Retain maximum data richness at the data layer.** The Worker should return *more*
  than the screen shows today: full surface breakdown by type (paved / gravel / dirt /
  singletrack), per-segment elevation samples, every turn with road name + maneuver +
  bearing, route provenance (`source`, `profile`), POI metadata, and confidence/`est`
  flags. Never throw signal away at the edge — once it's dropped server-side, the UI can
  never progressively reveal it.
- **Keep the UI surface calm.** The panel shows a distance, a time, a difficulty read,
  a surface bar, an elevation sparkline, and a short turn list. That restraint is the
  product. New richness arrives as **progressive disclosure** (expandable detail, hover
  tip, "show full cue sheet"), as **map-layer richness**, or as data feeding existing
  widgets more accurately — **not** as new always-on panels, badges, or stat grids.
- **The contract is the buffer between the two.** Design every response so the *default*
  render stays minimal while the *full* payload is present for drill-down. Concretely:
  return the long arrays (`elev`, `turns`, `surface.segments`) every time; let the client
  decide how much to paint. When in doubt, **add a field, not a screen.**

If a change makes the JSON richer but the default panel no busier, you're on the wire.
If it adds a permanent box to the UI, stop and reconsider.

---

## 1. Architecture at a glance

```
  Browser (React, MapLibre GL)
      │  fetch()  ── stable shapes, see §3
      ▼
  Cloudflare Worker  (itty-router or URL Pattern API)
      ├── /api/route      → Valhalla (bicycle)      ⇄ KV  ROUTE_CACHE  (SHA-256 of body)
      ├── /api/geocode    → Nominatim/Photon proxy  ⇄ KV  GEO_CACHE
      ├── /api/reverse    → Nominatim reverse        ⇄ KV  GEO_CACHE
      ├── /api/search     → Vectorize (semantic)    ⇄ token-bucket rate limit
      ├── /api/tiles/...  → tile proxy / self-host   ⇄ Cache API
      ├── /api/poi        → D1 (read) + Durable Object (moderation queue, write)
      └── /api/donate/*   → PayPal + Printful (secrets server-side only)
      ▼
  Valhalla container · D1 · KV · Durable Objects · Vectorize · R2 (tiles/assets)
```

Bindings to declare in `wrangler.toml`: `ROUTE_CACHE` (KV), `GEO_CACHE` (KV),
`DB` (D1), `MOD_QUEUE` (Durable Object), `TRAILS_INDEX` (Vectorize), `ASSETS`/`TILES`
(R2), and secrets `PAYPAL_CLIENT`, `PAYPAL_SECRET`, `PRINTFUL_KEY`.

---

## 2. Where each SEAM lives in `live-api.js`

| SEAM marker | Current stand-in | Replace with | UI consumers |
|---|---|---|---|
| `@SEAM:tiles` | CARTO raster tiles | `/api/tiles/{z}/{x}/{y}` → R2/self-host + `custom_style.json` | `map.jsx` basemap |
| `@SEAM:geocode` | Nominatim direct | `/api/geocode?q=` (proxy + KV cache) | start/end inputs, `panels.jsx` |
| `@SEAM` (reverse) | Nominatim reverse | `/api/reverse?lng=&lat=` | map click → label |
| `@SEAM:route` | BRouter public | `/api/route` (Valhalla bicycle) | route line, summary, elevation, turns |
| (new) semantic search | — | `/api/search?q=` (Vectorize) | "flat family ride near the river" box |
| (new) POI | — | `/api/poi` (D1 + DO) | map pins, community submissions |
| (new) donate | — | `/api/donate/*` (PayPal/Printful) | donation tiers, merch |

**The discipline:** keep `BR.route`, `BR.geocode`, `BR.reverse` signatures byte-for-byte
identical. Only the `fetch()` URL and the response *adapter* inside each function change.

---

## 3. Response contracts (do not break these shapes)

### 3.1 `/api/route` → the route object

`BR.route(a, b, pref)` must resolve to **exactly** this (extra fields are welcome and
encouraged per §0; existing fields are load-bearing):

```jsonc
{
  "coords":  [[lng, lat, ele?], ...],   // full polyline; 3rd element = elevation (m) if available
  "dist":    12840,                      // meters
  "time":    3120,                       // seconds
  "ascend":  186,                        // meters of climb
  "elev":    [{ "d": 0, "e": 241 }, ...],// downsample to ~80 pts for the chart; KEEP full set available
  "turns":   [{ "type": "left|right|start|arrive", "road": "Cliff Dr", "dist": 240, "at": [lng,lat] }, ...],
  "surface": { "paved": 82, "gravel": 18, "est": false,
               "segments": [ { "type": "paved|gravel|dirt|singletrack", "dist": 1040 }, ... ] },
  "source":  "valhalla",                 // provenance — drives the "estimated" disclaimer
  "profile": "bicycle"
}
```

- `pref` maps to a Valhalla costing profile. Today: `{ balanced, quiet, fast }`. Carry
  these into Valhalla `bicycle` costing options (e.g. `use_roads`, `use_hills`,
  `avoid_bad_surfaces`) rather than inventing new pref keys client-side.
- **Richness to ADD now (no UI change needed):** `surface.segments[]` (typed, ordered),
  per-turn `maneuver` + `modifier`, and keep the *un-downsampled* elevation so a future
  full-screen elevation view has data. The current panel ignores these gracefully.
- **Fallback is sacred.** The product must never dead-end. Keep the `estimate()` path:
  on Valhalla error, return a straight-line estimate with `source:"estimated"`. The UI
  already renders the disclaimer off that flag.

### 3.2 `/api/geocode` & `/api/reverse`

`BR.geocode(q)` → array of `{ label, short, kind, lng, lat }` (cap ~6).
`BR.reverse(lng, lat)` → a single display string.
Proxy Nominatim/Photon, set a proper `User-Agent`, and **cache in `GEO_CACHE` KV** keyed
by normalized query (TTL ~30 days). This also fixes the Nominatim usage-policy risk of
calling it from the browser.

### 3.3 `/api/search` (semantic, Milestone-1 ✅ in product todo)

`{ q }` → `{ results: [{ title, blurb, lng, lat, kind, score }], ... }`.
Back it with **Vectorize** (`TRAILS_INDEX`). Wrap in a **token-bucket rate limiter**
(per-IP, e.g. 30/min) as the style guide requires. Return curated routes *and* point
results so the UI can show either without a shape change.

---

## 4. Caching & performance (style-guide mandates)

- **Routes:** cache Valhalla responses in `ROUTE_CACHE` (KV) under a **SHA-256 hash of the
  canonicalized request body** (sorted coords + pref). TTL ~7 days; bump on profile
  changes. This is the single biggest latency + cost win.
- **Tiles:** use the standard **Cache API** in front of R2/self-hosted tiles.
- **Bundle budget:** initial JS < **350KB gzipped**. Lazy-load the uPlot elevation graph
  and the PayPal SDK only when needed — do not let the Worker push more onto first paint.
- **Edge-first:** keep routing/geocode logic at the edge; only the Valhalla container is
  origin. Stream where possible.

---

## 5. Community & write paths (Milestone 2)

- **POI submission / moderation:** writes go through a **Durable Object** (`MOD_QUEUE`)
  for serialized state; trust-based moderation; magic-link auth. Reads come from **D1**.
  UI: a special map pin (and the future "Reki Checkpoint" sponsored pin) — integrated into
  the map layer, **never a banner**.
- **Surface/trail corrections:** queue for review → eventual OSM upstreaming. Store the
  diff + source so richness/provenance survives (§0).
- **Profiles & badges:** the contribution-badge progression (Scout → Pathfinder →
  Steward → Sustainer) lives in `08_Mascot_Identity.md`. Expose badge state on the
  profile read; the UI reveals it in the avatar/profile, not the routing flow.

---

## 6. Donations & merch (security-critical)

- All PayPal/Printful calls are **server-side only**. **Never** expose `PAYPAL_SECRET`,
  `PAYPAL_CLIENT` secret, or `PRINTFUL_KEY` to the client.
- Endpoints: `/api/donate/create` (order/intent), `/api/donate/capture`,
  `/api/donate/webhook` (PayPal → KV claim token), `/api/merch/fulfill`
  (Printful order for T-shirt/hoodie tiers).
- Tier names, amounts, and rewards are defined in `08_Mascot_Identity.md` — read them
  from there, don't hardcode new ones.

---

## 7. Security & correctness checklist

- [ ] No third-party secret reaches the browser bundle.
- [ ] Nominatim/Valhalla never called directly from the client (all proxied + cached).
- [ ] Every cached route keyed by SHA-256 of a **canonical** body (stable key ordering).
- [ ] Rate limiting on `/api/search` and any write endpoint (token bucket in KV/DO).
- [ ] CORS locked to the site origin(s).
- [ ] `source` / `est` flags preserved end-to-end so the UI can be honest about estimates.
- [ ] MapLibre effects clean up on unmount (no map-instance leaks) — already the pattern
      in `map.jsx`; keep it when adding live layers.

---

## 8. Definition of done

1. `live-api.js` `fetch()` targets all point at `/api/*`; **zero** changes to
   `live-app.jsx` / `panels.jsx` / `map.jsx`.
2. Route, geocode, reverse, and search return the §3 shapes (richer is fine, never thinner).
3. Cold route < ~1.5s, warm (KV hit) < ~150ms.
4. The default panel looks **identical** to today — all new richness sits behind
   disclosure, map layers, or more-accurate existing widgets (§0).

---
*Cross-refs: `05_Style_Guide.md` (architecture conventions), `03_Product_Todo.md`
(feature milestones), `08_Mascot_Identity.md` (tiers, badges, Reki copy).*
