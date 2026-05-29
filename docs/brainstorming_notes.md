## Storage Decisions
- **Preferences:** Use Workers KV for theme preferences, sessions, and map style settings.
- **Primary route data:** Store user‑generated routes in Cloudflare D1 (SQL) for robust querying and analytics.
- **Additional services:** May use R2 for media assets and Durable Objects for real‑time collaboration where needed.
