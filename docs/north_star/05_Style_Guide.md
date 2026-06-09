# 5. Style Guide & Conventions

This document enforces consistency across the BikeRoutes.org codebase and user interface. All contributors and agentic LLMs must adhere to these guidelines.

## 1. Design System: Light Tactical (Teal & Camo Edition)

The UI blends a soft, "premium" consumer aesthetic with tactical utility. It uses glassy surfaces, strong display typography, and a subtle animated background.

### Color Palette
*   **Primary Accent:** Teal (`#1B7B81`) – Used for primary CTAs, active states, and focus indicators.
*   **Background:** Off-White/Bone (`#F6F4EE`) – The foundational background color.
*   **Tactical Accents:** Camo Green (`#4A5D4E`) and Camo Tan (`#8B7D6B`). Used for subtle background elements and badges.
*   **Text:** Charcoal (`#171614`) for primary text, with a Muted variant (`#5E5B56`) for secondary information.

### Typography
*   **Headers:** `Cabinet Grotesk` – A bold, geometric display font used for headings and hero sections.
*   **Body:** `Satoshi` – A clean, highly legible sans-serif used for all body copy and UI elements.
*   **Mono:** `JetBrains Mono` – Used for coordinate displays, distance measurements, and technical data.

### Visual Elements
*   **Background Animation:** "Tentacles" – A set of subtle, drifting vertical lines that provide depth and motion to the global backdrop.
*   **Surfaces:** Glassy, semi-transparent panels (`rgba(255, 255, 255, 0.72)`) with `backdrop-filter: blur(16px)`.
*   **Border Radius:** Multi-scale: `radius-md` (8px), `radius-lg` (16px), `radius-xl` (24px).
*   **Shadows:** Soft, deep shadows (`--shadow-lg`) to create elevation without harsh borders.

## 2. Mascot Usage: Reki the Deer
Reki is a tool for empathy and brand recognition.
*   **Tone:** Reki is helpful, curious, and slightly playful. He is never condescending.
*   **Visuals:** Use the official flat-vector style. He should integrate seamlessly into the Light Tactical UI, often appearing in `.box` or `.panel` containers.
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
