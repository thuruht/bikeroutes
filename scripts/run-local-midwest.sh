#!/usr/bin/env bash
# scripts/run-local-midwest.sh
# Full Midwest data pipeline + Valhalla deploy, run entirely on your local machine.
# Avoids GitHub Actions / Microsoft entirely except for git.
#
# Requirements:
#   - osmium-tool, tippecanoe, gdal-bin, curl
#   - Docker daemon running and accessible (unless --no-valhalla)
#   - Node.js + npm (for wrangler)
#   - Already logged into wrangler: cd worker && npx wrangler login
#
# Optional env overrides:
#   API_BASE=https://bikeroutes.org (default)
#
# Usage:
#   ./scripts/run-local-midwest.sh
#   API_BASE=http://localhost:8787 ./scripts/run-local-midwest.sh --no-valhalla

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
NC="\033[0m"

log() { echo -e "${GREEN}[local-pipeline]${NC} $*"; }
warn() { echo -e "${YELLOW}[local-pipeline]${NC} $*" >&2; }
die() { echo -e "${RED}[local-pipeline]${NC} ERROR: $*" >&2; exit 1; }

NO_VALHALLA=0
for arg in "$@"; do
	case "$arg" in
		--no-valhalla) NO_VALHALLA=1 ;;
		-h|--help)
			echo "Usage: $0 [--no-valhalla]"
			echo "  --no-valhalla  Skip Valhalla tile build + container deploy (useful for testing PMTiles/D1)."
			exit 0
			;;
		*) die "Unknown argument: $arg" ;;
	esac
done

# Load ADMIN_SECRET from local Worker dev file if it exists; otherwise prompt.
if [ -f "$ROOT_DIR/worker/.dev.vars" ]; then
	set -a
	source "$ROOT_DIR/worker/.dev.vars"
	set +a
fi

if [ -z "${ADMIN_SECRET:-}" ]; then
	warn "ADMIN_SECRET not found in worker/.dev.vars"
	read -rsp "Enter ADMIN_SECRET (used only for the current run): " ADMIN_SECRET
	echo
	if [ -z "$ADMIN_SECRET" ]; then
		die "ADMIN_SECRET is required to import named features into D1"
	fi
fi

export REGION=midwest
export API_BASE="${API_BASE:-https://bikeroutes.org}"
export ADMIN_SECRET

log "Starting local Midwest pipeline"
log "API_BASE=$API_BASE"
log "Valhalla steps: $([ "$NO_VALHALLA" -eq 1 ] && echo SKIPPED || echo ENABLED)"

# Dependency checks
for cmd in osmium tippecanoe npx curl; do
	command -v "$cmd" >/dev/null 2>&1 || die "$cmd is not installed"
done

command -v docker >/dev/null 2>&1 || die "docker is not installed"

if [ "$NO_VALHALLA" -eq 0 ] && ! docker info >/dev/null 2>&1; then
	warn "Docker daemon is not reachable."
	warn "  - To run the full pipeline, start Docker."
	warn "  - To build only PMTiles + D1, run: $0 --no-valhalla"
	exit 1
fi

cd "$ROOT_DIR/worker"
if ! npx wrangler whoami >/dev/null 2>&1; then
	die "Not logged into wrangler. Run: cd worker && npx wrangler login"
fi
cd "$ROOT_DIR"

# Ensure output directories exist
mkdir -p data-pipeline/.build data-pipeline/.cache

log "Step 1/6: Download Midwest OSM extract"
./data-pipeline/fetch-osm.sh

log "Step 2/6: Filter bike-relevant OSM objects"
./data-pipeline/filter-bike-tags.sh

log "Step 3/6: Classify features and build PMTiles"
./data-pipeline/build-pmtiles.sh

if [ "$NO_VALHALLA" -eq 0 ]; then
	log "Step 4/6: Build Valhalla tiles (this takes a while)"
	./data-pipeline/build-valhalla-tiles.sh

	log "Step 5/6: Stage Valhalla container context"
	./data-pipeline/build-container.sh
else
	warn "Skipping Valhalla tile build and container prep"
fi

log "Step $([ "$NO_VALHALLA" -eq 0 ] && echo 6 || echo 4)/6: Upload PMTiles and raw PBF to R2"
./data-pipeline/upload-r2.sh

log "Step $([ "$NO_VALHALLA" -eq 0 ] && echo 7 || echo 5)/6: Import named features into D1 / Vectorize"
./data-pipeline/import-d1.sh

if [ "$NO_VALHALLA" -eq 0 ]; then
	log "Deploying worker with baked Valhalla container"
	cd "$ROOT_DIR/worker"
	npx wrangler deploy
	cd "$ROOT_DIR"
else
	warn "Skipping worker deploy because --no-valhalla was set"
fi

log "Done."
log "Quick checks:"
echo "  curl -I $API_BASE/api/tiles/vector/osm-midwest-bike/6/15/23.mvt"
echo "  curl -X POST $API_BASE/api/route -H 'Content-Type: application/json' -d '{\"locations\":[{\"lat\":39.1,\"lon\":-94.6},{\"lat\":39.0,\"lon\":-94.5}],\"costing\":\"bicycle\"}' -i"
