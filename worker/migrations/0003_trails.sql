-- 0003_trails.sql
-- Unified features table for trail + rail linear geometries

CREATE TABLE IF NOT EXISTS trails (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,          -- osm, marc, waymarked, future…
    source_type TEXT DEFAULT '',   -- way, relation, node
    source_id TEXT DEFAULT '',     -- original ID from the source
    name TEXT DEFAULT '',
    category TEXT NOT NULL DEFAULT 'trail',  -- cycleway, route, railway, station, etc.
    geom TEXT,                     -- GeoJSON geometry (LineString, MultiLineString, Point)
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    surface TEXT DEFAULT '',
    length_m REAL,
    difficulty TEXT DEFAULT '',
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'approved',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trails_source ON trails(source);
CREATE INDEX IF NOT EXISTS idx_trails_category ON trails(category);
CREATE INDEX IF NOT EXISTS idx_trails_location ON trails(lat, lon);
