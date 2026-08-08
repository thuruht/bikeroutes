-- Curated feature contribution / correction queue
CREATE TABLE IF NOT EXISTS curated_feature_submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  author_name TEXT,
  -- NULL means a brand-new feature suggestion; set means proposed edit to existing feature
  target_feature_id TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  feature_type TEXT NOT NULL DEFAULT 'point',
  -- GeoJSON Point or LineString
  geom TEXT NOT NULL,
  source_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (target_feature_id) REFERENCES curated_features(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cfs_user_id ON curated_feature_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_cfs_status ON curated_feature_submissions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cfs_target ON curated_feature_submissions(target_feature_id);
