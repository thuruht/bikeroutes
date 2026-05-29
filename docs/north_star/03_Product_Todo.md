# 3. Product & Feature To-Do List

This document outlines the high-level feature roadmap and user experience goals. It is closely tied to the `02_Technical_Todo.md` for implementation details.

## Milestone 1: The MVP (Minimum Viable Product)
The MVP focuses on delivering a superior, ad-free routing experience that clearly distinguishes surface types and elevation, outperforming generic mapping apps for cyclists.

*   [ ] **Interactive Route Drawing (Core UX):**
    *   *Feature:* Users can click/tap to drop waypoints, drag them to adjust, and instantly see the path snap to the trail network.
    *   *Tech Ref:* Valhalla integration, MapLibre directions plugin.
*   [ ] **Elevation Profiles:**
    *   *Feature:* A dynamic panel showing the elevation gain/loss for the planned route, updating in real-time as waypoints change.
    *   *Tech Ref:* Valhalla polyline decoding, `uplot` rendering.
*   [ ] **Granular Trail-Type Filters:**
    *   *Feature:* UI toggles allowing users to force the router to prefer or avoid specific surfaces (Paved, Gravel, Dirt, MTB trails).
    *   *Tech Ref:* Custom Valhalla bike profiles and costing adjustments.
*   [ ] **Semantic Trail Search:**
    *   *Feature:* Natural language search (e.g., "flat family ride near the river") returning relevant map locations or curated routes.
    *   *Tech Ref:* Cloudflare Vectorize, token-bucket rate limiting.
*   [ ] **Device Export:**
    *   *Feature:* One-click export to GPX or KML formats for seamless loading onto Garmin, Wahoo, or mobile apps.
    *   *Tech Ref:* Client-side `togpx` conversion.
*   [ ] **Donation Engine & Merch Fulfillment:**
    *   *Feature:* The PayPal integration, donation tiers, and the automated Printful pipeline for T-shirt/hoodie fulfillment for high-tier donors.
    *   *Tech Ref:* Cloudflare Worker endpoints, Stripe/PayPal SDKs, KV storage for claim tokens.
*   [ ] **Mascot Integration:**
    *   *Feature:* Placing Reki the Deer in UI empty states, error pages (404s), and loading screens to establish brand identity.

## Milestone 2: Community & Content (Phase 2)
Once the routing foundation is solid, the focus shifts to user-generated content and retention.

*   [ ] **Community POI Submission:**
    *   *Feature:* Trust-based moderation system where users can drop pins for water stations, bike shops, hazards, or scenic lookouts.
    *   *Tech Ref:* Durable Objects for the moderation queue, magic-link auth.
*   [ ] **Surface & Trail Corrections:**
    *   *Feature:* A "Report Inaccuracy" button that queues surface corrections for review and eventual upstreaming to OpenStreetMap.
*   [ ] **User Profiles & Badges:**
    *   *Feature:* Public profiles displaying contribution stats and badges (e.g., "Scout", "Pathfinder") earned through interaction.
*   [ ] **"Reki's Trail Mail" Newsletter Automation:**
    *   *Feature:* Automated curation of the "Trail of the Month" and community stats to drive recurring engagement.

## Milestone 3: Advanced Navigation & Analytics (Phase 3)
*   [ ] **Turn-by-Turn Voice Guidance:**
    *   *Feature:* Native mobile-web voice instructions leveraging the browser's SpeechSynthesis API while following a route.
*   [ ] **Community Heatmaps:**
    *   *Feature:* Visualizing the most popular riding corridors based on anonymized user routing data.
*   [ ] **Curated "Featured Loops":**
    *   *Feature:* Pre-packaged, ready-to-ride loops organized by difficulty, distance, and scenery, heavily featuring Reki's recommendations.

---
*Next: Explore the [Future Roadmaps](./04_Future_Roadmaps.md)*
