#!/usr/bin/env node
// Simple production start script

import { spawn } from 'child_process';
import { existsSync } from 'fs';

console.log('Starting production server...');

// Verify build exists
if (!existsSync('dist/server.js')) {
  console.error('ERROR: dist/server.js not found!');
  console.error('Please run the build process first.');
  process.exit(1);
}

if (!existsSync('dist/public/index.html')) {
  console.error('ERROR: dist/public/index.html not found!');
  console.error('Please run the build process first.');
  process.exit(1);
}

// Set production environment
process.env.NODE_ENV = 'production';

// Start the server
console.log('Starting server from dist/server.js...');
const serverProcess = spawn('node', ['dist/server.js'], {
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