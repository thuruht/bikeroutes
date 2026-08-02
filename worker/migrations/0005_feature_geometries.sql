-- 0005_curated_feature_geometries.sql
-- MM-002: Add curated_feature_geometries table (dual public/admin geometry)
-- Source: JKCBIKEMAP/migrations/0001_initial.sql
-- Sensitivity model: public_geometry rendered for all; admin_geometry only for admin/moderator roles

CREATE TABLE IF NOT EXISTS curated_feature_geometries (
    feature_id TEXT NOT NULL,
    public_geometry TEXT,   -- GeoJSON string, WGS84 [lon, lat]; coarsened or generalized for sensitive curated_features
    admin_geometry TEXT,    -- GeoJSON string, WGS84 [lon, lat]; precise location, admin-only
    PRIMARY KEY (feature_id),
    FOREIGN KEY (feature_id) REFERENCES curated_features(id) ON DELETE CASCADE
);
