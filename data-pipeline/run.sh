#!/usr/bin/env bash
# data-pipeline/run.sh — orchestrate a full regional import
set -euo pipefail
source "$(dirname "$0")/common.sh"

REGION="${1:-midwest}"
export REGION

log "=== Starting BikeRoutes data pipeline for region: $REGION ==="

"$(dirname "$0")/fetch-osm.sh"
"$(dirname "$0")/filter-bike-tags.sh"
"$(dirname "$0")/build-pmtiles.sh"
"$(dirname "$0")/build-valhalla-tiles.sh"
"$(dirname "$0")/build-container.sh"
"$(dirname "$0")/upload-r2.sh"
"$(dirname "$0")/import-d1.sh"

log "=== Pipeline complete for $REGION ==="
