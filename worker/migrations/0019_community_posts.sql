-- Community / social feed tables
-- Supports ride reports with optional location, photos, likes, comments.

-- Public posts from signed-in users
CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  -- Geo point for map markers, optional
  lat REAL,
  lon REAL,
  status TEXT NOT NULL DEFAULT 'active',
  -- Freshness / ranking signal
  score REAL NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Photos/files attached to posts
CREATE TABLE IF NOT EXISTS community_post_media (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
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

-- Likes on posts (one per user/post)
CREATE TABLE IF NOT EXISTS community_post_likes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Comments on posts
CREATE TABLE IF NOT EXISTS community_post_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT,
  author_name TEXT,
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Full-text search index for posts
CREATE VIRTUAL TABLE IF NOT EXISTS community_posts_search USING fts5(
  title,
  body,
  category,
  content='community_posts',
  content_rowid='rowid'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS community_posts_search_insert AFTER INSERT ON community_posts BEGIN
  INSERT INTO community_posts_search (rowid, title, body, category)
  VALUES (new.rowid, new.title, new.body, new.category);
END;

CREATE TRIGGER IF NOT EXISTS community_posts_search_update AFTER UPDATE ON community_posts BEGIN
  UPDATE community_posts_search SET title = new.title, body = new.body, category = new.category
  WHERE rowid = new.rowid;
END;

CREATE TRIGGER IF NOT EXISTS community_posts_search_delete AFTER DELETE ON community_posts BEGIN
  DELETE FROM community_posts_search WHERE rowid = old.rowid;
END;

-- Indexes for feed queries / moderation
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_status ON community_posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_geo ON community_posts(lon, lat) WHERE lat IS NOT NULL AND lon IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_community_post_media_post_id ON community_post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_community_post_likes_post_id ON community_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_post_comments_post_id ON community_post_comments(post_id, created_at DESC);
