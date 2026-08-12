#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_cmd curl

: "${API_BASE:?API_BASE must be set, e.g. https://bikeroutes.org or http://localhost:8787}"
: "${ADMIN_SECRET:?ADMIN_SECRET must be set}"

log "Importing named $REGION features into D1 / Vectorize"

curl -fsSL -X POST \
  "${API_BASE}/api/admin/ingest?source=geojson&region=${REGION}" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: ${ADMIN_SECRET}" \
  --data-binary "@${NAMED_GEOJSON}"

log "D1 import request sent"
