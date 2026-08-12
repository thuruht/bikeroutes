#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_cmd curl

log "Starting OSM download for region: $REGION"

if [ -z "$DOWNLOAD_URL" ]; then
  die "Unknown region: $REGION"
fi

log "Downloading $DOWNLOAD_URL -> $INPUT_PBF"

curl -fsSL --max-time 3600 -o "$INPUT_PBF" "$DOWNLOAD_URL"

log "Download complete: $(du -h "$INPUT_PBF" | cut -f1)"
