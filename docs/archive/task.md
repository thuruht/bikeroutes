- [ ] **Setup Project Workspace**
  - Create project directory `/home/jojo/.gemini/antigravity-ide/scratch/bikeroutes/`.
  - Initialize Git repository.
  - Set this directory as the active workspace.

- [ ] **Initialize Frontend Stack**
  - Run `npx -y create-vite@latest ./ --template react` (or chosen framework).
  - Commit initial scaffold.

- [ ] **Install Core Dependencies**
  - `npm install leaflet react-leaflet @maplibre/gl-js @turf/turf axios`
  - (Optional) `npm install tailwindcss postcss autoprefixer` for styling.

- [ ] **Configure Premium Design System**
  - Add Google Font **Inter** via `<link>` in `index.html`.
  - Create `src/styles/design.css` with glass‑morphism, dark‑mode variables, micro‑animations.
  - Set up Tailwind (if used) or vanilla CSS utilities.

- [ ] **Create Core UI Components**
  - `MapView` – integrates Leaflet/MapLibre, loads OSM base tiles, supports vector tiles.
  - `RouteEditor` – drawing tools (polyline, markers), elevation profile using Turf.
  - `FilterBar` – UI for trail type, difficulty, surface filters.
  - `ExportModal` – GPX/KML/GeoJSON export functionality.
  - `CommunityPanel` – list of user routes, rating/comments UI.

- [ ] **State Management**
  - Set up React Context (or Zustand) for route data, filter state, user session.

- [ ] **OSM & GIS Integration**
  - Implement Overpass API wrapper (`src/lib/overpass.ts`) to query trails (`highway=path`, `bicycle=designated`).
  - Add GIS utilities (`src/lib/gis.ts`) using Turf for distance, elevation, line simplification.

- [ ] **SEO & Metadata**
  - Add `<title>BikeRoutes.org – Trail Explorer</title>` and meta description.
  - Open Graph tags for sharing.

- [ ] **Accessibility Audit**
  - Run Chrome DevTools a11y‑debugging skill; fix any WCAG issues.

- [ ] **Optional Backend (Firebase)**
  - Initialize Firebase project, enable Firestore.
  - Deploy Firebase Functions for route storage API.
  - Add client SDK to store/retrieve user routes.

- [ ] **Deployment Setup**
  - Add `firebase.json` for Hosting with custom domain `bikeroutes.org`.
  - Configure GitHub Actions workflow to build (`npm run build`) and deploy (`firebase deploy`).

- [ ] **Testing**
  - Write Jest + React Testing Library tests for GIS utils and components.
  - Run `npm test` and ensure coverage ≥80%.

- [ ] **Documentation & Release**
  - Create `README.md` with contribution guide, setup instructions, and licensing.
  - Tag initial release `v0.1.0` on GitHub.

- [ ] **Final Review & Launch**
  - Perform manual QA on desktop & mobile.
  - Verify performance (LCP, INP) using Chrome DevTools.
  - Publish site at `https://bikeroutes.org`.
