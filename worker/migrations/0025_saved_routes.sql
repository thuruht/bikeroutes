-- 0025_saved_routes.sql
-- Persist user-saved routes so the "Save" button is not just local state.

CREATE TABLE IF NOT EXISTS saved_routes (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    waypoints TEXT NOT NULL,         -- JSON array of {lat, lon, label?}
    geometry TEXT,                  -- GeoJSON LineString of computed route
    costing TEXT,                   -- bicycle balanced/quiet/fast etc.
    distance_km REAL,
    duration_min REAL,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_saved_routes_user_id ON saved_routes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_routes_created_at ON saved_routes(created_at);
