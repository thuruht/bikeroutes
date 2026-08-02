-- 0004_curated_features.sql
-- MM-001: Add curated_features table (JKCBIKEMAP curated feature model)
-- Source: JKCBIKEMAP/migrations/0001_initial.sql + 0004_features_longevity.sql + DR-004 (code-path columns)
-- D1-compatible SQLite syntax

CREATE TABLE IF NOT EXISTS curated_features (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    slug TEXT UNIQUE,
    name TEXT NOT NULL,
    feature_type TEXT NOT NULL,       -- 'point' | 'line'
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    visibility TEXT NOT NULL DEFAULT 'public',   -- 'public' | 'informal' | 'sensitive' | 'private'
    officiality TEXT NOT NULL DEFAULT 'official', -- 'official' | 'informal' | 'planned'
    public_description TEXT,
    admin_note TEXT,
    surface_note TEXT,
    risk_note TEXT,
    weather_sensitivity TEXT,
    source_confidence TEXT,           -- 'high' | 'medium' | 'low'
    searchable_text TEXT,
    owner_id TEXT,                    -- FK to users.id (nullable: system-seeded curated_features have no owner)
    longevity TEXT DEFAULT 'permanent', -- 'permanent' | 'temporary' | 'seasonal' (DR-004)
    poster_email TEXT,                -- anonymous submission email (DR-004)
    delete_token TEXT,                -- anonymous submission delete token (DR-004)
    last_verified_at DATETIME,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_curated_features_category ON curated_features(category);
CREATE INDEX IF NOT EXISTS idx_curated_features_visibility ON curated_features(visibility);
CREATE INDEX IF NOT EXISTS idx_curated_features_feature_type ON curated_features(feature_type);
CREATE INDEX IF NOT EXISTS idx_curated_features_status ON curated_features(status);
CREATE INDEX IF NOT EXISTS idx_curated_features_slug ON curated_features(slug);
