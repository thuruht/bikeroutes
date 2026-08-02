-- 0010_badges.sql
-- MM-007: Add badges and user_badges tables
-- Source: JKCBIKEMAP/migrations/0006_gamification.sql, 0007_checkpoints_discretion.sql,
--         0012_creator_recognition.sql, 0017_noob_badge.sql
-- Note: users.badges JSON array (from 0001_initial_schema.sql) is superseded by this normalized model.

CREATE TABLE IF NOT EXISTS badges (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon_svg TEXT
);

CREATE TABLE IF NOT EXISTS user_badges (
    user_id TEXT NOT NULL,
    badge_id TEXT NOT NULL,
    unlocked_at DATETIME DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, badge_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
);
-- Badge definitions are seeded in 0015_seed_badges.sql after features are imported.
