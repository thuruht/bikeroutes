-- BikeRoutes.org D1 Schema — Initial Migration
-- Tables: routes, pois, donations, users, search_logs, route_logs, contributions

-- ─── Routes (user-created routes) ──────────────────────
CREATE TABLE IF NOT EXISTS routes (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    description TEXT,
    geojson TEXT NOT NULL,             -- GeoJSON LineString
    distance_km REAL,
    elevation_gain_m REAL,
    surface_breakdown TEXT,            -- JSON: { paved: 0.6, gravel: 0.3, dirt: 0.1 }
    difficulty TEXT DEFAULT 'moderate', -- easy | moderate | hard | expert
    created_by TEXT,                   -- user ID or 'anonymous'
    status TEXT DEFAULT 'published',   -- draft | published | archived
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ─── POIs (Points of Interest) ────────────────────────
CREATE TABLE IF NOT EXISTS pois (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,            -- water | bike_shop | trailhead | scenic | etc.
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    description TEXT,
    submitted_by TEXT DEFAULT 'community',
    status TEXT DEFAULT 'pending',     -- pending | approved | rejected
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pois_status ON pois(status);
CREATE INDEX IF NOT EXISTS idx_pois_location ON pois(lat, lon);
CREATE INDEX IF NOT EXISTS idx_pois_category ON pois(category);

-- ─── Donations ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL UNIQUE,
    amount REAL NOT NULL,
    tier TEXT NOT NULL,                -- coffee | sandwich | trail_supporter | route_builder | inner_circle
    status TEXT DEFAULT 'pending',     -- pending | completed | refunded
    donor_alias TEXT,                  -- opt-in display name
    show_on_wall INTEGER DEFAULT 0,   -- 1 = show on supporters wall
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);

-- ─── Users (magic-link auth) ──────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email_hash TEXT NOT NULL UNIQUE,   -- SHA-256 of email (privacy)
    display_name TEXT,
    trust_level INTEGER DEFAULT 0,     -- 0=new, 1=scout, 2=pathfinder, 3=steward
    contribution_count INTEGER DEFAULT 0,
    badges TEXT DEFAULT '[]',          -- JSON array of badge IDs
    is_subscriber INTEGER DEFAULT 0,
    subscription_tier TEXT,
    subscription_start TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    last_active TEXT DEFAULT (datetime('now'))
);

-- ─── Contributions (tracks all user edits) ────────────
CREATE TABLE IF NOT EXISTS contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id),
    type TEXT NOT NULL,                -- route | poi | correction | report
    target_id TEXT,                    -- ID of the route/POI affected
    status TEXT DEFAULT 'pending',     -- pending | accepted | rejected
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contributions_user ON contributions(user_id);

-- ─── Search Logs (analytics, no PII) ─────────────────
CREATE TABLE IF NOT EXISTS search_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    result_count INTEGER DEFAULT 0,
    ip_hash TEXT,                      -- truncated SHA-256 (privacy)
    created_at TEXT DEFAULT (datetime('now'))
);

-- ─── Route Logs (analytics) ──────────────────────────
CREATE TABLE IF NOT EXISTS route_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_route_logs_date ON route_logs(created_at);
