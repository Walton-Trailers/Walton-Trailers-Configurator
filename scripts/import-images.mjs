/**
 * IMPORT SCRIPT — Run this on the NEW Replit after copying image-export/ here.
 *
 * Prerequisites:
 *   1. The image-export/ folder (produced by export-images.mjs) must be in
 *      the root of this project.
 *   2. Object Storage must be set up on the new Replit account and the
 *      PRIVATE_OBJECT_DIR environment variable must be configured.
 *      (Create a bucket in the Replit "Object Storage" tool — it will set
 *      PRIVATE_OBJECT_DIR and PUBLIC_OBJECT_SEARCH_PATHS automatically.)
 *
 * Usage:
 *   node scripts/import-images.mjs
 *
 * What it does:
 *   Uploads every image in image-export/ to the new Object Storage bucket
 *   using the same UUID filename as before, so all existing database paths
 *   (/objects/models/<uuid>) continue to work without any DB changes.
 */

import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

const SIDECAR_ENDPOINT = 'http://127.0.0.1:1106';
const INPUT_DIR = 'image-export';
const ACL_POLICY_METADATA_KEY = 'custom:aclPolicy';

// ─── Validate environment ─────────────────────────────────────────────────────

if (!process.env.PRIVATE_OBJECT_DIR) {
  console.error(`
❌  PRIVATE_OBJECT_DIR is not set.

    Set up Object Storage on this Replit account first:
      1. Open the "Object Storage" tool in the Replit sidebar
      2. Create a new bucket — Replit will automatically set
         PRIVATE_OBJECT_DIR and PUBLIC_OBJECT_SEARCH_PATHS for you
      3. Re-run this script
`);
  process.exit(1);
}

const manifestPath = path.join(INPUT_DIR, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error(`❌  ${manifestPath} not found. Copy the image-export/ folder from the original Replit first.`);
  process.exit(1);
}

// ─── GCS client (same credentials pattern as server/objectStorage.ts) ────────

const storageClient = new Storage({
  credentials: {
    audience: 'replit',
    subject_token_type: 'access_token',
    token_url: `${SIDECAR_ENDPOINT}/token`,
    type: 'external_account',
    credential_source: {
      url: `${SIDECAR_ENDPOINT}/credential`,
      format: {
        type: 'json',
        subject_token_field_name: 'access_token',
      },
    },
    universe_domain: 'googleapis.com',
  },
  projectId: '',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseObjectPath(fullPath) {
  if (!fullPath.startsWith('/')) fullPath = `/${fullPath}`;
  const parts = fullPath.split('/');
  return {
    bucketName: parts[1],
    objectName: parts.slice(2).join('/'),
  };
}

function getPrivateObjectDir() {
  let dir = process.env.PRIVATE_OBJECT_DIR;
  if (!dir.endsWith('/')) dir = `${dir}/`;
  return dir;
}

async function uploadFile(localFilePath, uuid) {
  const objectDir = getPrivateObjectDir();
  const fullPath = `${objectDir}models/${uuid}`;
  const { bucketName, objectName } = parseObjectPath(fullPath);

  const bucket = storageClient.bucket(bucketName);
  const file = bucket.file(objectName);

  // Upload the file
  await file.save(fs.readFileSync(localFilePath), {
    resumable: false,
  });

  // Set ACL metadata so the server treats it as public (same as original upload flow)
  await file.setMetadata({
    metadata: {
      [ACL_POLICY_METADATA_KEY]: JSON.stringify({ owner: 'admin', visibility: 'public' }),
    },
  });

  return `/objects/models/${uuid}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entries = manifest.filter(e => !e.error); // skip any that failed during export
  const skipped = manifest.length - entries.length;

  console.log(`📋  Manifest loaded: ${entries.length} file(s) to import${skipped ? `, ${skipped} skipped (export errors)` : ''}.`);
  console.log(`🪣  Target bucket dir: ${process.env.PRIVATE_OBJECT_DIR}\n`);

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < entries.length; i++) {
    const { originalPath, filename } = entries[i];
    const localFilePath = path.join(INPUT_DIR, filename);

    process.stdout.write(`  [${i + 1}/${entries.length}] ${filename} … `);

    if (!fs.existsSync(localFilePath)) {
      console.log(`❌  SKIPPED — local file not found`);
      failed++;
      continue;
    }

    try {
      await uploadFile(localFilePath, filename);
      succeeded++;
      const sizeKb = (fs.statSync(localFilePath).size / 1024).toFixed(1);
      console.log(`✅  (${sizeKb} KB)`);
    } catch (err) {
      failed++;
      console.log(`❌  FAILED — ${err.message}`);
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${failed === 0 ? '✅' : '⚠️ '}  Import complete!
   Succeeded : ${succeeded}
   Failed    : ${failed}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  if (succeeded > 0 && failed === 0) {
    console.log('All images are now in the new bucket. Your database paths are');
    console.log('unchanged — the app should display all images immediately.\n');
  } else if (failed > 0) {
    console.log(`${failed} file(s) failed. Re-run the script to retry — it is safe to run multiple times.`);
    console.log('Already-uploaded files will simply be overwritten.\n');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
