# 6. Index & Glossary

This document serves as a quick reference for key terms, architectural concepts, and cross-referencing tags used throughout the North Star Guide.

## Glossary of Terms

*   **B2B (Business-to-Business):** Monetization strategies involving selling services or data to other organizations (e.g., APIs, sponsored checkpoints) rather than end-users. [See Path C & D](./04_Future_Roadmaps.md)
*   **Cloudflare Workers:** The serverless edge computing platform powering the backend API, caching, and database interactions for BikeRoutes.org. [See Technical Todo](./02_Technical_Todo.md)
*   **Durable Objects:** A Cloudflare storage solution used for coordinating state, such as the POI moderation queue or active route sessions.
*   **KV (Key-Value):** Cloudflare's globally distributed, eventually consistent data store, used heavily for route caching (`ROUTE_CACHE`).
*   **MapLibre GL JS:** The open-source, WebGL-based library used for rendering the interactive map on the frontend.
*   **OSM (OpenStreetMap):** The foundational, open-source geographic database that powers all routing and map tiles on the platform.
*   **Printful:** The print-on-demand API used for fulfilling high-tier donation rewards (T-shirts, hoodies).
*   **Reki:** The white-tailed deer mascot of BikeRoutes.org. [See Project Overview](./01_Project_Overview.md)
*   **Tactical Hi-Tech:** The official design system and aesthetic of the platform, characterized by dark olive/hoof surfaces and blaze orange accents. [See Style Guide](./05_Style_Guide.md)
*   **Valhalla:** The open-source routing engine (running in Docker) responsible for calculating paths, elevation, and surface types.
*   **Vectorize:** Cloudflare's vector database, used to store text embeddings of trail data for semantic search.

## Cross-Referencing Tags (For LLM / AI Agents)

When building new features, agentic LLMs should search the documentation for these tags to find relevant context:

*   `#architecture-cleanup`: References the immediate tasks needed to fix the scaffolded repo state. (Found in `02_Technical_Todo.md`)
*   `#valhalla-config`: References the setup, Dockerization, and tuning of the routing engine.
*   `#monetization`: References donation models, PayPal integration, and B2B strategies. (Found in `01_Project_Overview.md`, `03_Product_Todo.md`, `04_Future_Roadmaps.md`)
*   `#reki-mascot`: References the visual and tonal guidelines for the mascot. (Found in `01_Project_Overview.md`, `05_Style_Guide.md`)
*   `#offline-first`: References the Path B roadmap for progressive web app and downloaded tile architecture. (Found in `04_Future_Roadmaps.md`)
*   `#community-mod`: References the trust-based POI submission and moderation system. (Found in `03_Product_Todo.md`, `04_Future_Roadmaps.md`)

