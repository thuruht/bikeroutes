-- 0013_trails_visibility.sql
-- MM-010: Add visibility and sensitivity fields to trails table
-- Source: JKCBIKEMAP/jojomap-sensitivity-policy.md
-- Must be applied before MM-018 (features.ts visibility filter) goes live

ALTER TABLE trails ADD COLUMN visibility TEXT DEFAULT 'public';
-- visibility values: 'public' | 'informal' | 'sensitive' | 'private'

ALTER TABLE trails ADD COLUMN officiality TEXT DEFAULT 'official';
-- officiality values: 'official' | 'informal' | 'planned'

ALTER TABLE trails ADD COLUMN admin_note TEXT;
-- admin_note: internal curator notes, never exposed to public API

CREATE INDEX IF NOT EXISTS idx_trails_visibility ON trails(visibility);
