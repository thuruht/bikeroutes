-- 0008_curated_feature_comments.sql
-- MM-005: Add curated_feature_comments table for feature discussions
-- Source: JKCBIKEMAP/migrations/0008_comments_and_sources.sql

CREATE TABLE IF NOT EXISTS curated_feature_comments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    feature_id TEXT NOT NULL,
    user_id TEXT,                -- NULL for anonymous (moderated before display)
    author_name TEXT,            -- display name at time of post
    body TEXT NOT NULL,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (feature_id) REFERENCES curated_features(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_curated_feature_comments_feature_id ON curated_feature_comments(feature_id);
CREATE INDEX IF NOT EXISTS idx_curated_feature_comments_user_id ON curated_feature_comments(user_id);
