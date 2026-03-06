/**
 * IMPORT SCRIPT — Run this on the NEW Replit after copying image-export/ here.
 *
 * Prerequisites:
 *   1. The image-export/ folder must be in the root of this project.
 *   2. An Object Storage bucket must be created and linked to this Replit.
 *
 * First, confirm your bucket is linked (open a NEW shell after creating the bucket):
 *   node import-images.mjs --info
 *
 * Then run the import:
 *   node import-images.mjs
 *
 * Or override the bucket if PRIVATE_OBJECT_DIR is not set yet:
 *   node import-images.mjs replit-objstore-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
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
  ⚠️  PRIVATE_OBJECT_DIR is not set in this shell session.
     Try opening a NEW shell tab (after the bucket was created) and re-running.
     Or add it manually in the Secrets tab — the value is the real GCS bucket name,
     formatted as:  /replit-objstore-<uuid>/.private
`);
  } else {
    const bucket = priv.split('/').filter(Boolean)[0];
    console.log(`\n  ✅ Bucket ready. Run the import with:\n     node import-images.mjs\n`);
    console.log(`  Also make sure these are saved in your Secrets tab:`);
    console.log(`    PRIVATE_OBJECT_DIR         = ${priv}`);
    console.log(`    PUBLIC_OBJECT_SEARCH_PATHS = /${bucket}/public\n`);
  }
  process.exit(0);
}

// ─── Resolve bucket name ──────────────────────────────────────────────────────

const bucketArg = process.argv[2];
let privateObjectDir = process.env.PRIVATE_OBJECT_DIR || '';

if (bucketArg && !bucketArg.startsWith('--')) {
  privateObjectDir = `/${bucketArg}/.private`;
  console.log(`Using bucket from argument: ${privateObjectDir}`);
} else if (privateObjectDir) {
  console.log(`Using bucket from PRIVATE_OBJECT_DIR: ${privateObjectDir}`);
} else {
  console.error(`
❌  Cannot determine bucket.

  Option 1 — open a NEW shell tab (picks up env vars set after bucket creation):
    node import-images.mjs --info

  Option 2 — pass the real GCS bucket name directly:
    node import-images.mjs replit-objstore-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

  The real bucket name is NOT the display name you see in the UI.
  Find it by opening a fresh shell and running:  printenv | grep OBJECT
`);
  process.exit(1);
}

if (!privateObjectDir.endsWith('/')) privateObjectDir += '/';

// Parse bucket name and object prefix from PRIVATE_OBJECT_DIR
// Format: /<bucket-name>/.private/
const dirParts = privateObjectDir.split('/').filter(Boolean);
const BUCKET_NAME = dirParts[0];
const OBJECT_PREFIX = dirParts.slice(1).join('/'); // e.g. ".private"

// ─── Check manifest ───────────────────────────────────────────────────────────

const manifestPath = path.join(INPUT_DIR, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error(`❌  ${manifestPath} not found. Copy the image-export/ folder here first.`);
  process.exit(1);
}

// ─── GCS client (used only for setting metadata after upload) ─────────────────

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

async function uploadContent(signedUrl, fileBuffer, contentType = 'application/octet-stream') {
  const res = await fetch(signedUrl, {
    method: 'PUT',
    body: fileBuffer,
    headers: { 'Content-Type': contentType },
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

async function uploadFile(localFilePath, uuid) {
  const objectName = `${OBJECT_PREFIX}/models/${uuid}`;
  const fileBuffer = fs.readFileSync(localFilePath);

  // Step 1: upload content via signed URL (no bucket-level permissions needed)
  const signedUrl = await getSignedPutUrl(objectName);
  await uploadContent(signedUrl, fileBuffer);

  // Step 2: set ACL metadata so the app can serve the image
  // Uses storage.objects.update — separate permission from storage.buckets.get
  await setAclMetadata(objectName);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entries = manifest.filter(e => !e.error);
  const skipped = manifest.length - entries.length;

  console.log(`\n📋  ${entries.length} file(s) to import${skipped ? `, ${skipped} skipped (export errors)` : ''}.`);
  console.log(`🪣  Bucket: ${BUCKET_NAME}\n`);

  // Quick sidecar check — get one signed URL to verify the sidecar is reachable
  // and the bucket name is correct, before processing all files
  console.log('🔌  Checking sidecar connection…');
  try {
    await getSignedPutUrl(`${OBJECT_PREFIX}/.connection-test`);
    console.log('✅  Sidecar reachable and bucket confirmed.\n');
  } catch (err) {
    console.error(`
❌  Could not reach the sidecar or bucket.

  Error: ${err.message}

  Things to check:
    1. The bucket name is correct — run:  node import-images.mjs --info
       The value in PRIVATE_OBJECT_DIR must match the real GCS bucket name,
       NOT the display name shown in the Object Storage UI.
    2. The app workflow must be running (Sidecar is part of the running app).
    3. If you passed a bucket name manually, make sure it's the internal name
       (starts with replit-objstore-...) not the human-readable display name.

  Current bucket attempted: ${BUCKET_NAME}
`);
    process.exit(1);
  }

  let succeeded = 0;
  let metadataFailed = 0;
  let failed = 0;

  for (let i = 0; i < entries.length; i++) {
    const { filename } = entries[i];
    const localFilePath = path.join(INPUT_DIR, filename);

    process.stdout.write(`  [${String(i + 1).padStart(2)}/${entries.length}] ${filename} … `);

    if (!fs.existsSync(localFilePath)) {
      console.log('❌  SKIPPED — local file not found');
      failed++;
      continue;
    }

    try {
      await uploadFile(localFilePath, filename);
      succeeded++;
      const sizeKb = (fs.statSync(localFilePath).size / 1024).toFixed(1);
      console.log(`✅  (${sizeKb} KB)`);
    } catch (err) {
      // If only the metadata step failed, the file IS uploaded — warn but count separately
      if (err.message.includes('metadata') || err.message.includes('setMetadata')) {
        metadataFailed++;
        console.log(`⚠️   UPLOADED but metadata not set — ${err.message}`);
      } else {
        failed++;
        console.log(`❌  FAILED — ${err.message}`);
      }
    }
  }

  const bucket = BUCKET_NAME;
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${failed === 0 && metadataFailed === 0 ? '✅' : '⚠️ '}  Import complete!
   Uploaded OK   : ${succeeded}
   Metadata warn : ${metadataFailed}
   Failed        : ${failed}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  if (succeeded > 0 || metadataFailed > 0) {
    console.log('Make sure these are saved in your Secrets tab so the app can serve images:');
    console.log(`  PRIVATE_OBJECT_DIR         = /${bucket}/.private`);
    console.log(`  PUBLIC_OBJECT_SEARCH_PATHS = /${bucket}/public\n`);
  }

  if (metadataFailed > 0) {
    console.log(`⚠️  ${metadataFailed} file(s) uploaded but missing ACL metadata.`);
    console.log('   Images may not be served until you set visibility via the admin panel.\n');
  }

  if (failed > 0) {
    console.log(`${failed} file(s) failed. Safe to re-run — files already uploaded are overwritten.\n`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
