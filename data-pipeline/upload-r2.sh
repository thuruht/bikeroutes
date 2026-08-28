#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_cmd npx

cd "$PROJECT_ROOT/worker"

log "Uploading PMTiles + raw PBF to R2"

npx wrangler r2 object put "bikeroutes-tiles/${R2_TILES_PREFIX}/osm-${REGION}-bike.pmtiles" \
  --file="$TILES_PMTILES" \
  --content-type="application/vnd.pmtiles" \
  --remote

npx wrangler r2 object put "bikeroutes-tiles/${R2_RAW_PREFIX}/${REGION}-latest.osm.pbf" \
  --file="$INPUT_PBF" \
  --content-type="application/octet-stream" \
  --remote

log "R2 upload complete"
