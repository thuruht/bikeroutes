-- 0011_curated_feature_checkpoints.sql
-- MM-008: Add curated_feature_checkpoints table (community verification log)
-- Source: JKCBIKEMAP/migrations/0007_checkpoints_discretion.sql
-- DR-005 fix applied: column is check_in_type (migration), not 'type' (JKCBIKEMAP handler bug)

CREATE TABLE IF NOT EXISTS curated_feature_checkpoints (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    contributor_id TEXT NOT NULL,
    feature_id TEXT NOT NULL,
    check_in_type TEXT DEFAULT 'passage',   -- 'passage' | 'verification' | 'media_update'
    note TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (contributor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (feature_id) REFERENCES curated_features(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_curated_feature_checkpoints_feature_id ON curated_feature_checkpoints(feature_id);
CREATE INDEX IF NOT EXISTS idx_curated_feature_checkpoints_contributor_id ON curated_feature_checkpoints(contributor_id);
