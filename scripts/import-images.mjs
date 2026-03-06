/**
 * IMPORT SCRIPT — Run this on the NEW Replit after copying image-export/ here.
 *
 * Prerequisites:
 *   1. The image-export/ folder (from export-images.mjs) must be in the project root.
 *   2. An Object Storage bucket must be created on this Replit.
 *   3. PRIVATE_OBJECT_DIR must be set (Replit sets it when a bucket is created).
 *
 * Usage:
 *   node scripts/import-images.mjs --info         # check your env vars first
 *   node scripts/import-images.mjs --dry-run      # preview what will be uploaded
 *   node scripts/import-images.mjs                # run the actual import
 *
 * How it works:
 *   The DB stores paths like "/objects/models/{uuid}".
 *   The app resolves them to bucket paths like:
 *     PRIVATE_OBJECT_DIR + "/" + "models/{uuid}"
 *     e.g. "/<bucket>/.private/models/{uuid}"
 *
 *   This script recreates that exact structure in the new bucket so all
 *   existing DB records work without modification.
 */

import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

const SIDECAR_ENDPOINT = 'http://127.0.0.1:1106';
const INPUT_DIR = 'image-export';
const ACL_POLICY_METADATA_KEY = 'custom:aclPolicy';
const ACL_POLICY_VALUE = JSON.stringify({ owner: 'admin', visibility: 'public' });

// ─── --info mode ──────────────────────────────────────────────────────────────

if (process.argv[2] === '--info') {
  const priv = process.env.PRIVATE_OBJECT_DIR || '(not set)';
  const pub = process.env.PUBLIC_OBJECT_SEARCH_PATHS || '(not set)';
  console.log('\nCurrent Object Storage environment:\n');
  console.log(`  PRIVATE_OBJECT_DIR         = ${priv}`);
  console.log(`  PUBLIC_OBJECT_SEARCH_PATHS = ${pub}`);
  if (priv === '(not set)') {
    console.log(`
  PRIVATE_OBJECT_DIR is not set in this shell session.

  Try one of these:
    1. Open a NEW shell tab (after creating the bucket) and re-run this.
    2. Run: printenv | grep OBJECT
       to find the actual value, then add it to Secrets manually.
    3. The value should look like: /replit-objstore-<uuid>/.private
`);
  } else {
    const parts = priv.split('/').filter(Boolean);
    const bucket = parts[0];
    const prefix = parts.slice(1).join('/');
    console.log(`\n  Bucket name : ${bucket}`);
    console.log(`  Prefix      : ${prefix}`);
    console.log(`\n  This means images will be stored at:`);
    console.log(`    ${bucket}:${prefix}/models/{uuid}\n`);
    console.log(`  Make sure these are saved in your Secrets tab:`);
    console.log(`    PRIVATE_OBJECT_DIR         = ${priv}`);
    console.log(`    PUBLIC_OBJECT_SEARCH_PATHS = /${bucket}/public\n`);
  }
  process.exit(0);
}

// ─── Resolve PRIVATE_OBJECT_DIR ───────────────────────────────────────────────

let privateObjectDir = process.env.PRIVATE_OBJECT_DIR || '';

if (!privateObjectDir) {
  console.error(`
PRIVATE_OBJECT_DIR is not set.

  Run this first to check your environment:
    node import-images.mjs --info

  If the variable is not available, open a fresh shell tab or
  add it to Secrets manually. It should look like:
    /replit-objstore-<uuid>/.private
`);
  process.exit(1);
}

if (!privateObjectDir.endsWith('/')) privateObjectDir += '/';

const dirParts = privateObjectDir.split('/').filter(Boolean);
const BUCKET_NAME = dirParts[0];
const PRIVATE_PREFIX = dirParts.slice(1).join('/');

console.log(`\nBucket         : ${BUCKET_NAME}`);
console.log(`Private prefix : ${PRIVATE_PREFIX}`);

// ─── Check manifest ───────────────────────────────────────────────────────────

const manifestPath = path.join(INPUT_DIR, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error(`\n${manifestPath} not found. Copy the image-export/ folder here first.`);
  process.exit(1);
}

// ─── GCS client (for setting ACL metadata after upload) ───────────────────────

const storageClient = new Storage({
  credentials: {
    audience: 'replit',
    subject_token_type: 'access_token',
    token_url: `${SIDECAR_ENDPOINT}/token`,
    type: 'external_account',
    credential_source: {
      url: `${SIDECAR_ENDPOINT}/credential`,
      format: { type: 'json', subject_token_field_name: 'access_token' },
    },
    universe_domain: 'googleapis.com',
  },
  projectId: '',
});

// ─── Path mapping (matches server/objectStorage.ts getObjectEntityFile) ───────

function dbPathToBucketObject(originalPath) {
  // originalPath = "/objects/models/{uuid}"
  // App strips "/objects/" → "models/{uuid}"
  // Then prepends PRIVATE_OBJECT_DIR → "/<bucket>/.private/models/{uuid}"
  // So the GCS object name = ".private/models/{uuid}"

  if (!originalPath.startsWith('/objects/')) {
    throw new Error(`Unexpected path format: ${originalPath} (expected /objects/...)`);
  }

  const entityId = originalPath.slice('/objects/'.length); // "models/{uuid}"
  const objectName = PRIVATE_PREFIX ? `${PRIVATE_PREFIX}/${entityId}` : entityId;
  return objectName;
}

// ─── Upload via sidecar signed PUT URL ────────────────────────────────────────

async function getSignedPutUrl(objectName) {
  const body = {
    bucket_name: BUCKET_NAME,
    object_name: objectName,
    method: 'PUT',
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
  const res = await fetch(`${SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Sidecar error ${res.status}: ${text}`);
  }
  const { signed_url } = await res.json();
  return signed_url;
}

async function uploadContent(signedUrl, fileBuffer) {
  const res = await fetch(signedUrl, {
    method: 'PUT',
    body: fileBuffer,
    headers: { 'Content-Type': 'application/octet-stream' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }
}

async function setAclMetadata(objectName) {
  const file = storageClient.bucket(BUCKET_NAME).file(objectName);
  await file.setMetadata({
    metadata: { [ACL_POLICY_METADATA_KEY]: ACL_POLICY_VALUE },
  });
}

async function uploadFile(localFilePath, originalPath) {
  const objectName = dbPathToBucketObject(originalPath);

  // Step 1: upload content via signed URL (no bucket-level permissions needed)
  const signedUrl = await getSignedPutUrl(objectName);
  const fileBuffer = fs.readFileSync(localFilePath);
  await uploadContent(signedUrl, fileBuffer);

  // Step 2: set ACL metadata so the app can serve the image publicly
  try {
    await setAclMetadata(objectName);
  } catch (err) {
    throw new Error(`Uploaded OK, but metadata failed: ${err.message}`);
  }

  return objectName;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const isDryRun = process.argv[2] === '--dry-run';
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entries = manifest.filter(e => !e.error);
  const skipped = manifest.length - entries.length;

  console.log(`\n${entries.length} file(s) to import${skipped ? `, ${skipped} skipped (had export errors)` : ''}.`);

  if (isDryRun) {
    console.log('\n--- DRY RUN (no files will be uploaded) ---\n');
    console.log('Path mapping (DB path → bucket object):');
    for (const entry of entries) {
      const objectName = dbPathToBucketObject(entry.originalPath);
      const localFile = path.join(INPUT_DIR, entry.filename);
      const exists = fs.existsSync(localFile);
      const size = exists ? `${(fs.statSync(localFile).size / 1024).toFixed(1)} KB` : 'MISSING';
      console.log(`  ${entry.originalPath}`);
      console.log(`    → ${BUCKET_NAME}/${objectName}  (${size})`);
    }
    console.log(`\n--- End dry run. Run without --dry-run to upload. ---\n`);
    process.exit(0);
  }

  // Quick sidecar check
  console.log('\nChecking sidecar connection…');
  try {
    const testObject = PRIVATE_PREFIX ? `${PRIVATE_PREFIX}/.connection-test` : '.connection-test';
    await getSignedPutUrl(testObject);
    console.log('Sidecar reachable and bucket confirmed.\n');
  } catch (err) {
    console.error(`
Could not reach the sidecar or the bucket name is wrong.

  Error: ${err.message}

  Run:  node import-images.mjs --info
  to verify your PRIVATE_OBJECT_DIR is correct.

  The bucket name must be the real GCS name (like replit-objstore-xxx),
  NOT the display name shown in the Object Storage UI.
`);
    process.exit(1);
  }

  let succeeded = 0;
  let metadataFailed = 0;
  let failed = 0;

  for (let i = 0; i < entries.length; i++) {
    const { filename, originalPath } = entries[i];
    const localFilePath = path.join(INPUT_DIR, filename);

    process.stdout.write(`  [${String(i + 1).padStart(2)}/${entries.length}] ${originalPath} … `);

    if (!fs.existsSync(localFilePath)) {
      console.log('SKIPPED — local file not found');
      failed++;
      continue;
    }

    try {
      const objectName = await uploadFile(localFilePath, originalPath);
      succeeded++;
      const sizeKb = (fs.statSync(localFilePath).size / 1024).toFixed(1);
      console.log(`OK (${sizeKb} KB) → ${objectName}`);
    } catch (err) {
      if (err.message.startsWith('Uploaded OK, but metadata failed')) {
        metadataFailed++;
        console.log(`WARN — ${err.message}`);
      } else {
        failed++;
        console.log(`FAILED — ${err.message}`);
      }
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Import complete!
    Uploaded OK      : ${succeeded}
    Metadata warnings: ${metadataFailed}
    Failed           : ${failed}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  if (succeeded > 0 || metadataFailed > 0) {
    console.log('Verify these are in your Secrets tab so the app serves images correctly:');
    console.log(`  PRIVATE_OBJECT_DIR         = /${BUCKET_NAME}/${PRIVATE_PREFIX}`);
    console.log(`  PUBLIC_OBJECT_SEARCH_PATHS = /${BUCKET_NAME}/public\n`);
  }

  if (metadataFailed > 0) {
    console.log(`${metadataFailed} file(s) uploaded but ACL metadata not set.`);
    console.log('  These images may not load until you re-upload them via the admin panel.\n');
  }

  if (failed > 0) {
    console.log(`${failed} file(s) failed. Safe to re-run — existing files are overwritten.\n`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
