-- 0002_community_features.sql

-- ─── Community Condition Reports ────────────────────────
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    poi_id TEXT REFERENCES pois(id),      -- Optional: if the report is attached to a specific POI
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    type TEXT NOT NULL,                   -- mud | flooding | closure | debris | cops | other
    description TEXT,
    user_id TEXT REFERENCES users(id),
    status TEXT DEFAULT 'active',         -- active | resolved | hidden
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT DEFAULT (datetime('now', '+48 hours'))
);

CREATE INDEX IF NOT EXISTS idx_reports_expires ON reports(expires_at);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_location ON reports(lat, lon);

-- ─── POI Visibility ───────────────────────────────────
-- Add visibility column to pois table for the sensitivity policy
ALTER TABLE pois ADD COLUMN visibility TEXT DEFAULT 'public'; -- public, informal, sensitive, private
