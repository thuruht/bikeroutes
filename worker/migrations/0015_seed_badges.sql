-- 0015_seed_badges.sql
-- MM-012: Seed all 11 badge definitions
-- Sources: JKCBIKEMAP/migrations/0006_gamification.sql (5 badges),
--          0007_checkpoints_discretion.sql (4 badges),
--          0012_creator_recognition.sql (1 badge),
--          0017_noob_badge.sql (1 badge)
-- DR-003: user_badge awards tied to admin emails NOT ported (no plaintext emails in bikeroutes).
--         Admin accounts must be elevated and awarded badges manually after fresh login.

INSERT OR IGNORE INTO badges (id, name, description) VALUES
  -- From 0006_gamification.sql
  ('bridge-hunter', 'Bridge Hunter', 'Contributed data on a pedestrian bridge.'),
  ('mud-finder', 'Mud Finder', 'Submitted a field report about trail conditions.'),
  ('trail-pioneer', 'Trail Pioneer', 'Mapped a new primary trail spine.'),
  ('night-rider', 'Night Rider', 'Contributed knowledge from a night-time perspective.'),
  ('local-legend', 'Local Legend', 'Reached Level 10 through consistent high-quality knowledge.'),
  -- From 0007_checkpoints_discretion.sql
  ('river-crosser', 'River Crosser', 'Verified passage across a major walking bridge.'),
  ('trail-veteran', 'Trail Veteran', 'Logged 10+ checkpoints on primary trail spines.'),
  ('intel-validator', 'Knowledge Validator', 'Verified the accuracy of an informal connector.'),
  ('media-node', 'Media Node', 'Attached high-fidelity media to a feature.'),
  -- From 0012_creator_recognition.sql
  ('site-creator', 'Site Creator', 'The original architect and primary visionary of JOJO''s KC Bike Map.'),
  -- From 0017_noob_badge.sql
  ('noob', 'n00b', 'Welcome to the map! You''ve made your first contribution.');
