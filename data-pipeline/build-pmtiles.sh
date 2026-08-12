#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_cmd tippecanoe

BIKE_GEOJSONSEQ="${DATA_DIR}/${REGION}-bike.geojsonseq"
CLASSIFIED_GEOJSONSEQ="${DATA_DIR}/${REGION}-bike-classified.geojsonseq"

log "Exporting bike PBF -> GeoJSONSeq"
osmium export "$BIKE_PBF" -o "$BIKE_GEOJSONSEQ" -f geojsonseq

log "Classifying features"
node "$(dirname "$0")/classify-features.mjs" \
  "$BIKE_GEOJSONSEQ" \
  "$CLASSIFIED_GEOJSONSEQ" \
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
  "$CLASSIFIED_GEOJSONSEQ"

log "PMTiles built: $(du -h "$TILES_PMTILES" | cut -f1)"
