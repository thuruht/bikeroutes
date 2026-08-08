# Project memory / open items

> This file tracks what still needs finishing, fixing, or deciding across the bikeroutes.org redesign.
> Update it whenever new TODOs, bugs, placeholders, or shortcuts are introduced.

## Recently landed
- [x] MapView: de-cluster curated points sooner, add hover popups and cluster feature list.
- [x] Map curated features load correctly; rail/trails overlay layers re-added after theme/style changes.
- [x] `jojomap.kcmo.xyz` and `www.jojomap.kcmo.xyz` attached as custom domains and 301-redirected to `https://bikeroutes.org`.
- [x] Worker `run_worker_first` changed to `/*` so custom-domain redirects work while SPA assets still fall through.
- [x] Community/social MVP: posts, images/videos via R2, likes, comments, auth via magic-link codes.
- [x] Real transactional email sending for magic-link login codes via Cloudflare Email Service (`noreply@bikeroutes.org`).
- [x] D1 migration `0019_community_posts.sql` applied to production.
- [x] Community categories cleaned up: removed nonsensical "Mud/snake", split into `Mud` and `Wildlife`, relabeled `Trail report`.
- [x] "New post" plus icon sized correctly instead of scaling to fill the button.
- [x] Route legend moved from hidden info modal to visible Map panel; filtered street-name noise; added display names and network context.
- [x] Curated feature submission/review flow: users can suggest new points/lines or request edits to existing features; moderators approve/reject from the Map panel.
- [x] Route source badge now reads the real provider from the worker's `X-Route-Source` header instead of always claiming Valhalla.
- [x] Global auth context with logged-in user indicator in the top bar across all views.
- [x] User avatar upload + profile editing (username, display name, bio).
- [x] Secure direct messages (private conversations between signed-in users).
- [x] D1 migrations `0020_curated_submissions.sql` and `0023_direct_messages.sql` applied to production.

## Regression guard policy (must follow)
These rules exist because `main` is production. Every change below has to pass before commit/push:

1. **Type-check the Worker before build:**
   ```bash
   cd worker && npx tsc --noEmit
   ```
2. **Build the front-end and read the build log for red errors/warnings.**
   ```bash
   cd frontend && npm run build
   ```
3. **Manual smoke-test in local dev (if UI changes):**
   - Map tab loads curated features without console errors.
   - Rail + trails overlays toggle on/off and survive a theme change.
   - Plan route still calculates and draws a line.
   - Community tab loads feed, login modal opens, "New post" modal opens without giant icons.
4. **Deploy via `npm run deploy` in `worker/` when Docker is available, otherwise with `--containers-rollout=none` and only after the same local checks.**
5. **After deploy, curl the live health endpoint and one API endpoint that changed.**
6. **If a bug is found on production, add it to this MEMORY.md immediately.**

If this policy is not strong enough to stop a class of mistakes, expand it here.

## Bugs / errors / typos
- [x] `mudosnake` post category removed → replaced with `mud` and `wildlife` categories.
- [x] Real email sending implemented for magic-link codes; dev_code fallback removed (email only).
- [ ] Magic-link codes stored in KV with hash key but never rate-limited; brute-force possible.
- [ ] Workers AI model names (`@cf/baai/bge-base-en-v1.5`) can change and break `/api/search`; needs monitoring/dashboard check.
- [ ] `last_import: "never"` in `/api/health` is misleading; the daily cron is running but no heartbeat is written for it.

## Incomplete / stubs / lazy shortcuts
- [x] Curated-feature contribution / correction UI with geometry editor added; still needs notifications on approve/reject.
- [x] Legacy JKCBIKEMAP user accounts (6 users, including admin/jojo, burp, Q) migrated into bikeroutes.org `users` table, preserving roles, usernames, bios, badges, and public keys.
- [x] Legacy jojo avatar copied from old `jkcbikemap-avatars` R2 bucket to `bikeroutes-assets` and wired to `manual-admin-2`.
- [ ] Old JKCBIKEMAP reports, checkpoints, comments, and other gamification data do not exist in the live old database (counts are all zero), so nothing further to migrate from there.
- [x] Community posts now render as orange pin markers on the map; clicking a marker opens the post detail.
- [x] Community post cards have a green map-pin button that flies the map to the post location.
- [ ] Community: post location picker is still "use current map center"; click-to-pin UI not yet built.
- [ ] Community: no notification system for replies/likes.
- [ ] Community: no moderation queue or admin tools for reported posts.
- [ ] Community: user profiles are bare (no avatar upload, bio editing, public profile page).
- [ ] Valhalla container is **not running in production** because the build machine has no Docker. FOSSGIS fallback handles routing for now.
- [x] Route source badge fixed to show actual source (Valhalla/FOSSGIS/BRouter) from response header.
- [ ] Old JKCBIKEMAP reports, checkpoints, comments, and gamification data were not migrated.
- [ ] Route "Save" button is just a local state toggle; saved routes are not persisted to D1.
- [ ] Tile proxy `/api/tiles/*.pmtiles` 404s if no `.pmtiles` file is in R2 yet.
- [ ] North Star / KC2026 pages (`docs/north_star`) mention placeholder leaderboard and scout route submission UI; not implemented.

## TODOs / follow-ups from conversation
- [ ] Turn JKCBIKEMAP old reports/mud/snake/test data into community seed posts (fake users, so no consent issue).
- [ ] Make the curated-feature "Suggest correction" form and admin review endpoint.
- [ ] Add `Map data` / `About` nav links content is still generic copy.
- [ ] Add POI markers on the map for Explore search results (only list cards and map popups right now).
- [ ] Consider reducing CARTO tile dependency by hosting own tiles from R2.

## Deployment / infra notes
- Deploy now uses `npx wrangler deploy --containers-rollout=none`. To ship Valhalla, run full deploy from a machine with Docker.
- Migrations are run manually (`npm run db:migrate:remote`) because shortcuts bypassed the `predeploy` hook.
- `worker/.dev.vars` contains `ADMIN_SECRET`; do not commit or deploy it.

## Files to keep an eye on
- `worker/src/index.ts` — routing, custom-domain redirect, asset fallthrough.
- `worker/src/routes/community.ts` — social feed backend.
- `frontend/src/components/CommunityView.jsx` — social frontend.
- `frontend/src/App.jsx` — map layer setup, overlays, rail layer.
- `worker/src/routes/curated-features.ts` — where the "Suggest correction" feature should live.
- `worker/migrations/0019_community_posts.sql` — community schema.
