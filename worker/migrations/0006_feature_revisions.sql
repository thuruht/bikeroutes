-- 0006_curated_feature_revisions.sql
-- MM-003: Add curated_feature_revisions table (immutable edit history)
-- Source: JKCBIKEMAP/migrations/0001_initial.sql

CREATE TABLE IF NOT EXISTS curated_feature_revisions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    feature_id TEXT NOT NULL,
    actor TEXT NOT NULL,              -- user ID or 'system'
    changed_fields TEXT,              -- JSON array of field names changed
    previous_state TEXT,              -- JSON snapshot of previous values
    new_state TEXT,                   -- JSON snapshot of new values
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (feature_id) REFERENCES curated_features(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_curated_feature_revisions_feature_id ON curated_feature_revisions(feature_id);
CREATE INDEX IF NOT EXISTS idx_curated_feature_revisions_actor ON curated_feature_revisions(actor);
