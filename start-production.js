#!/usr/bin/env node
// Production start script that ensures proper setup

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Starting production server with deployment fixes...');

// Ensure symlinks exist
function ensureSymlinks() {
  const distPublic = path.resolve('dist', 'public');
  const serverPublic = path.resolve('server', 'public');
  const rootPublic = path.resolve('public');
  
  if (fs.existsSync(distPublic)) {
    // Check and create server/public symlink
    if (!fs.existsSync(serverPublic)) {
      console.log('Creating server/public symlink...');
      if (!fs.existsSync('server')) {
        fs.mkdirSync('server');
      }
      try {
        fs.symlinkSync(path.resolve(distPublic), serverPublic);
        console.log('✓ Created server/public symlink');
      } catch (e) {
        console.error('Warning: Could not create server/public symlink:', e.message);
      }
    }
    
    // Check and create root public symlink
    if (!fs.existsSync(rootPublic)) {
      console.log('Creating public symlink...');
      try {
        fs.symlinkSync(path.resolve(distPublic), rootPublic);
        console.log('✓ Created public symlink');
      } catch (e) {
        console.error('Warning: Could not create public symlink:', e.message);
      }
    }
  } else {
    console.error('ERROR: dist/public directory not found!');
    console.error('Please run "npm run build" first.');
    process.exit(1);
  }
}

// Ensure symlinks before starting
ensureSymlinks();

// Set production environment
process.env.NODE_ENV = 'production';

// Start the server
console.log('Starting server from dist/index.js...');
const serverProcess = spawn('node', ['dist/index.js'], {
  stdio: 'inherit',
  env: process.env
});

// Handle termination signals
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...');
  serverProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  serverProcess.kill('SIGINT');
});

serverProcess.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code || 0);
});