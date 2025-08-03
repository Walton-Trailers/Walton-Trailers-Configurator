#!/bin/bash
# Simple deployment script for Walton Trailers

echo "=== Walton Trailers Simple Deployment ==="

# Build frontend
echo "Building frontend..."
npx vite build

# Build server
echo "Building server..."
npx esbuild server/main.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/server.js

# Verify build
if [ ! -f "dist/server.js" ]; then
    echo "ERROR: Server build failed!"
    exit 1
fi

if [ ! -d "dist/public" ]; then
    echo "ERROR: Frontend build failed!"
    exit 1
fi

echo "✓ Build complete"
echo ""
echo "To start in production: NODE_ENV=production node dist/server.js"