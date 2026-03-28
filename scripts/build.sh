#!/bin/bash
set -e

echo "🔨 Building pixxl single binary..."

# Build frontend first
echo "   Building frontend..."
cd apps/frontend && bun run build
cd ../..

# Ensure bin directory exists
mkdir -p bin

# Compile with asset-naming to preserve original names
# This prevents Bun from trying to resolve hashed CSS URLs
echo "   Compiling binary..."
bun build \
  --compile \
  --minify \
  --sourcemap \
  --asset-naming="[name].[ext]" \
  --outfile bin/pixxl \
  apps/backend/src/main.ts

chmod +x bin/pixxl

SIZE=$(du -h bin/pixxl | cut -f1)
echo ""
echo "✅ Binary built: bin/pixxl ($SIZE)"
echo "   Run with: ./bin/pixxl"
