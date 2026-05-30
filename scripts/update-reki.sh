#!/usr/bin/env bash
# update-reki.sh - Propagates the root reki.png to all necessary directories

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REKI_SRC="$REPO_ROOT/reki.png"

if [ ! -f "$REKI_SRC" ]; then
    echo "❌ Error: Could not find reki.png in the root directory ($REKI_SRC)"
    exit 1
fi

echo "🦌 Propagating new Reki..."

# 1. Frontend public directory (for the web app)
cp "$REKI_SRC" "$REPO_ROOT/frontend/public/reki.png"
echo "  ✅ Copied to frontend/public/"

# 2. Docs assets directory (for documentation/markdown)
mkdir -p "$REPO_ROOT/docs/assets"
cp "$REKI_SRC" "$REPO_ROOT/docs/assets/reki.png"
echo "  ✅ Copied to docs/assets/"

echo "✨ Done! Reki has been updated everywhere."
echo "Don't forget to rebuild and deploy the frontend if you want it live!"
