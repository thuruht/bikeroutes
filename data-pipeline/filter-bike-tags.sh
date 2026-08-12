#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_cmd osmium

log "Filtering bike-relevant OSM tags for $REGION"

osmium tags-filter "$INPUT_PBF" \
  w/highway=cycleway \
  w/highway=path \
  w/highway=track \
  w/highway=footway \
  w/highway=bridleway \
  w/highway=construction \
  w/cycleway=lane \
  w/cycleway=track \
  w/cycleway=share_busway \
  w/cycleway=opposite \
  w/cycleway=opposite_lane \
  w/cycleway:left=lane \
  w/cycleway:right=lane \
  w/cycleway:left=track \
  w/cycleway:right=track \
  w/bicycle=designated \
  w/bicycle=use_sidepath \
  r/route=bicycle \
  r/route=mtb \
  w/railway=rail \
  w/railway=disused \
  w/railway=abandoned \
  w/railway=light_rail \
  w/railway=tram \
  n/railway=station \
  n/railway=halt \
  n/railway=junction \
  -o "$BIKE_PBF"

log "Filtered bike PBF: $(du -h "$BIKE_PBF" | cut -f1)"
