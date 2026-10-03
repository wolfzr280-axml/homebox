#!/usr/bin/env bash
# Builds a single Windows homebox.exe (frontend embedded) into dist/.
# Usage: ./build-windows.sh [version]   e.g. ./build-windows.sh 0.26.2+paste
set -euo pipefail
cd "$(dirname "$0")"
VERSION="${1:-$(git describe --tags --abbrev=0 | sed 's/^v//')+paste}"

(cd frontend && pnpm install --frozen-lockfile && pnpm build)

rm -rf backend/app/api/static/public
cp -r frontend/.output/public backend/app/api/static/public
touch backend/app/api/static/public/.gitkeep

(cd backend && CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build \
  -ldflags "-s -w -X main.commit=$(git rev-parse --short HEAD) -X main.buildTime=$(date -u +%Y-%m-%dT%H:%M:%SZ) -X main.version=$VERSION" \
  -o ../dist/homebox.exe ./app/api)

echo "Built dist/homebox.exe ($VERSION)"
