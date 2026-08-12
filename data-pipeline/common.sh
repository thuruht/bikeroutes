#!/usr/bin/env bash
# data-pipeline/common.sh — shared config and helpers
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${PROJECT_ROOT}/data-pipeline/.build"
CACHE_DIR="${PROJECT_ROOT}/data-pipeline/.cache"
R2_TILES_PREFIX="tiles"
R2_RAW_PREFIX="raw/osm"

REGION="${REGION:-midwest}"

# Geofabrik download URLs
declare -A GEOFABRIK_URLS=(
  [midwest]="https://download.geofabrik.de/north-america/us-midwest-latest.osm.pbf"
  [northeast]="https://download.geofabrik.de/north-america/us-northeast-latest.osm.pbf"
  [south]="https://download.geofabrik.de/north-america/us-south-latest.osm.pbf"
  [west]="https://download.geofabrik.de/north-america/us-west-latest.osm.pbf"
  [pacific]="https://download.geofabrik.de/north-america/us-pacific-latest.osm.pbf"
)

export DOWNLOAD_URL="${GEOFABRIK_URLS[$REGION]:-}"
export INPUT_PBF="${CACHE_DIR}/${REGION}-latest.osm.pbf"
export BIKE_PBF="${DATA_DIR}/${REGION}-bike.osm.pbf"
export TILES_PMTILES="${DATA_DIR}/osm-${REGION}-bike.pmtiles"
export VALHALLA_DIR="${DATA_DIR}/valhalla-${REGION}"
export VALHALLA_TAR="${DATA_DIR}/valhalla-${REGION}-tiles.tar"
export NAMED_GEOJSON="${DATA_DIR}/named-${REGION}.geojson"

mkdir -p "$DATA_DIR" "$CACHE_DIR"

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"
}

die() {
  log "ERROR: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is required but not installed"
}
