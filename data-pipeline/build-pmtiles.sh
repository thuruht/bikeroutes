#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_cmd tippecanoe

BIKE_GEOJSON="${DATA_DIR}/${REGION}-bike.geojson"
CLASSIFIED_GEOJSON="${DATA_DIR}/${REGION}-bike-classified.geojson"

log "Exporting bike PBF -> GeoJSON"
osmium export "$BIKE_PBF" -o "$BIKE_GEOJSON"

log "Classifying features"
node "$(dirname "$0")/classify-features.mjs" \
  "$BIKE_GEOJSON" \
  "$CLASSIFIED_GEOJSON" \
  "$NAMED_GEOJSON"

log "Building PMTiles: $TILES_PMTILES"
tippecanoe -o "$TILES_PMTILES" \
  --layer=bikeinfra \
  --attribution="OpenStreetMap contributors" \
  --minimum-zoom=6 \
  --maximum-zoom=16 \
  --base-zoom=10 \
  --drop-densest-as-needed \
  --no-clipping \
  --coalesce-densest-as-needed \
  "$CLASSIFIED_GEOJSON"

log "PMTiles built: $(du -h "$TILES_PMTILES" | cut -f1)"
