# 14. Design Implementation Specs

This document provides the visual and functional specifications for the BikeRoutes.org UI redesign, based on the tactical-premium aesthetic.

## 1. Visual Baseline (CSS Tokens)

The following tokens are implemented in `frontend/src/index.css` and must be used for all new components.

```css
:root {
  /* Colors */
  --color-bg: #f6f4ee;
  --color-surface: rgba(255, 255, 255, 0.72);
  --color-surface-2: rgba(255, 255, 255, 0.9);
  --color-border: rgba(34, 33, 31, 0.12);
  --color-text: #171614;
  --color-text-muted: #5e5b56;
  --color-primary: #1b7b81;
  
  /* Typography Scale */
  --text-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
  --text-sm: clamp(0.875rem, 0.8rem + 0.35vw, 1rem);
  --text-base: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
  --text-lg: clamp(1.125rem, 1rem + 0.75vw, 1.5rem);
  --text-hero: clamp(3rem, 0.5rem + 7vw, 7rem);

  /* Fonts */
  --font-display: 'Cabinet Grotesk', 'Arial', sans-serif;
  --font-body: 'Satoshi', 'Arial', sans-serif;

  /* Layout */
  --radius-xl: 1.5rem;
  --shadow-lg: 0 24px 60px rgba(38, 32, 20, 0.12);
  --transition: 220ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

## 2. Global Layout: ShellLayout

The `ShellLayout.jsx` component provides the global container and background.
*   **Tentacles Background:** A set of animated vertical spans that drift based on random CSS variables.
*   **Panel Container:** A central `.panel` with a blur effect and deep shadow, housing the main application views.

## 3. UX Concept: Hero to Planner

The application transitions between two primary states:

### A. Landing Mode (Hero Panel)
*   **Visuals:** A single centered hero stack.
*   **Copy:** Bold, minimal text (e.g., "ride better routes").
*   **Action:** A prominent CTA button ("Open the Route Planner") that triggers the transition to the planner view.

### B. Planner Mode (Two-Column Layout)
*   **Left Column (360-420px):** Vertical stack of controls (Route Input, Ride Type Selector, Route Stats, Filters, Actions).
*   **Right Column (Flexible):** Full-bleed MapView with rounded corners and a subtle border.
*   **Mobile Behavior:** The sidebar becomes a bottom sheet or a slide-in panel.

## 4. Component Checklist (Redesign Migration)

| Component | Status | Implementation Notes |
|-----------|--------|----------------------|
| `LandingView` | [x] Completed | Uses the hero stack and glassy panel. |
| `PlannerView` | [x] Scaffolding | Established the split-layout shell. |
| `Header` | [x] Completed | Small wordmark + Donate pill button. |
| `RouteInput` | [x] Completed | Clean text fields with autocomplete support. |
| `Sidebar` | [x] Completed | Migrated to vertical stack layout with header. |
| `MapView` | [x] Completed | Integrated into right column with refined markers. |
| `RouteStats` | [x] Completed | Compact card using `.box` style. |
| `ElevationProfile` | [ ] Pending | Requires `uPlot` integration. |
