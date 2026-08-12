#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_cmd docker

log "Building Valhalla tiles for $REGION from $INPUT_PBF"
mkdir -p "$VALHALLA_DIR"

# Use absolute paths for Docker volume mounts
ABS_INPUT="$(cd "$(dirname "$INPUT_PBF")" && pwd)/$(basename "$INPUT_PBF")"
ABS_VALHALLA_DIR="$(cd "$VALHALLA_DIR" && pwd)"

docker run --rm \
  -v "$ABS_VALHALLA_DIR":/data \
  -v "$ABS_INPUT":/data/region.osm.pbf:ro \
  --memory="12g" \
  ghcr.io/valhalla/valhalla:latest bash -c "
    set -euo pipefail
    cd /data
    echo 'Building Valhalla config...'
    valhalla_build_config --mjolnir-tile-dir /data/tiles --mjolnir-tile-extract /data/tiles.tar > /data/valhalla.json
    echo 'Building tiles...'
    valhalla_build_tiles -c /data/valhalla.json /data/region.osm.pbf
    echo 'Building tile extract...'
    valhalla_build_extract -c /data/valhalla.json
    echo 'Done.'
  "

log "Valhalla tile extract: $(du -h "$VALHALLA_DIR/tiles.tar" 2>/dev/null | cut -f1)"
