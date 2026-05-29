# 🦌 BikeRoutes.org

**Free, open‑source, community‑driven bike trail navigation for the Midwest.**

> *"Hey! I'm Reki. I've scouted every trail in the Midwest so you don't have to. Let's ride."*

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Powered by Cloudflare Workers](https://img.shields.io/badge/Powered%20by-Cloudflare%20Workers-orange.svg)](https://workers.cloudflare.com)
[![OpenStreetMap](https://img.shields.io/badge/Data-OpenStreetMap-blue.svg)](https://www.openstreetmap.org)

---

## What is BikeRoutes.org?

BikeRoutes.org is a **free, donation‑supported** web platform for urban and off‑road bicycle navigation across the US Midwest. It's built entirely on open‑source technology and powered by OpenStreetMap data.

### ✨ Features (MVP)
- 🗺️ **Interactive route drawing** with drag‑to‑add waypoints
- ⛰️ **Elevation profiles** for every route
- 🛤️ **Trail‑type filters** — Paved, Gravel, Dirt, MTB
- 🔍 **Semantic trail search** — *"quiet riverside path near downtown"*
- 📥 **GPX/KML export** for Garmin, Wahoo, and other devices
- 📱 **Mobile‑first responsive UI**
- 💛 **Donation‑supported** — no ads, no tracking, free forever

### 🚧 Coming Soon (Phase 2)
- 🗣️ Turn‑by‑turn voice guidance
- 📍 User‑submitted POIs (water stations, bike shops, scenic lookouts)
- 🔥 Community heatmap of popular routes

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React + Vite + MapLibre GL JS |
| **Backend** | Cloudflare Workers (KV, Vectorize, Durable Objects) |
| **Routing** | Valhalla (Docker) |
| **Tiles** | Self‑hosted OSM tile server (Docker) |
| **Payments** | PayPal JavaScript SDK |
| **Data** | OpenStreetMap (daily Midwest import) |
| **Search** | Cloudflare Vectorize (semantic embeddings) |

---

## Mascot

Meet **Reki** 🦌 — a young white‑tailed deer who scouts every trail in the Midwest. He wears a cycling cap and carries a messenger bag full of trail maps. [Read the full brand guide →](docs/mascot_identity.md)

---

## 🌟 North Star Guide

The central vision, architecture, roadmap, and styling guidelines for the project are comprehensively documented in the [North Star Guide](docs/north_star/00_Table_of_Contents.md). All contributors (human and AI) should review this guide before making major changes.

## Project Structure

```
bikeroutes/
├── docs/               # Planning docs, specs, brand guide
│   ├── product_spec.md
│   ├── design_decisions.md
│   ├── mascot_identity.md
│   ├── implementation_plan.md
│   └── assets/
│       └── reki_concept.png
├── frontend/           # React + Vite + MapLibre GL JS
├── worker/             # Cloudflare Workers (API, tiles proxy, search)
├── routing/            # Valhalla Docker config
├── tiles/              # OSM tile server Docker config
└── README.md
```

---

## Contributing

BikeRoutes.org is open source and welcomes contributions! Whether you're fixing a bug, adding a feature, or improving trail data — every contribution helps.

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## Support the Project

BikeRoutes.org is **free forever** and supported entirely by donations. Your support keeps the servers running and the trails mapped.

| ☕ $5 | 🥪 $10 | 🗺️ $15 | 👕 $25 | 🏔️ $50 |
|-------|--------|---------|--------|---------|
| Coffee for Reki | Reki's Sandwich | Trail Supporter | Route Builder (T‑shirt) | Reki's Inner Circle (Hoodie) |

Monthly subscriptions available: **Reki's Trail Fund** ($3/mo) · **Reki's Patrol** ($5/mo) · **Reki's Herd** ($10/mo)

---

## License

MIT — see [LICENSE](LICENSE) for details.

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
