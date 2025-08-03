#!/usr/bin/env node
// Deployment wrapper to fix static file serving issues

import { spawn } from 'child_process';
import { existsSync, mkdirSync, symlinkSync, unlinkSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Fix static file paths before starting the server
function setupStaticPaths() {
  console.log('Setting up static file paths for deployment...');
  
  const distPublicPath = resolve(process.cwd(), 'dist', 'public');
  const serverPublicPath = resolve(process.cwd(), 'server', 'public');
  const rootPublicPath = resolve(process.cwd(), 'public');
  
  // Check if dist/public exists
  if (existsSync(distPublicPath)) {
    console.log('Found dist/public directory');
    
    // Create symlinks for multiple possible paths
    try {
      // Create server directory if it doesn't exist
      if (!existsSync(dirname(serverPublicPath))) {
        mkdirSync(dirname(serverPublicPath), { recursive: true });
      }
      
      // Remove existing symlink if it exists
      if (existsSync(serverPublicPath)) {
        try {
          unlinkSync(serverPublicPath);
        } catch (e) {
          // Ignore errors
        }
      }
      
      // Create symlink from server/public to dist/public
      symlinkSync(distPublicPath, serverPublicPath);
      console.log('Created symlink: server/public -> dist/public');
    } catch (e) {
      console.error('Failed to create server/public symlink:', e);
    }
    
    // Also create root public symlink
    try {
      if (existsSync(rootPublicPath)) {
        try {
          unlinkSync(rootPublicPath);
        } catch (e) {
          // Ignore errors
        }
      }
      
      symlinkSync(distPublicPath, rootPublicPath);
      console.log('Created symlink: public -> dist/public');
    } catch (e) {
      console.error('Failed to create root public symlink:', e);
    }
  } else {
    console.error('Warning: dist/public directory not found!');
  }
}

// Setup paths before starting the server
setupStaticPaths();

// Start the actual server
console.log('Starting production server...');
const serverProcess = spawn('node', ['dist/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

// Handle process termination
process.on('SIGTERM', () => {
  serverProcess.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGINT', () => {
  serverProcess.kill('SIGINT');
  process.exit(0);
});

serverProcess.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  process.exit(code || 0);
});