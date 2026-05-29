# Agentic Task: Add FIFA World Cup 26 KC Mode to bikeroutes.org

## Repository
`https://github.com/thuruht/bikeroutes.git`
Frontend: Vite + React (JSX), located in `frontend/src/`. Key files:
- `frontend/src/App.jsx` — root component; manages `activeTab` state ('explore', 'community', 'about'), global route/waypoint/filter state
- `frontend/src/components/Header.jsx` / `Header.css` — top nav bar with tab buttons + donate CTA
- `frontend/src/components/Sidebar.jsx` / `Sidebar.css` — left panel; route options, filters, maneuver list
- `frontend/src/components/MapView.jsx` / `MapView.css` — Maplibre GL map
- `frontend/src/components/DonateBanner.jsx` / `DonateBanner.css` — modal-style overlay
- `frontend/src/index.css` — global CSS variables (dark/light mode)

***

## Goal
Add a **FIFA World Cup 26 Kansas City mode** to the existing bikeroutes.org app. The mode is activated by a clickable **FWC26 notification badge / banner** that appears in the UI. When toggled ON, the app switches to a World Cup–tailored experience without destroying the regular app state underneath. When toggled OFF, the regular app resumes seamlessly.

This is a **World Cup visitor mobility tool** with three equally important outcomes for KC2026 planning and MARC transportation stakeholders:
1. **Reducing car/parking pressure** near venues (Arrowhead, Union Station, Power & Light, West Bottoms fan zones)
2. **Showcasing Kansas City's trail and bike culture** to international visitors
3. **Safe, supported corridor wayfinding** aligned with ConnectKC26 and MARC regional transportation planning

***

## Task Breakdown

### 1. FWC26 Notification Badge (Entry Point)

Add a pulsing notification badge/button to the Header that serves as the toggle for World Cup mode.

**Placement:** Right side of the header, before or after the Donate button. On mobile, it should collapse to an icon-only badge.

**Visual design:**
- Color: Use FIFA red/white or a KC-branded accent (`#c8102e` red + `#003087` deep navy) — distinct from the existing app's color palette so it reads as "special mode"
- Badge shows: ⚽ `KC 2026` text + a pulsing dot animation when unread/inactive
- When World Cup mode is ON: button changes to an active/pressed state (e.g., lit up gold or white), and a small FIFA ball emoji or soccer icon persists
- Animate the entry: on first load, the badge should do a subtle bounce-in after ~1.5s to draw attention without being disruptive

**State:** Add a boolean `wcMode` state in `App.jsx`. Clicking the badge toggles `wcMode`. Persist the preference in a module-level variable (NOT localStorage — sandbox-blocked). Use a `wcModeAcknowledged` flag so the pulsing animation stops after the user has interacted with it once.

***

### 2. WCMode Banner (Persistent context bar)

When `wcMode === true`, render a slim **context bar** just below the Header (above the main content area). This is not a modal — it should always be visible in WC mode.

**Contents:**
- Left: ⚽ **"FIFA World Cup 26 — Kansas City Mode"** label in bold
- Center: A very short tagline — *"Bike to the game. Beat the traffic."*
- Right: Quick-access buttons:
  - 📍 **Match Day Routes** — pre-loads a venue-to-transit curated route set
  - 🚲 **Trails for Visitors** — activates a visitor-friendly filter preset
  - ✕ **Exit KC Mode** — returns to normal

**Styling:** Use KC2026 red/navy/white color scheme, keeping it visually separate from the existing dark-mode app chrome. Height ~48px. Full-width.

***

### 3. World Cup Sidebar Panel

When `wcMode === true` AND `activeTab === 'explore'`, inject a **WC Mode overlay panel** into the Sidebar — rendered above the existing route options, not replacing them.

This panel should contain:

#### a. Venue Quick-Select
A horizontal row of compact buttons, each pre-loading a venue as a map destination (B waypoint):
- ⚽ **Arrowhead Stadium** — `[-94.4839, 39.0489]`
- 🚉 **Union Station** (transit hub / fan zone central) — `[-94.5838, 39.0997]`
- 🎉 **Power & Light District** — `[-94.5786, 39.0999]`
- 🌉 **West Bottoms Fan Zone** — `[-94.5950, 39.1020]`
- 🏞️ **Berkley Riverfront** — `[-94.5784, 39.1082]`

Clicking a venue button sets it as the B waypoint. If no A is set, trigger the existing `handleSnapToLocation` (snap to user GPS). This gives visitors an instant "bike from here to the game" flow.

#### b. Matchday Route Profiles (toggle chips)
Three selectable route profile chips that adjust `routeOptions` and `activeFilters` to match World Cup context:

| Chip | Behavior |
|---|---|
| 🛣️ **Fast & Direct** | `avoidRoads: false`, `pavedOnly: true`, `minimizeHills: false` — fastest paved path |
| 🌿 **Trail & Scenic** | `avoidRoads: true`, surface filters: `paved + gravel`, `minimizeHills: true` — show KC trails |
| ♿ **Accessible** | `pavedOnly: true`, `minimizeHills: true`, `avoidRoads: false` — for inclusive visitor access |

Selecting a chip calls the existing `setRouteOptions()` and `toggleFilter()` accordingly. Highlight the active chip. Default to "Fast & Direct" when WC mode activates.

#### c. Visitor Tips Card (collapsible)
A small collapsible info card below the route chips:
- 🚲 "Bike share stations near Arrowhead open on matchdays"
- 🚇 "Shuttle buses run between Union Station and Arrowhead every 15 min"
- 🅿️ "Driving? Consider parking at Union Station and biking the last mile"
- 🌡️ "June/July in KC: bring water, expect 85–95°F"

This is static content. Style it as a subtle "info" card with a chevron toggle. Collapsed by default.

***

### 4. Map Layer Overlay (WC Mode)

When `wcMode === true`, apply the following to `MapView`:

#### a. Venue Markers
Add 5 custom map markers for the venue coordinates listed above. Each marker should:
- Use a distinctive FIFA-adjacent icon (soccer ball SVG or red location pin with ⚽)
- Show a popup on click with venue name, distance from current A waypoint (if set), and a "Route here →" button that sets it as the B waypoint
- Not conflict with existing route/waypoint marker logic

#### b. Recommended Corridor Highlight
Optionally (if map state allows), add a semi-transparent highlighted polyline layer representing the **MKT Nature/Fitness Trail** corridor from midtown → Union Station direction, labeled "Recommended Visitor Corridor." Use a dashed/animated line style in KC2026 red (`#c8102e`, opacity 0.6). This is the kind of recommended corridor that MARC/KC2026 would pre-bless for safety and crowd management.

Use a GeoJSON static line for the MKT trail approximate path (coordinates from publicly available KC trail data — approximate is fine, note it as illustrative). Add the layer via `map.addLayer()` inside the existing MapView `useEffect` on map load, conditional on `wcMode`.

Pass `wcMode` as a prop to `MapView`.

***

### 5. Community Tab — WC Leaderboard Placeholder

In `App.jsx`, the `community` tab currently shows a "coming soon" stub. Replace it with a **WC26 Community Leaderboard** view — a proper component: `frontend/src/components/WCLeaderboard.jsx`.

This component should render a **styled placeholder leaderboard** that shows the feature's intent clearly enough to demo to KC2026 stakeholders:

**Sections:**

1. **Match Day Riders** — A leaderboard table (mock data, clearly labeled "Sample Data"):
   - Columns: Rank, Username/Handle, Routes Completed, Distance (mi), Match Days Ridden
   - 8–10 mock rows with KC-flavored usernames (e.g., "BlueValleyBiker", "TrailHeadKC", "ArrowheadRider26")
   - Styled with subtle row highlights and rank badges (🥇🥈🥉 for top 3)

2. **Most-Ridden WC Routes** — A short list of 4–5 "featured routes" cards:
   - Each card: Route name, distance, surface type badge, a "Try this route →" button
   - Example routes: "Midtown to Arrowhead via MKT Trail", "Union Station to Power & Light Loop", "Riverfront Connector", etc.
   - Clicking "Try this route" switches to `explore` tab AND activates `wcMode` AND pre-loads that route's waypoints

3. **Share Your Ride** — A CTA card encouraging visitors to share routes, with a placeholder "Submit" button (no backend needed — just a modal saying "Coming soon!")

Style the whole view with the KC2026 red/navy palette to make it immediately distinct from the regular app.

***

### 6. New Files to Create

| File | Purpose |
|---|---|
| `frontend/src/components/WCBadge.jsx` | Header badge/toggle button |
| `frontend/src/components/WCBadge.css` | Badge styles, pulse animation |
| `frontend/src/components/WCContextBar.jsx` | Slim context bar below header in WC mode |
| `frontend/src/components/WCContextBar.css` | Context bar styles |
| `frontend/src/components/WCSidebarPanel.jsx` | Venue picker, route chips, visitor tips |
| `frontend/src/components/WCSidebarPanel.css` | Panel styles |
| `frontend/src/components/WCLeaderboard.jsx` | Community tab leaderboard view |
| `frontend/src/components/WCLeaderboard.css` | Leaderboard styles |

***

### 7. Modifications to Existing Files

#### `frontend/src/App.jsx`
- Add `wcMode` state: `const [wcMode, setWcMode] = useState(false)`
- Add `wcAcknowledged` state: `const [wcAcknowledged, setWcAcknowledged] = useState(false)`
- Pass `wcMode`, `setWcMode`, `wcAcknowledged`, `setWcAcknowledged` down to `Header`
- Render `<WCContextBar>` between `<Header>` and `<main>` when `wcMode` is true
- Pass `wcMode` to `Sidebar` and `MapView`
- In the `community` tab branch, replace the stub with `<WCLeaderboard onRouteSelect={(waypoints) => { setWaypoints(waypoints); setWcMode(true); setActiveTab('explore'); }} />`

#### `frontend/src/components/Header.jsx`
- Import and render `<WCBadge>` with `wcMode`, `onToggle`, `acknowledged` props

#### `frontend/src/components/Sidebar.jsx`
- Accept `wcMode` prop
- When `wcMode` is true, render `<WCSidebarPanel>` at the top of the sidebar content area, above existing route options
- Pass `onSetWaypoints` (wraps `setWaypoints` from App), `onSetRouteOptions`, `onSnapLocation`, `activeFilters`, `onToggleFilter`

#### `frontend/src/components/MapView.jsx`
- Accept `wcMode` prop
- When `wcMode` is true, add venue markers and the MKT trail corridor layer to the map
- Expose an `onVenueSelect` callback so WCSidebarPanel venue buttons can also pan/zoom the map to the selected venue

***

### 8. Design & Style Guidelines

- **KC2026 palette** (for all WC mode elements):
  - Primary: `#c8102e` (KC/FIFA red)
  - Secondary: `#003087` (deep navy)
  - Accent: `#FFD700` (gold, for active states and rank badges)
  - Background: `#0a0e1a` (very dark navy, distinct from existing app bg)
  - Text on WC elements: `#ffffff`
- **Existing app palette must not be modified.** WC mode elements are additive overlays.
- **Typography:** Inherit existing app fonts. WC mode headers may use `font-weight: 800` and `letter-spacing: 0.04em` for a bold event feel.
- **Animations:**
  - Badge pulse: `@keyframes wcPulse` — scale 1 → 1.12 → 1, 1.8s infinite, ease-in-out
  - Context bar: slide down from -48px to 0 on WC mode activation, 220ms ease-out
  - Sidebar panel: fade + slide in from left, 180ms ease-out
  - Venue marker bounce-in on map load, staggered 100ms per marker
- **Mobile:** WC context bar collapses to icon + "KC 2026" text only. WCSidebarPanel venue buttons wrap to 2 rows on small screens. Leaderboard table scrolls horizontally.

***

### 9. Quality & Compatibility

- Do not break existing routing, filter, or navigation functionality
- All new components must work in both light and dark mode (use `var(--text-primary)` etc. where appropriate for non-WC text)
- No additional npm packages required — use only what is already in `package.json` (React, Maplibre GL, existing deps)
- Run ESLint (`npx eslint frontend/src --fix`) before considering the task complete
- Test that toggling WC mode on and off multiple times does not cause stale state or map layer duplication (use `map.getLayer()` guards before `map.addLayer()`)

***

### 10. Acceptance Criteria

- [ ] WC badge visible in Header on both mobile and desktop
- [ ] Clicking badge toggles `wcMode`; pulsing animation stops after first click
- [ ] WC context bar appears/disappears with smooth animation
- [ ] Venue quick-select buttons set B waypoint and trigger route calculation
- [ ] Route profile chips update `routeOptions` and filters correctly
- [ ] Venue markers appear on map in WC mode; disappear when WC mode is off (no layer leaks)
- [ ] MKT corridor highlight layer renders and is removed cleanly on toggle
- [ ] Community tab shows WCLeaderboard (not the old stub)
- [ ] "Try this route" on leaderboard cards switches tab, activates WC mode, loads waypoints
- [ ] No ESLint errors in new files
- [ ] UI is functional and non-broken at 375px mobile width
