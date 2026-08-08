-- Community moderation/reporting tables

-- Reports against community posts and comments
CREATE TABLE IF NOT EXISTS community_reports (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  post_id TEXT REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id TEXT REFERENCES community_post_comments(id) ON DELETE CASCADE,
  reporter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open | resolved | dismissed
  moderator_note TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_community_reports_post_id ON community_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_status ON community_reports(status);
CREATE INDEX IF NOT EXISTS idx_community_reports_created_at ON community_reports(created_at DESC);

-- Allow moderators to hide individual comments
ALTER TABLE community_post_comments ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
CREATE INDEX IF NOT EXISTS idx_community_post_comments_status ON community_post_comments(status);
