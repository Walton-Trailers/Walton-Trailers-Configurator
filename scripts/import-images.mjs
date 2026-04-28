/**
 * IMPORT SCRIPT — Uploads images from image-export/ into Vercel Blob.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * PREREQUISITES
 *
 *   1. Vercel Blob store provisioned on the project (auto-injects
 *      BLOB_READ_WRITE_TOKEN into the Vercel env).
 *
 *   2. Pull env vars locally:
 *        vercel env pull .env.local
 *
 *   3. Copy the image-export/ folder into the project root, with manifest.json
 *      at image-export/manifest.json.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * USAGE
 *
 *   # Verify env is present:
 *   node --env-file=.env.local scripts/import-images.mjs --info
 *
 *   # Dry-run (no uploads):
 *   node --env-file=.env.local scripts/import-images.mjs --dry-run
 *
 *   # Real run:
 *   node --env-file=.env.local scripts/import-images.mjs
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BUCKET STRUCTURE
 *
 *   The DB stores image paths as "/objects/models/{uuid}". On Vercel Blob the
 *   pathname is just "models/{uuid}". server/objectStorage.ts strips the
 *   "/objects/" prefix at read time and resolves the blob via head().
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

const INPUT_DIR = 'image-export';

// ─── --info mode ──────────────────────────────────────────────────────────────

if (process.argv.includes('--info')) {
  const tokenSet = !!process.env.BLOB_READ_WRITE_TOKEN;
  console.log('\n=== Vercel Blob Environment ===\n');
  console.log(`  BLOB_READ_WRITE_TOKEN = ${tokenSet ? '(set)' : '(NOT SET)'}`);
  if (!tokenSet) {
    console.log(`
  BLOB_READ_WRITE_TOKEN is not set.

  Steps to fix:
    1. Provision a Blob store on the Vercel project (Storage → Create → Blob).
    2. From the configurator folder, run:
         vercel env pull .env.local
    3. Re-run this script with:
         node --env-file=.env.local scripts/import-images.mjs --info
`);
  } else {
    console.log(`\n  Ready to import. Run without --info to begin.\n`);
  }
  process.exit(0);
}

// ─── Parse arguments ──────────────────────────────────────────────────────────

const isDryRun = process.argv.includes('--dry-run');

if (!process.env.BLOB_READ_WRITE_TOKEN && !isDryRun) {
  console.error(`
BLOB_READ_WRITE_TOKEN is not set.

  Run with --info for instructions.
`);
  process.exit(1);
}

// ─── Check manifest ───────────────────────────────────────────────────────────

const manifestPath = path.join(INPUT_DIR, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error(
    `\n${manifestPath} not found.\n` +
    `Copy the image-export/ folder into this project's root directory first.\n`,
  );
  process.exit(1);
}

// ─── Path mapping ─────────────────────────────────────────────────────────────
// DB stores: /objects/models/{uuid}
// Blob pathname: models/{uuid}

function dbPathToBlobPathname(originalPath) {
  if (!originalPath.startsWith('/objects/')) {
    throw new Error(`Unexpected DB path format: ${originalPath}`);
  }
  return originalPath.slice('/objects/'.length); // "models/{uuid}"
}

function detectContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entries = manifest.filter((e) => !e.error);
  const skipped = manifest.length - entries.length;

  console.log(`\n=== Vercel Blob Image Import ===`);
  console.log(`  Source     : ${INPUT_DIR}/`);
  console.log(`  Target     : Vercel Blob (pathname: models/{uuid})`);
  console.log(
    `  Files      : ${entries.length}${
      skipped ? ` (${skipped} skipped — had export errors)` : ''
    }`,
  );

  if (isDryRun) {
    console.log(`\n--- DRY RUN (nothing will be uploaded) ---\n`);
    for (const entry of entries) {
      const blobPath = dbPathToBlobPathname(entry.originalPath);
      const localFile = path.join(INPUT_DIR, entry.filename);
      const exists = fs.existsSync(localFile);
      const size = exists
        ? `${(fs.statSync(localFile).size / 1024).toFixed(1)} KB`
        : 'FILE MISSING';
      console.log(`  ${entry.originalPath}`);
      console.log(`    → blob://${blobPath}  (${size})`);
    }
    console.log(`\n--- Run without --dry-run to upload. ---\n`);
    process.exit(0);
  }

  let succeeded = 0;
  let failed = 0;

  console.log('');
  for (let i = 0; i < entries.length; i++) {
    const { filename, originalPath } = entries[i];
    const localFilePath = path.join(INPUT_DIR, filename);

    process.stdout.write(
      `  [${String(i + 1).padStart(2)}/${entries.length}] ${path.basename(
        originalPath,
      )} … `,
    );

    if (!fs.existsSync(localFilePath)) {
      console.log('SKIP (file not found locally)');
      failed++;
      continue;
    }

    try {
      const blobPath = dbPathToBlobPathname(originalPath);
      const fileBuffer = fs.readFileSync(localFilePath);
      const contentType = detectContentType(filename);
      const result = await put(blobPath, fileBuffer, {
        access: 'public',
        allowOverwrite: true,
        contentType,
      });
      const sizeKb = (fileBuffer.length / 1024).toFixed(1);
      console.log(`OK (${sizeKb} KB) → ${result.url}`);
      succeeded++;
    } catch (err) {
      console.log(`FAIL — ${err.message}`);
      failed++;
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Import complete!
    Uploaded OK : ${succeeded}
    Failed      : ${failed}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  if (failed > 0) {
    console.log(`  ${failed} file(s) failed. Safe to re-run.\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
