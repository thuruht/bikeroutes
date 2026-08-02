-- 0009_notifications.sql
-- MM-006: Add notifications table
-- Source: JKCBIKEMAP/migrations/0016_notifications_system.sql

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,     -- 'comment' | 'dm' | 'system' | 'report_resolved'
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link TEXT,              -- internal path e.g. /feature/[id] or /feature/[slug]
    is_read INTEGER DEFAULT 0,  -- D1/SQLite: use INTEGER not BOOLEAN
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
