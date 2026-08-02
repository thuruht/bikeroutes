-- 0012_users_extend.sql
-- MM-009: Extend bikeroutes users table with JKCBIKEMAP role and profile fields
-- Source: JKCBIKEMAP/migrations/0005_user_accounts.sql (role), 0006_gamification.sql (reputation),
--         0010_vanity_profiles.sql (username/bio/avatar), 0011_dm_keys.sql (public_key)
-- DR-003 constraint: email NOT ported (bikeroutes stores email_hash only; no plaintext email in bikeroutes)

ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
-- role values: 'public' | 'user' | 'contributor' | 'moderator' | 'admin'

ALTER TABLE users ADD COLUMN reputation_score INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN contributor_level INTEGER DEFAULT 1;

ALTER TABLE users ADD COLUMN username TEXT;
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT;   -- R2 key under avatars/ prefix in R2_ASSETS bucket
ALTER TABLE users ADD COLUMN social_links TEXT; -- JSON object: {"twitter": "...", "mastodon": "..."}
ALTER TABLE users ADD COLUMN public_key TEXT;   -- E2E DM encryption public key (optional)

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;
