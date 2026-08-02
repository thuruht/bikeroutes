-- 0014_seed_jkcbikemap_curated_features.sql
-- MM-011: Import all 62 JKCBIKEMAP curated features into bikeroutes
-- Sources (all corrections applied inline):
--   JKCBIKEMAP/migrations/0002_seed_data.sql       (base 52 curated features)
--   JKCBIKEMAP/migrations/0007_checkpoints_discretion.sql (category rename)
--   JKCBIKEMAP/migrations/0013_usgs_data_accuracy.sql (Brush Creek fix + 10 USGS parks)
--   JKCBIKEMAP/migrations/0014_expand_boundaries.sql (boundary expansion + seed_040 private)
--   JKCBIKEMAP/migrations/0015_fix_53rd_raytown_coords.sql (coord fix)
--   JKCBIKEMAP/migrations/0018_fix_leeds_dunbar_coords.sql (coord + description fixes)
-- DR-010: seed_040 visibility='private' applied
-- source_confidence='medium' for hand-curated; 'high' for USGS GNIS verified parks

-- ─── Points ───────────────────────────────────────────────────────────

INSERT OR IGNORE INTO curated_features
  (id, slug, name, feature_type, category, status, visibility, officiality, public_description, source_confidence)
VALUES
  ('seed_001', 'volker', 'Volker', 'point', 'Neighborhoods', 'open', 'public', 'official',
   'West anchor near Westport and the Plaza; strong handoff into Brush Creek.', 'medium'),
  ('seed_002', 'blue-hills', 'Blue Hills', 'point', 'Neighborhoods', 'open', 'public', 'official',
   'Mid-city ladder neighborhood between central KC and the east-side river world.', 'medium'),
  ('seed_003', 'vineyard', 'Vineyard', 'point', 'Neighborhoods', 'open', 'public', 'official',
   'Useful middle connector when stitching Brush Creek toward Blue River and Swope.', 'medium'),
  ('seed_004', 'east-blue-valley', 'East Blue Valley', 'point', 'Neighborhoods', 'open', 'public', 'official',
   'Industrial-river corridor zone south of Sheffield, providing access toward Leeds.', 'medium'),
  ('seed_005', 'eastwood-hills', 'Eastwood Hills', 'point', 'Neighborhoods', 'open', 'public', 'official',
   'Farther east, closer to Blue River valley and Leeds-side access.', 'medium'),
  ('seed_006', 'stayton-meadows', 'Stayton Meadows', 'point', 'Neighborhoods', 'open', 'public', 'official',
   'East anchor for dropping into the Blue River and Leeds corridor.', 'medium'),
  ('seed_007', 'south-indian-mound', 'South Indian Mound', 'point', 'Neighborhoods', 'open', 'public', 'official',
   'Northeast stepping stone for Cliff Drive and Kessler access.', 'medium'),
  ('seed_008', 'dunbar', 'Dunbar', 'point', 'Neighborhoods', 'open', 'public', 'official',
   'Historic Leeds-Dunbar community area; historic suburb near the Blue River corridor.', 'medium'),
  ('seed_009', '53rd-raytown-area', '53rd & Raytown area', 'point', 'Ride anchors', 'open', 'public', 'official',
   'Your home-zone anchor for heading south to Minor Park or north into the east-side grid.', 'medium'),
  ('seed_010', 'blue-banks-park', 'Blue Banks Park', 'point', 'Ride anchors', 'open', 'public', 'official',
   'Brush Creek meets Blue River here; a key handoff between east-west and north-south trail logic.', 'medium'),
  ('seed_011', 'farewell-leeds-access', 'Leeds / Farewell / Howdy area', 'point', 'Ride anchors', 'open', 'public', 'official',
   'Key industrial-river corridor access near Leeds Rd and Stadium Dr; includes Farewell and Howdy areas.', 'medium'),
  ('seed_012', 'minor-park-tennis-courts', 'Minor Park tennis courts', 'point', 'Ride anchors', 'open', 'public', 'official',
   'South anchor for the paved Blue River Greenway and one of your cleanest trail access points.', 'medium'),
  ('seed_013', 'cliff-drive-kessler', 'Cliff Drive / Kessler', 'point', 'Ride anchors', 'open', 'public', 'official',
   'Classic northeast low-car corridor and a major loop ingredient.', 'medium'),
  ('seed_014', 'rock-island-stadiums', 'Rock Island / Stadiums', 'point', 'Ride anchors', 'open', 'public', 'official',
   'North terminus of the Rock Island Trail at the Truman Sports Complex (Lot L).', 'medium'),
  ('seed_015', 'longview-trailhead-north-shelter-14', 'Longview Trailhead North (Shelter 14)', 'point', 'Ride anchors', 'open', 'public', 'official',
   'Primary Longview Lake paved trail access at Shelter 14 on Longview Road.', 'medium'),
  ('seed_016', 'longview-trailhead-south-odonnell-park-shelter-9', 'Longview Trailhead South (O''Donnell Park / Shelter 9)', 'point', 'Ride anchors', 'open', 'public', 'official',
   'South end of the Longview Trail where it connects toward Grandview''s trail system.', 'medium'),
  ('seed_017', 'exploration-off-road-note', 'Exploration / off-road note', 'point', 'Ride anchors', 'open', 'public', 'official',
   'Mental reminder: levee, gravel, fence-gap, horse-trail, and rail-side cuts may be good when dry and terrible after weather.', 'medium'),
  ('seed_018', 'gladstone-boundary', 'Gladstone boundary', 'point', 'Boundary anchors', 'open', 'public', 'official',
   'North boundary anchor for your metro diamond.', 'medium'),
  ('seed_019', 'blue-springs-boundary', 'Blue Springs boundary', 'point', 'Boundary anchors', 'open', 'public', 'official',
   'East boundary anchor for your metro diamond.', 'medium'),
  ('seed_020', 'grandview-boundary', 'Grandview boundary', 'point', 'Boundary anchors', 'open', 'public', 'official',
   'South boundary anchor for your metro diamond.', 'medium'),
  ('seed_021', 'overland-park-boundary', 'Overland Park boundary', 'point', 'Boundary anchors', 'open', 'public', 'official',
   'West-southwest boundary anchor for your metro diamond.', 'medium'),
  ('seed_022', 'fleming-park', 'Fleming Park', 'point', 'Key parks', 'open', 'public', 'official',
   'Huge Jackson County park around Lake Jacomo and Blue Springs Lake with multiple trail systems.', 'medium'),
  ('seed_023', 'longview-lake-park', 'Longview Lake Park', 'point', 'Key parks', 'open', 'public', 'official',
   'Major south-metro park with the Longview Trail and connections toward Grandview.', 'medium'),
  ('seed_024', 'minor-park', 'Minor Park', 'point', 'Key parks', 'open', 'public', 'official',
   'South KC anchor where the Blue River Greenway becomes one of the cleanest paved trail options.', 'medium'),
  ('seed_025', 'kessler-park', 'Kessler Park', 'point', 'Key parks', 'open', 'public', 'official',
   'Major northeast bluff park tied to Cliff Drive and trail access above downtown.', 'medium'),
  ('seed_026', 'sheffield-park', 'Sheffield Park', 'point', 'Key parks', 'open', 'public', 'official',
   'Northeast industrial zone park near Independence Ave and the Blue River.', 'medium'),
  ('seed_028', 'grand-blvd-bike-ped-bridge', 'Grand Blvd Bike & Ped Bridge', 'point', 'Pedestrian or walking bridges', 'open', 'public', 'official',
   'New bike-and-ped bridge opened in May 2026 linking the River Market toward the riverfront.', 'medium'),
  ('seed_029', 'oakley-ave-ped-bridge-replacement', 'Oakley Ave Walking Bridge Replacement', 'point', 'Planned / in progress', 'planned', 'public', 'planned',
   'Pedestrian bridge over I-70 closed for replacement into 2026; worth watching in the field.', 'medium'),
  ('seed_030', 'grand-lydia-riverfront-flyover-concept', 'Grand / Lydia riverfront flyover concept', 'point', 'Planned / in progress', 'planned', 'public', 'planned',
   'Future connection concept linking surrounding neighborhoods toward the riverfront.', 'medium'),
  ('seed_031', 'gillham-trolley-brush-creek-connector', 'Gillham-Trolley-Brush Creek connector', 'point', 'Planned / in progress', 'planned', 'public', 'planned',
   'Protected connector work linking Gillham, Trolley Track, and Brush Creek corridors.', 'medium'),
  ('seed_032', 'greenline-kc-segments', 'Greenline KC segments', 'point', 'Planned / in progress', 'planned', 'public', 'planned',
   'Downtown Greenline loop sections projected to open in phases.', 'medium'),
  ('seed_033', 'riverfront-streetcar-extension-corridor', 'Riverfront Streetcar Extension corridor', 'point', 'Planned / in progress', 'planned', 'public', 'planned',
   'Mapped corridor from 3rd & Grand across the viaduct toward Berkley Riverfront.', 'medium'),
  ('seed_034', 'blue-river-trails-project', 'Blue River Trails Project', 'point', 'Planned / in progress', 'planned', 'public', 'planned',
   'KC Parks Blue River trail improvement process; a good corridor to watch.', 'medium');

-- ─── Lines ────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO curated_features
  (id, slug, name, feature_type, category, status, visibility, officiality, public_description, surface_note, source_confidence)
VALUES
  ('seed_035', 'brush-creek-greenway', 'Brush Creek Greenway', 'line', 'Trail spines', 'open', 'public', 'official',
   '', 'Paved: reliable most of the time.', 'medium'),
  ('seed_036', 'blue-river-north-segment', 'Blue River north segment', 'line', 'Trail spines', 'open', 'public', 'official',
   '', 'Mixed corridor: paved logic with floodplain caution nearby.', 'medium'),
  ('seed_037', 'blue-river-south-segment', 'Blue River south segment', 'line', 'Trail spines', 'open', 'public', 'official',
   '', 'Paved core near Minor Park, but nearby dirt and bottoms can change fast after rain.', 'medium'),
  ('seed_038', 'cliff-drive', 'Cliff Drive', 'line', 'Trail spines', 'open', 'public', 'official',
   '', 'Paved scenic byway, permanently car-free and open for recreation.', 'medium'),
  ('seed_039', 'rock-island-trail', 'Rock Island Trail', 'line', 'Trail spines', 'open', 'public', 'official',
   '', '13.5-mile paved rail-to-trail corridor from the stadiums to Lee''s Summit.', 'medium'),
  -- DR-010: seed_040 visibility='private' (applied per migration 0014)
  ('seed_040', 'metro-boundary-diamond', 'Metro boundary diamond', 'line', 'Boundary anchors', 'open', 'private', 'official',
   '', 'Concept frame only.', 'medium'),
  ('seed_041', 'neighborhood-ladder', 'Neighborhood ladder', 'line', 'Surface / connector notes', 'open', 'public', 'official',
   '', 'Street-stitch connector: condition depends on your chosen cuts.', 'medium'),
  ('seed_042', '53rd-to-minor-park-idea', '53rd to Minor Park idea', 'line', 'Surface / connector notes', 'open', 'public', 'official',
   '', 'Street and corridor stitch; watch drainage and low spots.', 'medium'),
  ('seed_043', 'longview-paved-trail', 'Longview paved trail', 'line', 'Trail spines', 'open', 'public', 'official',
   '', 'Paved: reliable most of the time.', 'medium'),
  ('seed_044', 'longview-to-grandview-connector', 'Longview to Grandview connector', 'line', 'Trail spines', 'open', 'public', 'official',
   '', 'May vary by connector choice and weather.', 'medium'),
  ('seed_045', 'fleming-blue-springs-lake-trail-zone', 'Fleming / Blue Springs Lake trail zone', 'line', 'Trail spines', 'open', 'public', 'official',
   '', 'Mixed park trail zone; some segments are trail-surface dependent.', 'medium'),
  ('seed_046', '25th-street-pedestrian-bridge', '25th Street Pedestrian Bridge', 'line', 'Pedestrian or walking bridges', 'open', 'public', 'official',
   'New pedestrian bridge over I-70 opened in January 2026 as part of Improve I-70 KC.',
   'Bridge / sidewalk-style connector over a hard barrier.', 'medium'),
  ('seed_047', 'river-market-bridge-link', 'River Market bridge link', 'line', 'Pedestrian or walking bridges', 'open', 'public', 'official',
   '', 'Bridge / sidewalk-style connector over a barrier or edge condition.', 'medium'),
  ('seed_048', 'oakley-replacement-zone', 'Oakley replacement zone', 'line', 'Planned / in progress', 'planned', 'public', 'planned',
   '', 'Planned / in progress barrier crossing; watch real-world construction status.', 'medium'),
  ('seed_049', 'lydia-flyover-concept', 'Lydia flyover concept', 'line', 'Planned / in progress', 'planned', 'public', 'planned',
   '', 'Planned riverfront connector; not yet a dependable route.', 'medium'),
  ('seed_050', 'gillham-trolley-brush-connector', 'Gillham-Trolley-Brush connector', 'line', 'Planned / in progress', 'planned', 'public', 'planned',
   '', 'Planned protected connector closing an important midtown gap.', 'medium'),
  ('seed_051', 'greenline-kc-concept', 'Greenline KC concept', 'line', 'Planned / in progress', 'planned', 'public', 'planned',
   '', 'Planned downtown loop segments that may open in phases.', 'medium'),
  ('seed_052', 'riverfront-streetcar-bridge-corridor', 'Riverfront streetcar / bridge corridor', 'line', 'Planned / in progress', 'planned', 'public', 'planned',
   '', 'Planned / mapped corridor with published alignment information.', 'medium'),
  ('seed_053', 'blue-river-trails-watch-corridor', 'Blue River Trails watch corridor', 'line', 'Planned / in progress', 'planned', 'public', 'planned',
   '', 'Blue River project corridor to watch for segment build-out and connector opportunities.', 'medium');

-- ─── USGS GNIS Park Points (from 0013_usgs_data_accuracy.sql) ────────

INSERT OR IGNORE INTO curated_features
  (id, slug, name, feature_type, category, status, visibility, officiality, public_description, source_confidence)
VALUES
  ('usgs-holmes-park', 'holmes-park', 'Holmes Park', 'point', 'Key parks', 'open', 'public', 'official',
   'USGS GNIS verified location.', 'high'),
  ('usgs-oakwood-park', 'oakwood-park', 'Oakwood Park', 'point', 'Key parks', 'open', 'public', 'official',
   'USGS GNIS verified location.', 'high'),
  ('usgs-parkville', 'parkville-nature', 'Parkville Nature Sanctuary Area', 'point', 'Key parks', 'open', 'public', 'official',
   'USGS GNIS verified location.', 'high'),
  ('usgs-roeland-park', 'roeland-park', 'Roeland Park', 'point', 'Key parks', 'open', 'public', 'official',
   'USGS GNIS verified location.', 'high'),
  ('usgs-overland-park', 'overland-park-central', 'Overland Park Central', 'point', 'Key parks', 'open', 'public', 'official',
   'USGS GNIS verified location.', 'high'),
  ('usgs-tomahawk-parkway', 'tomahawk-parkway', 'Tomahawk Parkway', 'point', 'Trail spines', 'open', 'public', 'official',
   'USGS GNIS verified location.', 'high'),
  ('usgs-blackbob-park', 'blackbob-park', 'Blackbob Park', 'point', 'Key parks', 'open', 'public', 'official',
   'USGS GNIS verified location.', 'high'),
  ('usgs-kill-creek-park', 'kill-creek-park', 'Kill Creek Park', 'point', 'Key parks', 'open', 'public', 'official',
   'USGS GNIS verified location.', 'high'),
  ('usgs-shawnee-mission-park', 'shawnee-mission-park', 'Shawnee Mission Park', 'point', 'Key parks', 'open', 'public', 'official',
   'USGS GNIS verified location.', 'high'),
  ('usgs-stoll-park', 'stoll-park', 'Stoll Park', 'point', 'Key parks', 'open', 'public', 'official',
   'USGS GNIS verified location.', 'high');

-- ─── Geometries ───────────────────────────────────────────────────────
-- All corrections from 0013, 0014, 0015, 0018 applied at this layer directly.
-- Base coordinates from 0002; corrected coordinates used where applicable.

INSERT OR IGNORE INTO curated_feature_geometries (feature_id, public_geometry) VALUES
  ('seed_001', '{"type":"Point","coordinates":[-94.603,39.049]}'),
  ('seed_002', '{"type":"Point","coordinates":[-94.554,39.028]}'),
  ('seed_003', '{"type":"Point","coordinates":[-94.532,39.048]}'),
  -- 0018: East Blue Valley corrected from [-94.523,39.090] → [-94.515,39.075]
  ('seed_004', '{"type":"Point","coordinates":[-94.515,39.075]}'),
  ('seed_005', '{"type":"Point","coordinates":[-94.500,39.071]}'),
  ('seed_006', '{"type":"Point","coordinates":[-94.486,39.060]}'),
  ('seed_007', '{"type":"Point","coordinates":[-94.555,39.110]}'),
  -- 0018: Dunbar corrected from [-94.538,39.104] → [-94.502,39.059]
  ('seed_008', '{"type":"Point","coordinates":[-94.502,39.059]}'),
  -- 0015: 53rd & Raytown corrected from [-94.504,39.030] → [-94.4715,39.0278]
  ('seed_009', '{"type":"Point","coordinates":[-94.4715,39.0278]}'),
  -- DR-009: Blue Banks Park coordinate noted as approximate; flagged for field verification
  ('seed_010', '{"type":"Point","coordinates":[-94.5184,39.0391]}'),
  -- 0018: Leeds/Farewell corrected from [-94.511,39.091] → [-94.505,39.055]
  ('seed_011', '{"type":"Point","coordinates":[-94.505,39.055]}'),
  ('seed_012', '{"type":"Point","coordinates":[-94.527,38.924]}'),
  ('seed_013', '{"type":"Point","coordinates":[-94.549,39.120]}'),
  ('seed_014', '{"type":"Point","coordinates":[-94.4841,39.0512]}'),
  ('seed_015', '{"type":"Point","coordinates":[-94.479,38.904]}'),
  ('seed_016', '{"type":"Point","coordinates":[-94.488,38.869]}'),
  ('seed_017', '{"type":"Point","coordinates":[-94.515,39.070]}'),
  -- 0014: Gladstone boundary expanded from [-94.554,39.203] → [-94.554,39.300]
  ('seed_018', '{"type":"Point","coordinates":[-94.554,39.300]}'),
  -- 0014: Blue Springs boundary expanded from [-94.281,39.017] → [-94.100,39.017]
  ('seed_019', '{"type":"Point","coordinates":[-94.100,39.017]}'),
  -- 0014: Grandview boundary expanded from [-94.533,38.886] → [-94.533,38.750]
  ('seed_020', '{"type":"Point","coordinates":[-94.533,38.750]}'),
  -- 0014: Overland Park boundary expanded; stays [-94.850,38.982] (already set in 0014)
  ('seed_021', '{"type":"Point","coordinates":[-94.850,38.982]}'),
  ('seed_022', '{"type":"Point","coordinates":[-94.336,39.034]}'),
  ('seed_023', '{"type":"Point","coordinates":[-94.476,38.886]}'),
  ('seed_024', '{"type":"Point","coordinates":[-94.527,38.924]}'),
  ('seed_025', '{"type":"Point","coordinates":[-94.548,39.121]}'),
  ('seed_026', '{"type":"Point","coordinates":[-94.489,39.097]}'),
  ('seed_028', '{"type":"Point","coordinates":[-94.577,39.116]}'),
  ('seed_029', '{"type":"Point","coordinates":[-94.505,39.070]}'),
  ('seed_030', '{"type":"Point","coordinates":[-94.565,39.121]}'),
  ('seed_031', '{"type":"Point","coordinates":[-94.576,39.042]}'),
  ('seed_032', '{"type":"Point","coordinates":[-94.588,39.103]}'),
  ('seed_033', '{"type":"Point","coordinates":[-94.576,39.111]}'),
  ('seed_034', '{"type":"Point","coordinates":[-94.525,39.000]}'),
  -- 0013: Brush Creek geometry corrected
  ('seed_035', '{"type":"LineString","coordinates":[[-94.607,39.038],[-94.594,39.040],[-94.580,39.044],[-94.565,39.051],[-94.550,39.060],[-94.537,39.055],[-94.520,39.039]]}'),
  ('seed_036', '{"type":"LineString","coordinates":[[-94.525,39.082],[-94.523,39.073],[-94.523,39.064],[-94.523,39.055],[-94.523,39.045],[-94.524,39.036],[-94.526,39.028]]}'),
  ('seed_037', '{"type":"LineString","coordinates":[[-94.526,39.028],[-94.526,39.010],[-94.527,38.990],[-94.528,38.970],[-94.528,38.950],[-94.527,38.936],[-94.527,38.924]]}'),
  ('seed_038', '{"type":"LineString","coordinates":[[-94.5635,39.1085],[-94.5565,39.1135],[-94.5410,39.1140],[-94.5125,39.1165]]}'),
  ('seed_039', '{"type":"LineString","coordinates":[[-94.4841,39.0512],[-94.4642,39.0081],[-94.4682,39.0011],[-94.4381,38.9482],[-94.4140,38.9079],[-94.3942,38.8881]]}'),
  -- DR-010: seed_040 private — geometry stored but visibility='private' prevents public API exposure
  ('seed_040', '{"type":"LineString","coordinates":[[-94.554,39.300],[-94.100,39.017],[-94.533,38.750],[-94.850,38.982],[-94.554,39.300]]}'),
  ('seed_041', '{"type":"LineString","coordinates":[[-94.555,39.110],[-94.538,39.104],[-94.511,39.091],[-94.525,39.082],[-94.500,39.071],[-94.486,39.060],[-94.532,39.048],[-94.554,39.028],[-94.603,39.049]]}'),
  ('seed_042', '{"type":"LineString","coordinates":[[-94.4715,39.0278],[-94.511,39.020],[-94.520,39.010],[-94.526,38.990],[-94.527,38.960],[-94.527,38.924]]}'),
  ('seed_043', '{"type":"LineString","coordinates":[[-94.479,38.904],[-94.482,38.898],[-94.486,38.892],[-94.490,38.886],[-94.490,38.878],[-94.488,38.869]]}'),
  ('seed_044', '{"type":"LineString","coordinates":[[-94.488,38.869],[-94.500,38.875],[-94.515,38.880],[-94.533,38.886]]}'),
  ('seed_045', '{"type":"LineString","coordinates":[[-94.336,39.034],[-94.322,39.025],[-94.308,39.017]]}'),
  ('seed_046', '{"type":"LineString","coordinates":[[-94.5483,39.0812],[-94.5455,39.0818],[-94.5432,39.0826]]}'),
  ('seed_047', '{"type":"LineString","coordinates":[[-94.579,39.112],[-94.577,39.116],[-94.575,39.121]]}'),
  ('seed_048', '{"type":"LineString","coordinates":[[-94.510,39.064],[-94.505,39.070],[-94.500,39.076]]}'),
  ('seed_049', '{"type":"LineString","coordinates":[[-94.570,39.118],[-94.565,39.121],[-94.560,39.126]]}'),
  ('seed_050', '{"type":"LineString","coordinates":[[-94.579,39.037],[-94.576,39.042],[-94.573,39.048]]}'),
  ('seed_051', '{"type":"LineString","coordinates":[[-94.600,39.094],[-94.588,39.103],[-94.575,39.112],[-94.560,39.118]]}'),
  ('seed_052', '{"type":"LineString","coordinates":[[-94.579,39.112],[-94.576,39.111],[-94.571,39.112],[-94.564,39.114],[-94.556,39.116],[-94.548,39.118]]}'),
  ('seed_053', '{"type":"LineString","coordinates":[[-94.523,39.070],[-94.525,39.040],[-94.525,39.000],[-94.527,38.965],[-94.527,38.930]]}');

-- USGS park geometries (0013, source_confidence='high')
INSERT OR IGNORE INTO curated_feature_geometries (feature_id, public_geometry) VALUES
  ('usgs-holmes-park',        '{"type":"Point","coordinates":[-94.5357,38.9525]}'),
  ('usgs-oakwood-park',       '{"type":"Point","coordinates":[-94.5738,39.2033]}'),
  ('usgs-parkville',          '{"type":"Point","coordinates":[-94.6821,39.1950]}'),
  ('usgs-roeland-park',       '{"type":"Point","coordinates":[-94.6321,39.0375]}'),
  ('usgs-overland-park',      '{"type":"Point","coordinates":[-94.6707,38.9822]}'),
  ('usgs-tomahawk-parkway',   '{"type":"Point","coordinates":[-94.6268,38.9198]}'),
  ('usgs-blackbob-park',      '{"type":"Point","coordinates":[-94.7522,38.8556]}'),
  ('usgs-kill-creek-park',    '{"type":"Point","coordinates":[-94.9745,38.9126]}'),
  ('usgs-shawnee-mission-park','{"type":"Point","coordinates":[-94.7891,38.9957]}'),
  ('usgs-stoll-park',         '{"type":"Point","coordinates":[-94.7290,38.9169]}');
