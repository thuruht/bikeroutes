# 5. Style Guide & Conventions

This document enforces consistency across the BikeRoutes.org codebase and user interface. All contributors and agentic LLMs must adhere to these guidelines.

## 1. Design System: Tactical Hi-Tech (MO Camo Edition)

The UI must feel like a specialized, rugged tool—not a generic web app. It blends a "hacker/tactical" aesthetic with outdoor utility.

### Color Palette
*   **Primary Accent:** Blaze Orange (`#FF6B1A`) – High visibility, hunter safety aesthetic. Used sparingly for critical CTAs (e.g., "Calculate Route", "Donate").
*   **Surfaces:** Dark Olive/Hoof (`#0B0C08`) – The foundational background color. Pure black (`#000000`) should be avoided in favor of this deep, organic dark tone.
*   **Secondary Backgrounds:** Camo Olive (`#4B5320`) and Trail Tan (`#D4A96A`).
*   **Text/Icons:** Cream White (`#FFF5E6`) for primary text, ensuring high contrast against the dark surfaces.

### Typography
*   **Headers:** `Outfit` (or similar geometric sans-serif) for a modern, tech-forward feel.
*   **Body:** `Inter` (or similar highly legible sans-serif) for UI elements and trail data.
*   *Rule:* No aggressive all-caps body text. Legibility is paramount, especially on a glaring phone screen outdoors.

### UI Elements
*   **Border Radius:** `6px` (`var(--radius-md)`). Soft but structured.
*   **Textures:** Subtle 24px tactical grids or very low-opacity CSS camo patterns on empty backgrounds.
*   **Interactions:** Sleek, high-tech glow effects (`--accent-glow`) on hover states rather than simple color fills.

## 2. Mascot Usage: Reki the Deer
Reki is a tool for empathy and brand recognition.
*   **Tone:** Reki is helpful, curious, and slightly playful. He is never condescending.
*   **Visuals:** Use the official flat-vector style. He should integrate seamlessly into the Tactical Hi-Tech UI, often providing a splash of warmth (Deer Brown `#C0763C`) against the dark backgrounds.
*   **Placement:** Use him for empty states, errors, loading screens, and donation appeals. Do *not* use him to interrupt the core routing workflow.

## 3. Code Architecture & Conventions

### Frontend (React + Vite)
*   **Components:** Functional components with Hooks. Use descriptive names.
*   **Styling:** CSS Modules or standard CSS with strict BEM naming conventions to prevent scope leak. Rely heavily on CSS variables for the color palette.
*   **Map Integration:** Always use `@maplibre/maplibre-gl`. Wrap map interactions in standard React effects, ensuring cleanup on unmount to prevent memory leaks.
*   **Performance:** Keep the initial bundle under 350KB gzipped. Lazy load complex UI components (like the uPlot elevation graph or the PayPal SDK) until needed.

### Backend (Cloudflare Workers)
*   **Routing:** Use a lightweight router (like `itty-router` or the native Workers URL Pattern API).
*   **Caching:** Aggressively cache Valhalla responses in KV (`ROUTE_CACHE`) using a SHA-256 hash of the request body. Cache tiles using the standard Cache API.
*   **State:** Use Durable Objects for anything requiring serialized state (e.g., active route planning sessions, moderation queues).
*   **Security:** Never expose PayPal or Printful secrets to the client. Always proxy via Worker endpoints.

### Infrastructure (Docker)
*   **Valhalla:** Keep the Dockerfile lean. Only compile the necessary routing profiles (bicycle, pedestrian).
*   **Tiles:** Use the standard `openstreetmap-tiles-docker` pattern. Ensure the `custom_style.json` is optimized for high-contrast visibility of trails and elevation contours.

---
*Next: Consult the [Index & Glossary](./06_Index.md)*
