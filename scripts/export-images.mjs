/**
 * EXPORT SCRIPT — Run this on the CURRENT Replit to download all images.
 *
 * Prerequisites:
 *   - The app server must be running (npm run dev) so images can be fetched
 *     via http://localhost:5000/objects/...
 *
 * Usage:
 *   node scripts/export-images.mjs
 *
 * Output:
 *   image-export/          — folder containing all image files (named by UUID)
 *   image-export/manifest.json  — maps each original DB path to filename
 *
 * After it finishes, download the entire image-export/ folder from the Replit
 * file tree (right-click > Download) and copy it into the new Replit.
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

const SERVER_BASE = 'http://localhost:5000';
const OUTPUT_DIR = 'image-export';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

async function collectPaths() {
  const paths = new Set();

  const addPath = (p) => {
    if (p && typeof p === 'string' && p.startsWith('/objects/')) paths.add(p);
  };

  const cats = await query('SELECT image_url FROM trailer_categories WHERE image_url IS NOT NULL');
  cats.rows.forEach(r => addPath(r.image_url));

  const series = await query('SELECT image_url FROM trailer_series WHERE image_url IS NOT NULL');
  series.rows.forEach(r => addPath(r.image_url));

  const models = await query('SELECT image_url, image_urls, model_3d_url FROM trailer_models WHERE image_url IS NOT NULL OR image_urls IS NOT NULL OR model_3d_url IS NOT NULL');
  for (const r of models.rows) {
    addPath(r.image_url);
    addPath(r.model_3d_url);
    if (r.image_urls) {
      const arr = typeof r.image_urls === 'string' ? JSON.parse(r.image_urls) : r.image_urls;
      if (Array.isArray(arr)) arr.forEach(addPath);
    }
  }

  const options = await query('SELECT image_url FROM trailer_options WHERE image_url IS NOT NULL');
  options.rows.forEach(r => addPath(r.image_url));

  try {
    const media = await query('SELECT object_path FROM media_files WHERE object_path IS NOT NULL');
    media.rows.forEach(r => addPath(r.object_path));
  } catch (_) {
    // media_files table may not exist
  }

  return Array.from(paths);
}

async function downloadImage(objectPath) {
  const url = `${SERVER_BASE}${objectPath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  console.log('Collecting image paths from database…');
  const paths = await collectPaths();
  console.log(`  Found ${paths.length} unique image path(s).`);

  if (paths.length === 0) {
    console.log('Nothing to export.');
    await pool.end();
    return;
  }

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const manifest = [];
  let succeeded = 0;
  let failed = 0;

  console.log(`\nDownloading images to ./${OUTPUT_DIR}/\n`);

  for (let i = 0; i < paths.length; i++) {
    const objectPath = paths[i];
    const filename = path.basename(objectPath);
    const destFile = path.join(OUTPUT_DIR, filename);

    process.stdout.write(`  [${i + 1}/${paths.length}] ${filename} … `);

    try {
      const data = await downloadImage(objectPath);
      fs.writeFileSync(destFile, data);
      manifest.push({ originalPath: objectPath, filename });
      succeeded++;
      console.log(`OK (${(data.length / 1024).toFixed(1)} KB)`);
    } catch (err) {
      failed++;
      console.log(`FAILED — ${err.message}`);
      manifest.push({ originalPath: objectPath, filename, error: err.message });
    }
  }

  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`
Export complete!
  Succeeded : ${succeeded}
  Failed    : ${failed}
  Manifest  : ${manifestPath}

Next steps:
  1. Download the image-export/ folder (right-click > Download as zip)
  2. Copy it into your new Replit project root
  3. Run: node scripts/import-images.mjs
`);

  await pool.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
