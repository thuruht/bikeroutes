# Handoff: bikeroutes.org — Backend Wiring

## Overview
**bikeroutes.org** is an ad-free, cyclist-first route planner. It distinguishes surface
types (paved / gravel / dirt / singletrack), shows elevation and difficulty, and exports
to GPX/KML for Garmin/Wahoo. The front end is **built and functional** — interactive
multi-waypoint routing, elevation profile, surface breakdown, turn list, place search,
and device export all work today against public-API stand-ins.

**Your job:** stand up the Cloudflare Worker backend and point the front end's data layer
at it — *without changing the UI*. Every integration point is already a marked seam.

---

## About the design files
The files in `app/` are a **functional front-end prototype written in HTML + React (via
in-browser Babel)** — not the production source tree. They are a faithful, working
reference for look, behavior, and the **data contract** the UI expects.

Recreate/port this UI into the target codebase's **existing environment** (its React/Vue/
framework, its `components/` layout, its build tooling). If no app exists yet, choose the
appropriate framework and implement there. **Do not ship the in-browser-Babel HTML as
production.** What must not change is the **data shape** the UI consumes (see the specs),
not the file tree.

> ⚠️ **The wiring spec is authoritative.** `specs/north_star/11_Frontend_Backend_Wiring.md`
> is the full contract — architecture diagram, every `/api/*` endpoint, exact JSON response
> shapes, caching mandates, and the security checklist. **Read it first.** This README
> orients you and corrects the file names; that doc is the source of truth for the contract.

---

## Fidelity
**High-fidelity (hifi) + functional.** Final colors, type, spacing, interactions, and a
working routing surface are all present. Recreate the UI pixel-faithfully using the
codebase's libraries; preserve the data contract exactly.

---

## ⚠️ File-map correction (read before the spec)
The bundled specs were written against an earlier multi-file split (`live-app.jsx`,
`panels.jsx`, `map.jsx`, `data.jsx`, plus separate `BikeRoutes Live.html` /
`BikeRoutes.org.html` / `Mobile Layout.html` entry points). **That split has since been
consolidated.** Wherever the specs say "`live-app.jsx` / `panels.jsx` / `map.jsx`", read:

| Spec says | Current reality (this bundle) |
|---|---|
| `BikeRoutes Live.html` (functional entry) | **`app/bikeroutes-rc.html`** — the single entry point |
| `live-app.jsx` + `panels.jsx` + `map.jsx` | **`app/final-app.jsx`** — one consolidated component file |
| `live-api.js` (the data-layer seam) | **`app/live-api.js`** — unchanged, still the contract |
| separate static + mobile builds | **gone** — one responsive build (panel → bottom sheet ≤720px) |

The data contract is **identical** — `final-app.jsx` calls `BR.route(points, pref)`,
`BR.geocode(q)`, `BR.reverse(lng, lat)` exactly as the old trio did. So every `@SEAM` and
every response shape in the spec applies verbatim; only the filenames collapsed.

---

## Architecture (summary — full version in spec §1)
```
Browser (React + MapLibre GL)
    │  fetch() — stable shapes (spec §3)
    ▼
Cloudflare Worker
    ├── /api/route      → Valhalla (bicycle)      ⇄ KV ROUTE_CACHE (SHA-256 of body)
    ├── /api/geocode    → Nominatim/Photon proxy  ⇄ KV GEO_CACHE
    ├── /api/reverse    → Nominatim reverse        ⇄ KV GEO_CACHE
    ├── /api/search     → Vectorize (semantic)    ⇄ token-bucket rate limit
    ├── /api/tiles/...  → tile proxy / R2          ⇄ Cache API
    ├── /api/poi        → D1 (read) + Durable Object (moderation, write)
    └── /api/donate/*   → PayPal + Printful (secrets server-side only)
```
`wrangler.toml` bindings: `ROUTE_CACHE` (KV), `GEO_CACHE` (KV), `DB` (D1), `MOD_QUEUE`
(Durable Object), `TRAILS_INDEX` (Vectorize), `ASSETS`/`TILES` (R2); secrets
`PAYPAL_CLIENT`, `PAYPAL_SECRET`, `PRINTFUL_KEY`.

---

## The seams — what to wire (`app/live-api.js`)
Each is marked with a `// @SEAM` comment. **Keep `BR.route` / `BR.geocode` / `BR.reverse`
signatures byte-for-byte identical** — only swap the `fetch()` URL and the response adapter.

| SEAM | Current stand-in | Replace with |
|---|---|---|
| `@SEAM:tiles` | CARTO raster tiles | `/api/tiles/{z}/{x}/{y}` → R2/self-host + `custom_style.json` |
| `@SEAM:geocode` | Nominatim direct | `/api/geocode?q=` (proxy + KV cache) |
| `@SEAM` (reverse) | Nominatim reverse | `/api/reverse?lng=&lat=` |
| `@SEAM:route` | BRouter public | `/api/route` (Valhalla bicycle) |
| `@SEAM` (fallback) | straight-line estimate | **keep it** — `source:"estimated"` so the UI never dead-ends |
| (new) | — | `/api/search` (Vectorize, rate-limited) |
| (new) | — | `/api/poi`, `/api/donate/*` (Milestone 2/3) |

### The core response contract — `/api/route`
`BR.route(points, pref)` must resolve to **exactly** this shape (extra fields welcome and
encouraged; existing fields are load-bearing). Full annotated version + the geocode/search
shapes are in **spec §3**:
```jsonc
{
  "coords":  [[lng, lat, ele?], ...],
  "dist":    12840,                      // meters
  "time":    3120,                       // seconds
  "ascend":  186,                        // meters of climb
  "elev":    [{ "d": 0, "e": 241 }, ...],
  "turns":   [{ "type": "left|right|start|arrive", "road": "Cliff Dr", "dist": 240, "at": [lng,lat] }, ...],
  "surface": { "paved": 82, "gravel": 18, "est": false,
               "segments": [ { "type": "paved|gravel|dirt|singletrack", "dist": 1040 }, ... ] },
  "source":  "valhalla",
  "profile": "bicycle"
}
```
`pref` is `{ balanced | quiet | fast }` → map to Valhalla bicycle costing options; do not
invent new client-side pref keys.

---

## The one rule (spec §0): rich data in, calm UI out
- **Retain maximum data richness server-side** — full surface segments, un-downsampled
  elevation, every turn with road name + maneuver + bearing, provenance, `est` flags.
  Never drop signal at the edge.
- **Keep the UI calm** — new richness arrives as progressive disclosure, map-layer detail,
  or more-accurate existing widgets. **Add a field, not a screen.**

---

## Definition of done (spec §8)
1. `live-api.js` `fetch()` targets all point at `/api/*`; **zero** changes to `final-app.jsx`.
2. Route / geocode / reverse / search return the spec §3 shapes (richer is fine, never thinner).
3. Cold route < ~1.5s; warm (KV hit) < ~150ms.
4. The default panel looks **identical** to today.
5. Secrets never reach the browser bundle; Nominatim/Valhalla never called directly from
   the client; routes cached by SHA-256 of a canonical body; rate limiting on `/api/search`
   and writes; CORS locked to the site origin. (Full checklist: spec §7.)

---

## What's in this bundle

```
design_handoff_backend/
├── README.md                  ← you are here
├── app/                       ← the functional front end (the integration target)
│   ├── bikeroutes-rc.html     ← entry point — open this to run the prototype
│   ├── final-app.jsx          ← consolidated UI (consumes window.BR from live-api.js)
│   ├── live-api.js            ← THE data-layer seam — wire this to the Worker (@SEAM markers)
│   ├── styles.css             ← component styles (mobile-first; @imports tokens.css)
│   ├── tokens.css             ← design tokens — single source of truth (palette/type/space)
│   └── reki_icon.png          ← canonical mascot raster (empty/error states)
├── brand/                     ← brand & design-system reference (open in a browser)
│   ├── Brand Marks.html        ← final logomark, wordmark, mascot, pin + exact hex/usage
│   ├── Design System.html      ← components, color, type, spacing, the SVG symbol sheet
│   ├── tokens.css / styles.css / design-system-page.{css,js}
└── specs/north_star/          ← AUTHORITATIVE product + engineering specs
    ├── 11_Frontend_Backend_Wiring.md   ★ the backend contract — start here
    ├── 01_Project_Overview.md
    ├── 03_Product_Todo.md              feature milestones (MVP / community / advanced)
    ├── 05_Style_Guide.md               architecture & code conventions, caching mandates
    ├── 08_Mascot_Identity.md           Reki, donation tiers, badge progression, voice/copy
    ├── 09_Navigation_Mode.md
    └── 10_Route_Builder.md
```

### How to run the prototype
Open `app/bikeroutes-rc.html` in a browser. It loads MapLibre + React + Babel from CDNs
and routes against public BRouter/Nominatim, so it works without your backend out of the
box. Watch the network tab to see exactly which calls become `/api/*` endpoints.

---

## Design tokens (quick reference — full set in `app/tokens.css`)
Immutable brand palette:
| Token | Hex | Role |
|---|---|---|
| Deer Brown | `#C0763C` | Reki body, warm headers |
| Blaze Orange | `#FF6B1A` | primary accent / CTA / safety / route line |
| Camo Olive | `#4B5320` | tactical surfaces, secondary bg |
| Cream White | `#FFF5E6` | primary text on dark |
| Forest Green | `#2D5F3A` | cap, bag, accent buttons |
| Trail Tan | `#D4A96A` | card surfaces (light) |
| Dark Hoof | `#0B0C08` | deep dark base, ink, outlines |

The app ships **two themes** off these tokens: **Tactical (dark)** is the primary brand
expression; **Daylight (light)** is the warm trail-tan daytime mode. Theme persists in
`localStorage` under `br-theme`. Type: **Outfit** (headings), **IBM Plex Sans** (body),
**IBM Plex Mono** (labels/data).

## Assets
- **Vector marks are canonical** (b-wheel logo + flat-vector Reki) — the SVG symbol sheet
  lives in `brand/Design System.html` and `brand/Brand Marks.html` (`#mark-b`,
  `#mark-b-solid`, `#reki`, `#reki-head`, `#reki-sil`, `#pin-wing`).
- `app/reki_icon.png` is a raster export wired into empty/error states — regenerate from
  the vector if the mark changes.
- Concept art (`reki_concept.png` under `specs/`) is **reference only — never ship it**.
