# Project memory / open items

> This file tracks what still needs finishing, fixing, or deciding across the bikeroutes.org redesign.
> Update it whenever new TODOs, bugs, placeholders, or shortcuts are introduced.

## Recently landed
- [x] MapView: de-cluster curated points sooner, add hover popups and cluster feature list.
- [x] `jojomap.kcmo.xyz` and `www.jojomap.kcmo.xyz` attached as custom domains and 301-redirected to `https://bikeroutes.org`.
- [x] Community/social MVP: posts, images/videos via R2, likes, comments, auth via magic-link codes.
- [x] D1 migration `0019_community_posts.sql` applied to production.
- [x] Worker `run_worker_first` changed to `/*` so custom-domain redirects work while SPA assets still fall through.

## Bugs / errors / typos
- [ ] `mudosnake` post category is a typo/portmanteau. Decide: keep for flavor, rename to `mudsnake`, or split into `mud` + `snake` categories.
- [ ] Community auth request endpoint does not send email in production (`console.log` only returns dev code). Need a real email sender (Cloudflare Email, SendGrid, Postmark, etc.) before non-dev sign-ups work.
- [ ] Magic-link codes stored in KV with hash key but never rate-limited; brute-force possible.
- [ ] Workers AI model names (`@cf/baai/bge-base-en-v1.5`) can change and break `/api/search`; needs monitoring/dashboard check.
- [ ] `last_import: "never"` in `/api/health` is misleading; the daily cron is running but no heartbeat is written for it.

## Incomplete / stubs / lazy shortcuts
- [ ] Community: no map markers for posts yet. Posts have `lat`/`lon` but nothing renders them on the map.
- [ ] Community: post location picker is just "use current map center"; no click-to-pin UI.
- [ ] Community: no notification system for replies/likes.
- [ ] Community: no moderation queue or admin tools for reported posts.
- [ ] Community: user profiles are bare (no avatar upload, bio editing, public profile page).
- [ ] Valhalla container is **not running in production** because the build machine has no Docker. FOSSGIS fallback handles routing for now.
- [ ] Route source badge still says "live · Valhalla" even when `source === "fossgis"` / `"brouter"`. Frontend badge logic only checks `source === "valhalla"`.
- [ ] Route "Save" button is just a local state toggle; saved routes are not persisted to D1.
- [ ] Tile proxy `/api/tiles/*.pmtiles` 404s if no `.pmtiles` file is in R2 yet.
- [ ] North Star / KC2026 pages (`docs/north_star`) mention placeholder leaderboard and scout route submission UI; not implemented.

## TODOs / follow-ups from conversation
- [ ] Turn JKCBIKEMAP old reports/mudosnake/mud-hole/test data into community seed posts (fake users, so no consent issue).
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
- `worker/src/routes/curated-features.ts` — where the "Suggest correction" feature should live.
- `worker/migrations/0019_community_posts.sql` — community schema.
