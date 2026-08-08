-- Make post_id nullable on community_post_media so images/videos can be
-- uploaded before the post they belong to exists, then attached later.

CREATE TABLE community_post_media_new (
  id TEXT PRIMARY KEY,
  post_id TEXT,
  user_id TEXT NOT NULL,
  file_name TEXT,
  content_type TEXT,
  r2_key TEXT NOT NULL,
  r2_bucket TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO community_post_media_new SELECT * FROM community_post_media;

DROP TABLE community_post_media;

ALTER TABLE community_post_media_new RENAME TO community_post_media;

CREATE INDEX IF NOT EXISTS idx_community_post_media_post_id ON community_post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_community_post_media_user_id ON community_post_media(user_id);
