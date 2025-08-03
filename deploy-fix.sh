#!/bin/bash

# Deployment fix script for production
echo "Running deployment fixes..."

# Ensure dist directory exists
mkdir -p dist

# Build the frontend
echo "Building frontend..."
npm run vite build

# Build the backend with correct paths
echo "Building backend..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js

# Create a symlink for static files if needed
if [ -d "dist/public" ] && [ ! -d "server/public" ]; then
  echo "Creating symlink for static files..."
  mkdir -p server
  ln -sf ../dist/public server/public
fi

echo "Build complete. To start the server, run: npm start"