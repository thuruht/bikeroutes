#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"

log "Preparing Valhalla container build context for $REGION"

CONTEXT_DIR="${PROJECT_ROOT}/worker/valhalla"
mkdir -p "$CONTEXT_DIR"

cp "${VALHALLA_DIR}/valhalla.json" "${CONTEXT_DIR}/valhalla.json"
cp "${VALHALLA_DIR}/tiles.tar" "${CONTEXT_DIR}/tiles.tar"

log "Container context ready: $(du -h ${CONTEXT_DIR}/tiles.tar | cut -f1)"
log "The worker/wrangler.jsonc container image will pick up worker/valhalla/Dockerfile.valhalla on next wrangler deploy."
