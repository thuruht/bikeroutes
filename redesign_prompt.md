You are a senior front‑end engineer and product designer.

You will help me **fully redesign the bikeroutes.org front‑end** while keeping the existing backend/API as‑is. The project is already implemented as a React + Vite app in the `thuruht/bikeroutes` GitHub repository.

Your job:
- Analyze the existing front‑end structure.
- Design and implement a **new UI based on the HTML/CSS shell I provide below**.
- Rebuild the route planner UX so it feels like a friendly, consumer‑grade route planner (similar to Komoot’s web planner), but with bikeroutes.org’s own identity and the new visual style.

---

## Context: project and tech stack

1. The repo you’ll work with is `thuruht/bikeroutes`. It contains:
   - `frontend/` – React + Vite single‑page app.
   - `worker/` – Cloudflare worker + Valhalla routing API; do NOT change its public API contracts.
   - `docs/north_star/` – product + style docs. You can read them to understand goals and tone, but we are **replacing the existing UI**, not lightly tweaking it.

2. You must:
   - Keep the **API endpoints and routing logic** intact (Valhalla, tiles, POIs, etc.).
   - Replace the **entire front‑end visual and layout layer** with a new design based on the HTML/CSS shell below.
   - Maintain or improve accessibility, performance, and mobile responsiveness.

---

## New visual baseline (HTML shell)

Below is the **visual and motion baseline** for the new design.
Treat it as the “design system starter” and outer app shell.

<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>bikeroutes.org</title>
  <link rel="preconnect" href="https://api.fontshare.com" />
  <link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700,800&f[]=satoshi@400,500,700&display=swap" rel="stylesheet" />
  <style>
    :root,
    [data-theme="light"] {
      --text-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
      --text-sm: clamp(0.875rem, 0.8rem + 0.35vw, 1rem);
      --text-base: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
      --text-lg: clamp(1.125rem, 1rem + 0.75vw, 1.5rem);
      --text-xl: clamp(1.5rem, 1.2rem + 1.25vw, 2.25rem);
      --text-2xl: clamp(2rem, 1.2rem + 2.5vw, 3.5rem);
      --text-hero: clamp(3rem, 0.5rem + 7vw, 7rem);

      --space-2: 0.5rem;
      --space-3: 0.75rem;
      --space-4: 1rem;
      --space-6: 1.5rem;
      --space-8: 2rem;
      --space-10: 2.5rem;
      --space-12: 3rem;
      --space-16: 4rem;
      --space-20: 5rem;

      --color-bg: #f6f4ee;
      --color-surface: rgba(255, 255, 255, 0.72);
      --color-surface-2: rgba(255, 255, 255, 0.9);
      --color-border: rgba(34, 33, 31, 0.12);
      --color-text: #171614;
      --color-text-muted: #5e5b56;
      --color-primary: #1b7b81;
      --color-primary-soft: rgba(27, 123, 129, 0.12);
      --shadow-lg: 0 24px 60px rgba(38, 32, 20, 0.12);
      --radius-lg: 1rem;
      --radius-xl: 1.5rem;
      --font-display: 'Cabinet Grotesk', 'Arial', sans-serif;
      --font-body: 'Satoshi', 'Arial', sans-serif;
      --transition: 220ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    *, *::before, *::after { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: var(--font-body);
      font-size: var(--text-base);
      line-height: 1.6;
      color: var(--color-text);
      background:
        radial-gradient(circle at 20% 20%, rgba(97, 123, 129, 0.08), transparent 28%),
        radial-gradient(circle at 80% 18%, rgba(97, 123, 29, 0.05), transparent 22%),
        linear-gradient(180deg, #fbfaf6 0%, var(--color-bg) 100%);
      overflow-x: hidden;
    }

    .skip-link {
      position: absolute;
      left: -9999px;
      top: auto;
    }
    .skip-link:focus {
      left: var(--space-4);
      top: var(--space-4);
      z-index: 1000;
      background: #fff;
      padding: var(--space-3) var(--space-4);
      border-radius: 999px;
      outline: 2px solid var(--color-primary);
    }

    #tentacles {
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: 0.09;
      overflow: hidden;
    }

    .tentacle,
    .tentacle::before {
      position: absolute;
      border-radius: 999px;
      transform-origin: top center;
      animation: drift var(--dur) ease-in-out infinite alternate;
    }

    .tentacle {
      width: 1.5px;
      height: var(--len);
      left: var(--x);
      top: -8vh;
      background: linear-gradient(120deg, rgba(27, 123, 188, 0.22), rgba(27, 73, 129, 0));
      filter: blur(0.2px);
    }

    .tentacle::before {
      content: "";
      inset: 0;
      width: 17px;
      left: -4px;
      background: linear-gradient(120deg, rgba(27, 123, 229, 0.13), rgba(27, 123, 69, 0));
    }

    @keyframes drift {
      from { transform: rotate(calc(var(--rot) * -2)) translateY(0); }
      to { transform: rotate(var(--rot)) translateY(2vh); }
    }

    .shell {
      position: relative;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: clamp(var(--space-6), 5vw, var(--space-16));
      isolation: isolate;
    }

    .panel {
      width: min(100%, 980px);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
      backdrop-filter: blur(16px);
      padding: clamp(var(--space-8), 5vw, var(--space-16));
      text-align: center;
      position: relative;
    }

    .panel::before {
      content: "";
      position: absolute;
      inset: 12px;
      border: 1px solid rgba(27, 123, 129, 0.12);
      border-radius: calc(var(--radius-xl) - 12px);
      pointer-events: none;
    }

    .eyebrow,
    .subtitle {
      text-transform: uppercase;
      letter-spacing: 0.22em;
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    h1 {
      margin: 0;
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: lowercase;
    }

    .hero {
      margin: var(--space-6) auto var(--space-4);
      max-width: 10ch;
      font-family: var(--font-display);
      font-size: var(--text-hero);
      font-weight: 800;
      line-height: 0.92;
      letter-spacing: -0.04em;
      text-wrap: balance;
    }

    .stack {
      display: grid;
      gap: var(--space-3);
      justify-items: center;
    }

    .domains {
      margin-top: clamp(var(--space-8), 4vw, var(--space-12));
      display: grid;
      gap: var(--space-4);
    }

    .box {
      padding: var(--space-4) var(--space-6);
      border-radius: var(--radius-lg);
      background: var(--color-surface-2);
      border: 1px solid rgba(27, 123, 129, 0.14);
      color: var(--color-text);
      font-size: clamp(1.1rem, 1rem + 1vw, 1.8rem);
      font-weight: 700;
      letter-spacing: -0.03em;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
    }

    .box.tint {
      background: linear-gradient(180deg, rgba(27, 123, 129, 0.14), rgba(255, 255, 255, 0.92));
    }

    .note {
      margin: var(--space-8) auto 0;
      max-width: 40ch;
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }

    @media (max-width: 640px) {
      .panel::before { inset: 8px; border-radius: calc(var(--radius-xl) - 8px); }
      .domain { padding: var(--space-4); }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <div id="tentacles" aria-hidden="true"></div>

  <main class="shell" id="main">
    <section class="panel box tint" aria-labelledby="hero-title">
      <div class="stack">
        <div class="eyebrow">welcome</div>
        <h1 id="hero-title">to</h1>
        <div class="hero">BikeRoutes.org</div>
        <div class="subtitle">navigate!</div>
      </div>

      <div class="box" aria-label="stuff">

<p class="note">will well whale</p></div>


    </section>
  </main>

  <script>
    const host = document.getElementById('tentacles');
    const amount = window.innerWidth < 700 ? 9 : 16;

    for (let i = 0; i < amount; i += 1) {
      const el = document.createElement('span');
      el.className = 'tentacle';
      el.style.setProperty('--x', `${Math.random() * 100}%`);
      el.style.setProperty('--len', `${30 + Math.random() * 45}vh`);
      el.style.setProperty('--rot', `${3 + Math.random() * 10}deg`);
      el.style.setProperty('--dur', `${4 + Math.random() * 5}s`);
      el.style.opacity = (0.3 + Math.random() * 0.55).toFixed(2);
      host.appendChild(el);
    }
  </script>
</body>
</html>


Interpretation guidelines:
- Reuse the CSS variables as **design tokens**:
  - Color tokens: `--color-bg`, `--color-surface`, `--color-primary`, etc.
  - Typography tokens: `--font-display`, `--font-body`, and the `--text-*` scale.
  - Spacing, radius, shadows, transitions, etc.
- Reuse the **"tentacles" animated background** as the global backdrop of the app.
- The `.panel`, `.box`, `.stack`, `.eyebrow`, `.hero`, `.subtitle`, `.note` classes show the aesthetic:
  - Soft, light, glassy surfaces.
  - Strong display typography.
  - Clean, calm, "premium" look.

You may refactor this HTML into React components, but keep the same look and feel.

---

## High‑level UX concept

I want the app to feel like:

- Landing page: a **single hero panel** that welcomes the user to bikeroutes.org and offers an obvious entry into the map.
- Main app: a **two‑column route planner** inside the same visual shell:
  - Left panel: controls and route info.
  - Right panel: map canvas.

The experience should be:
- Friendly and welcoming for new riders.
- Powerful enough for route nerds.
- Comparable in clarity to modern, consumer‑grade route planners.

---

## Step 1 – Analyze existing app structure

1. Inspect `frontend/`:
   - Identify the current entry point (`main.jsx`, `App.jsx`).
   - See how routing is set up (React Router or simple single‑view).
   - Note existing components:
     - Map view, sidebar, filters, world‑cup mode, etc.

2. Write a short **internal plan** (as comments or in a markdown file) describing:
   - Which components will be replaced entirely.
   - Which logic will be reused (e.g., map integration, API hooks).
   - How you’ll introduce the new app shell and routing (landing vs main planner).

Do NOT delete useful business logic; just replace the visual/layout components.

---

## Step 2 – Implement the new shell and global layout

Goal: Introduce a new top‑level layout that:
- Wraps the app in the **tentacle background**.
- Provides a central panel that can either show:
  - The **hero landing content**.
  - The **map + sidebar layout**.

Tasks:

1. Create a new React component, e.g. `ShellLayout.jsx`, that:
   - Renders:
     - The `<a class="skip-link">` for accessibility.
     - The `<div id="tentacles">` background with the JS that generates the tentacles (adapted to React).
     - A main container (`.shell`) with a `.panel` inside.
   - Respects the `prefers-reduced-motion` media query logic from the shell (no tentacle animation when reduced motion is requested).

2. Move the CSS from the HTML shell:
   - Extract styles into `src/index.css` or a dedicated CSS module (e.g., `Shell.css`).
   - Keep variable definitions under `:root` / `[data-theme="light"]`.
   - Ensure body background and typography match the shell.

3. Integrate the shell into the app:
   - Wrap the main router or main view in `ShellLayout`.
   - Ensure the shell persists across navigation (landing ↔ planner).

---

## Step 3 – Landing page content inside the panel

Within the `.panel`:

1. Replace the placeholder copy with:
   - Eyebrow: e.g., “Kansas City & beyond”.
   - H1: “bikeroutes.org”.
   - Hero text: a bold 2–3 word phrase (e.g., “ride better routes”).
   - Subtitle: short action phrase (e.g., “plan, explore, share”).

2. Below the hero stack, include:
   - Primary CTA button: “Open the Route Planner”.
   - Secondary link: “Learn about the project” (optional; can scroll to an About section or switch to an About view).

3. When the primary CTA is clicked:
   - Switch the content of the panel to the **main app layout** (described in the next step).
   - Use a smooth transition (fade/slide) consistent with `--transition`.

---

## Step 4 – Main planner layout (two‑column)

Once the user is “inside” the app:

1. Transform the `.panel` into a split layout:

   - Left column (~360–420px on desktop):
     - A vertical stack of controls and route information.
   - Right column (rest of width):
     - A full‑bleed map canvas with slightly rounded corners and a subtle border (matching the shell aesthetic).

2. Implement this in React as something like `PlannerView.jsx`, rendered inside `ShellLayout`.

3. Ensure responsive behavior:
   - On mobile (width < 768px):
     - Toolbar at top (start/destination, route options).
     - Map takes most of the screen.
     - Route details and filters become a bottom sheet or slide‑in panel.

---

## Step 5 – Left column content: controls and stats

In the left column, implement the following **in order**:

1. **Header row**
   - Small logo/wordmark for bikeroutes.org (text is fine for now).
   - Optional navigation tabs: “Map · Community · About”.
   - Global CTA (e.g., “Donate”) styled as a pill button.

2. **Route input**
   - Start and destination inputs:
     - Text fields with autocomplete (using existing APIs if available).
     - Small buttons to swap start/end and to set current location.
   - Option for “Roundtrip from here” vs “One‑way” (radio buttons or segmented control).

3. **Ride type / preset selector**
   - A horizontal selector for ride purpose:
     - “Commute”, “Chill loop”, “Gravel”, “MTB”, “Family”.
   - Changing this updates route options (e.g., surfaces to prefer/avoid) when computing a route.

4. **Route stats**
   - Once a route is calculated, show:
     - Distance.
     - Elevation gain.
     - Estimated ride time.
   - Display as a compact card using `.box` style, with bold typography.

5. **Filters and badges**
   - Surface / facility filters:
     - Paved, gravel, dirt/MTB.
     - Facility types (e.g., shared path, bike lane, separated lane, MTB trail), assuming this metadata comes from the backend/tiles.
   - Accessibility filters:
     - Wheelchair friendly / step‑free.
     - Kid‑trailer friendly.
   - Each filter appears as a pill or chip styled like mini `.box` elements.

6. **Route summary & actions**
   - Basic turn/segment list or high‑level “segments” overview.
   - Actions:
     - “Export GPX”.
     - “Share link”.
     - “Reset route”.

---

## Step 6 – Right column: map view and overlays

Reuse existing map logic (MapLibre/Leaflet, tile endpoints, interaction) but visually align it:

1. Mount the map in a `<div>` that:
   - Fills the right column.
   - Has border radius and subtle border consistent with the shell.
   - Sits on `--color-bg` with a small drop shadow.

2. Add a gradient overlay or subtle vignette only if it does not interfere with map readability.

3. Map controls:
   - Zoom buttons, geolocation, layer switcher, etc. rendered as glassy circles or rounded pills using `--color-surface`, `--color-primary`, and `--shadow-lg`.

4. Optional: segment hover preview
   - When hovering a key trail / segment, show a small tooltip card near the pointer with:
     - Surface type / facility type.
     - Short label (e.g., trail name).
     - Tiny elevation sparkline.
   - Style this tooltip with the `.box` / `.panel` glass aesthetic.

---

## Step 7 – Theming, typography, and motion

1. Ensure all typography uses:
   - `Cabinet Grotesk` for display (headings, hero).
   - `Satoshi` for body/copy.
   - The provided `--text-*` scales; avoid hard‑coded font sizes.

2. Keep colors and contrast:
   - Use `--color-primary` primarily for CTAs and active states.
   - `--color-text-muted` for secondary text.

3. Motion:
   - Respect `prefers-reduced-motion`:
     - Disable tentacle animation and reduce large transitions when it’s on.
   - Use `--transition` for:
     - Hover/focus states on interactive elements.
     - Panel/tab transitions.
   - Avoid large parallax or gimmicky animations; keep movement purposeful and subtle.

---

## Step 8 – Accessibility and keyboard navigation

1. Maintain or improve accessibility:
   - Preserve the skip link (`.skip-link`) and ensure it jumps to meaningful content.
   - All interactive elements (buttons, filters, etc.) must be reachable via keyboard.
   - Focus states should be visible and consistent.

2. Map interactions:
   - Basic map zoom and panning can remain pointer‑driven, but ensure:
     - Controls (zoom, layer toggles) are keyboard‑focusable.
     - ARIA labels exist where appropriate.

---

## Step 9 – Refactoring and cleanup

1. Remove or deprecate old UI components that are no longer used (legacy sidebar, old headers, etc.), but preserve:
   - API client code.
   - Map configuration and tile URLs.
   - Routing logic and utility functions.

2. Ensure all imports are updated and that the new app builds and runs via:
   - `npm install`
   - `npm run dev`
   - `npm run build`

3. Keep the codebase organized:
   - `components/` for presentational + container components.
   - `hooks/` for data‑fetching and routing hooks (if not already in place).
   - CSS modules or well‑structured global CSS matching the new design.

---

## Step 10 – Deliverables

When you’re done, provide:

1. A brief written summary of what changed:
   - New layout structure.
   - New components added.
   - Old components removed or refactored.

2. A list of any TODOs or follow‑ups:
   - Places where the backend lacks metadata (e.g., facility type, accessibility flags).
   - Small UX polish items that could be added later.

3. The updated code:
   - All relevant React components and CSS.
   - Any new helper utilities.

Follow this prompt step‑by‑step, work directly in the repo structure, and prioritize a **coherent, polished, and welcoming ride‑planning experience** that matches the aesthetic and motion of the provided HTML shell.
