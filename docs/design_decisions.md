# BikeRoutes.org — Design Decisions (Fine‑Tuned)

## 1. Donation Tiers & Merch

### Tier Structure

| Tier | Amount | Name | Reward |
|------|--------|------|--------|
| ☕ | **$5** | *Coffee* | Thank‑you email + name on Supporters Wall (opt‑in) |
| 🥪 | **$10** | *Sandwich* | Above + downloadable sticker‑pack (PNG/SVG of the mascot with trail scenes) |
| 🗺️ | **$15** | *Trail Supporter* | Above + contributor badge on profile |
| 👕 | **$25** | *Route Builder* | Above + **free T‑shirt** (Printful, standard tee) |
| 🏔️ | **$50** | *Super [TBD Name]* | Above + **free hoodie** (Printful premium) + hand‑written thank‑you postcard |

> [!TIP]
> **Naming the $10 tier "Sandwich"** opens the door for mascot‑themed copy:
> *"Is [mascot name] hungry after a long ride? Buy 'em a sandwich!"*
> This works especially well if the mascot is a real critter you've personally encountered on rides — it adds authenticity and an inside‑joke feel.

> [!IMPORTANT]
> **Open question:** What should the $50 "Super" tier be called?
> Some ideas tied to potential mascots:
> - 🦊 Fox → *"Fox Den Founder"*
> - 🦝 Raccoon → *"Trash Panda VIP"*
> - 🦡 Badger → *"Badger Den Builder"*
> - 🐿️ Prairie Dog → *"Colony Chief"*
> - Generic → *"Trailblazer"* / *"Pathfinder Prime"*

### Recurring Monthly Subscription

| Monthly | Name | Perks |
|---------|------|-------|
| **$3/mo** | *Sustainer* | All one‑time $5 perks + a monthly "trail of the month" email digest |
| **$5/mo** | *Patron* | All one‑time $15 perks + early access to new features/regions |
| **$10/mo** | *Champion* | All one‑time $25 perks + free T‑shirt after 3 months + free hoodie after 12 months |

#### Monthly Subscriber Loyalty Program

Incentives accumulate based on **consecutive months active**:

| Months Active | Milestone Reward |
|---------------|-----------------|
| 1 month | Welcome email from the mascot 🐾 |
| 3 months | **Free T‑shirt** (Printful standard) |
| 6 months | Exclusive sticker design (limited‑edition seasonal mascot) |
| 9 months | Name featured in the annual "Community Report" PDF |
| 12 months | **Free hoodie** + "Founding Sustainer" permanent badge |

#### Monthly Mailer (Email Digest)

Every subscriber gets a **"Trail Mail"** monthly email with:
- 🗺️ **Trail of the Month** — a curated route with photos, elevation, and surface breakdown
- 📊 **Community Stats** — routes added, POIs submitted, new regions imported
- 🐾 **Mascot Corner** — a playful illustration of the mascot on a different trail each month (great for engagement)
- 💰 **Transparency Report** — what donations covered this month (e.g., "Your $3 paid for 6 hours of tile serving")
- 🆕 **What's New** — changelog highlights, upcoming features

> [!TIP]
> **Implementation:** Use Cloudflare Email Workers + a simple HTML template stored in KV. Trigger via a monthly Cron Worker (`0 9 1 * *`). Subscriber list stored in KV with email + tier + start‑date.

---

## 2. OSM Import Region

### Scope: Full US Midwest
**States:** Missouri, Kansas, Iowa, Nebraska, Oklahoma

| Metric | Estimate |
|--------|----------|
| OSM extract size (PBF) | ~2–3 GB combined |
| `osm2pgsql` import time | ~45–90 min on a 4‑core VPS |
| Tile pre‑render (zoom 0–14) | ~2–4 hours |
| Daily delta update | ~5–15 min using `osmosis` or `pyosmium` |
| Storage (tiles + routing graph) | ~15–25 GB |

### Import Pipeline

```
┌─────────────────────────────────────────────────┐
│  Cron Worker (0 3 * * *)                        │
│  → POST webhook to VPS                          │
└──────────────┬──────────────────────────────────┘
               │
               v
┌─────────────────────────────────────────────────┐
│  VPS: import.sh                                 │
│  1. Download daily .osc.gz diffs (Geofabrik)    │
│  2. Apply diffs with osm2pgsql --append         │
│  3. Re-render changed tiles (mod_tile / tirex)  │
│  4. Rebuild Valhalla graph (valhalla_build_tiles)│
│  5. Blue/green swap: mv tiles-new/ → tiles/     │
│  6. POST success webhook → Worker               │
└──────────────┬──────────────────────────────────┘
               │
               v
┌─────────────────────────────────────────────────┐
│  Worker: post-import handler                    │
│  1. Set KV key LAST_IMPORT = ISO timestamp      │
│  2. Purge Cloudflare tile cache (Cache API)     │
│  3. Re-index changed trails in Vectorize        │
│  4. Send health‑check ping to uptime monitor    │
└─────────────────────────────────────────────────┘
```

### Future Expansion
- Add regions incrementally as donations fund larger VPS storage.
- Donation progress bar: *"We're 73% toward adding Illinois!"*
- Each new region gets a campaign email to subscribers.

---

## 3. Community Moderation — Trust‑Based System

### Trust Levels

| Level | Name | Criteria | Permissions |
|-------|------|----------|-------------|
| 0 | *New Rider* | Just signed up (magic‑link email) | Submit POIs & corrections → enter moderation queue |
| 1 | *Trail Scout* | 5 accepted edits | Auto‑publish POIs; corrections still queued |
| 2 | *Pathfinder* | 25 accepted edits + 3 months active | Auto‑publish POIs & corrections; can vote on others' submissions |
| 3 | *Trail Steward* | Manually promoted by admin | Can approve/reject queued items; can ban spammers |

### Moderation Queue (Durable Objects)

Each **geohash cell** (precision 4, ~40 km²) gets its own Durable Object instance:
- Stores pending submissions as a sorted list (newest first).
- Exposes a WebSocket for real‑time moderation UI.
- Auto‑expires submissions not reviewed within 14 days (sends a "sorry, try again" email).

### Anti‑Spam Measures
- **Magic‑link email verification** before first submission (no passwords, no OAuth).
- **Rate limit:** Max 10 submissions/day for Level 0 users.
- **Duplicate detection:** Hash the lat/lon + category and check against existing POIs in KV.
- **Flagging:** Any logged‑in user can flag a POI; 3 flags → auto‑hide + queue for Steward review.

### Contribution Badges (displayed on public profile)
| Badge | Criteria |
|-------|----------|
| 🗺️ *Pathfinder* | First submitted route |
| 📍 *Scout* | 5 POIs submitted |
| 🔧 *Wrench* | Corrected a surface tag |
| 🌟 *Trail Champion* | 25+ accepted contributions |
| 🛡️ *Trail Steward* | Promoted to moderation role |
| 💰 *Sustainer* | Active monthly subscriber |

---

## 4. T‑Shirt & Hoodie Fulfillment (Printful)

### Flow
```
User donates $25+ (or 3‑month subscriber milestone)
        │
        v
Worker: /api/paypal/capture-order
        │ on success:
        v
Show "Claim your T‑shirt" form
  → Name, address, size (S–3XL), color preference
        │
        v
Worker: /api/merch/fulfill
  → Encrypt address (AES‑256, key in Cloudflare secret)
  → Store in KV: { claimToken, encryptedAddress, size, color, status: "pending" }
  → POST to Printful API: create order with product template
        │
        v
Printful prints & ships
  → Webhook: order.shipped → Worker updates KV status to "shipped"
  → Send shipping‑confirmation email with tracking link
```

### Printful Integration Details
| Item | Printful Product | Est. Cost | Donor Pays |
|------|-----------------|-----------|------------|
| Standard T‑shirt | Bella+Canvas 3001 | ~$12 + shipping | $25 donation (margin ~$8–10) |
| Premium Hoodie | Bella+Canvas 3719 | ~$25 + shipping | $50 donation (margin ~$15–20) |

> [!NOTE]
> Margins are thin — the goal is **not profit** but community engagement. T‑shirts are a thank‑you, not a revenue stream.

### Design Assets Needed
- Mascot illustration (front of shirt)
- `bikeroutes.org` wordmark (back of shirt, small)
- Seasonal variants (e.g., mascot wearing a scarf for winter donors)

---

## 5. Mascot — "Based on a Real Critter?"

> [!IMPORTANT]
> You mentioned wanting the mascot to be based on a **real critter you know** — maybe one you've actually seen on rides around KC. This would give the mascot an authentic, personal origin story that resonates with the community.
>
> **Some Midwest critters commonly spotted on KC‑area bike trails:**
> - 🦊 **Red Fox** — seen on Brush Creek trails, Indian Creek trail
> - 🦝 **Raccoon** — literally everywhere in KC, especially Blue River trails at dusk
> - 🦌 **White‑Tailed Deer** — Swope Park, Longview Lake trails
> - 🐿️ **Eastern Fox Squirrel** — the big fluffy ones on the Trolley Trail
> - 🦅 **Red‑Tailed Hawk** — circling above the Katy Trail
> - 🐢 **Box Turtle** — crossing the Gary Haller trail at 0.1 mph
> - 🦫 **Beaver** — damming up creeks near the MKT trail
> - 🐸 **Bullfrog** — heard on every evening ride near Blue Springs Lake
>
> **Which critter have you actually encountered on a ride and thought "that's our mascot"?**
> We'll brainstorm this separately as you mentioned, but having the species locked in will let us generate merch designs, sticker packs, and the monthly "Mascot Corner" illustrations.

---

*All decisions above are ready to be folded into the implementation plan once you confirm.*
