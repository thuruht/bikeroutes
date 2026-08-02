-- 0007_curated_feature_sources.sql
-- MM-004: Add curated_feature_sources table (source citation and confidence tracking)
-- Source: JKCBIKEMAP/migrations/0001_initial.sql

CREATE TABLE IF NOT EXISTS curated_feature_sources (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    feature_id TEXT NOT NULL,
    source_url TEXT,
    source_note TEXT,
    confidence TEXT,    -- 'high' | 'medium' | 'low'
    verified_at DATETIME,
    FOREIGN KEY (feature_id) REFERENCES curated_features(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_curated_feature_sources_feature_id ON curated_feature_sources(feature_id);
