-- 0028_expand_trails_and_imports.sql
-- Scale-out data model for regional OSM + USGS + state sources,
-- import job tracking, and per-trail source citation.

-- Add regional / attribution / display columns to trails
ALTER TABLE trails ADD COLUMN region TEXT;
ALTER TABLE trails ADD COLUMN network TEXT;                 -- ncn, rcn, lcn, usbr, usfs
ALTER TABLE trails ADD COLUMN operator TEXT;
ALTER TABLE trails ADD COLUMN route_ref TEXT;               -- USBR 76, LCN 5
ALTER TABLE trails ADD COLUMN facility_type TEXT;           -- bike_lane, separated_lane, shared_use_path, protected_bikelane, ...
ALTER TABLE trails ADD COLUMN access_tags TEXT;             -- JSON array of relevant access tags
ALTER TABLE trails ADD COLUMN one_way INTEGER;
ALTER TABLE trails ADD COLUMN seasonal INTEGER;
ALTER TABLE trails ADD COLUMN surfaced INTEGER;              -- derived: 1 if paved/asphalt/concrete/etc
ALTER TABLE trails ADD COLUMN source_confidence TEXT;        -- high | medium | low
ALTER TABLE trails ADD COLUMN source_url TEXT;
ALTER TABLE trails ADD COLUMN source_date TEXT;
ALTER TABLE trails ADD COLUMN imported_at TEXT;
ALTER TABLE trails ADD COLUMN is_searchable INTEGER DEFAULT 0;
ALTER TABLE trails ADD COLUMN tile_layer TEXT;              -- e.g. osm-midwest-bike
ALTER TABLE trails ADD COLUMN min_zoom INTEGER;
ALTER TABLE trails ADD COLUMN max_zoom INTEGER;

CREATE INDEX IF NOT EXISTS idx_trails_region ON trails(region);
CREATE INDEX IF NOT EXISTS idx_trails_network ON trails(network);
CREATE INDEX IF NOT EXISTS idx_trails_facility ON trails(facility_type);
CREATE INDEX IF NOT EXISTS idx_trails_searchable ON trails(is_searchable);
CREATE INDEX IF NOT EXISTS idx_trails_region_searchable ON trails(region, is_searchable);
CREATE INDEX IF NOT EXISTS idx_trails_source_date ON trails(source_date);

-- Track every bulk import / tile build / D1 load
CREATE TABLE IF NOT EXISTS import_jobs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    source TEXT NOT NULL,
    region TEXT,
    job_type TEXT,               -- tiles | d1 | vectorize | valhalla
    started_at TEXT,
    finished_at TEXT,
    features_found INTEGER,
    features_inserted INTEGER,
    vectors_inserted INTEGER,
    status TEXT DEFAULT 'running',
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_source ON import_jobs(source, region);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);

-- Per-trail source citation / lineage
CREATE TABLE IF NOT EXISTS trail_sources (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    trail_id TEXT NOT NULL,
    source_name TEXT,
    source_url TEXT,
    source_id TEXT,
    confidence TEXT,
    imported_at TEXT,
    FOREIGN KEY(trail_id) REFERENCES trails(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trail_sources_trail_id ON trail_sources(trail_id);
CREATE INDEX IF NOT EXISTS idx_trail_sources_source ON trail_sources(source_name, source_id);
