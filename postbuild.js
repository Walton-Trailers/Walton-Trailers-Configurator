#!/usr/bin/env node
// Post-build script to fix deployment issues

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Running post-build fixes...');

// Fix 1: Create symlinks for static file serving
const distPublic = path.resolve('dist', 'public');
const serverPublic = path.resolve('server', 'public');
const rootPublic = path.resolve('public');

if (fs.existsSync(distPublic)) {
  // Create server directory if needed
  if (!fs.existsSync('server')) {
    fs.mkdirSync('server');
  }
  
  // Create symlink: server/public -> dist/public
  try {
    if (fs.existsSync(serverPublic)) {
      fs.unlinkSync(serverPublic);
    }
    fs.symlinkSync(path.resolve(distPublic), serverPublic);
    console.log('✓ Created symlink: server/public -> dist/public');
  } catch (e) {
    console.error('Failed to create server/public symlink:', e.message);
  }
  
  // Create symlink: public -> dist/public
  try {
    if (fs.existsSync(rootPublic)) {
      fs.unlinkSync(rootPublic);
    }
    fs.symlinkSync(path.resolve(distPublic), rootPublic);
    console.log('✓ Created symlink: public -> dist/public');
  } catch (e) {
    console.error('Failed to create root public symlink:', e.message);
  }
}

// Fix 2: Patch the bundled server file to handle static paths correctly
const bundledServer = path.resolve('dist', 'index.js');
if (fs.existsSync(bundledServer)) {
  try {
    let content = fs.readFileSync(bundledServer, 'utf8');
    let modified = false;
    
    // Fix all variations of static path resolution
    const replacements = [
      {
        old: 'path.resolve(import.meta.dirname, "public")',
        new: 'path.resolve(process.cwd(), "dist", "public")'
      },
      {
        old: 'path2.resolve(import.meta.dirname, "public")',
        new: 'path2.resolve(process.cwd(), "dist", "public")'
      },
      {
        old: 'path3.resolve(import.meta.dirname, "public")',
        new: 'path3.resolve(process.cwd(), "dist", "public")'
      },
      {
        old: 'import.meta.dirname, "public"',
        new: 'process.cwd(), "dist", "public"'
      }
    ];
    
    for (const { old: oldPattern, new: newPattern } of replacements) {
      if (content.includes(oldPattern)) {
        content = content.replace(new RegExp(oldPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newPattern);
        modified = true;
        console.log(`✓ Replaced: ${oldPattern}`);
      }
    }
    
    if (modified) {
      fs.writeFileSync(bundledServer, content);
      console.log('✓ Patched all static file paths in dist/index.js');
    } else {
      console.log('⚠ No path patterns found to patch in dist/index.js');
    }
  } catch (e) {
    console.error('Failed to patch dist/index.js:', e.message);
  }
}

console.log('Post-build fixes complete!');