/**
 * IMPORT SCRIPT — Run this on the NEW Replit after copying image-export/ here.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * PREREQUISITES (do these BEFORE running this script):
 *
 *   1. Create a bucket in the Object Storage tool (sidebar).
 *
 *   2. Open a FRESH Shell tab and run:
 *        printenv | grep PRIVATE_OBJECT_DIR
 *      It should print something like:
 *        PRIVATE_OBJECT_DIR=/replit-objstore-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/.private
 *      The part between the first "/" and "/.private" is your REAL bucket name.
 *
 *   3. Copy the image-export/ folder into this project's root directory.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * USAGE:
 *
 *   # Step 1 — find your real bucket name:
 *   node scripts/import-images.mjs --info
 *
 *   # Step 2 — preview what will be uploaded:
 *   node scripts/import-images.mjs --dry-run <bucket-name>
 *
 *   # Step 3 — run the actual import:
 *   node scripts/import-images.mjs <bucket-name>
 *
 *   Example:
 *   node scripts/import-images.mjs replit-objstore-7f98062e-a74e-497b-9262-ff55acb63d15
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BUCKET STRUCTURE CREATED:
 *
 *   <bucket>/
 *     .private/
 *       models/
 *         {uuid}    ← image files
 *         {uuid}
 *         ...
 *     public/       ← empty marker (required by app)
 *
 *   This exactly matches how the app stores and retrieves images.
 *   Database paths like "/objects/models/{uuid}" are resolved by the app as:
 *     PRIVATE_OBJECT_DIR + "/models/{uuid}"
 *     = "/<bucket>/.private/models/{uuid}"
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

const SIDECAR_ENDPOINT = 'http://127.0.0.1:1106';
const INPUT_DIR = 'image-export';
const ACL_POLICY_METADATA_KEY = 'custom:aclPolicy';
const ACL_POLICY_VALUE = JSON.stringify({ owner: 'admin', visibility: 'public' });

// The app ALWAYS uses this exact structure inside the bucket.
// This is hardcoded here to match server/objectStorage.ts behavior.
const PRIVATE_FOLDER = '.private';
const MODELS_SUBFOLDER = 'models';

// ─── --info mode ──────────────────────────────────────────────────────────────

if (process.argv.includes('--info')) {
  const priv = process.env.PRIVATE_OBJECT_DIR || '';
  const pub = process.env.PUBLIC_OBJECT_SEARCH_PATHS || '';
  console.log('\n=== Object Storage Environment ===\n');
  console.log(`  PRIVATE_OBJECT_DIR         = ${priv || '(not set)'}`);
  console.log(`  PUBLIC_OBJECT_SEARCH_PATHS = ${pub || '(not set)'}`);

  if (priv) {
    const bucketName = priv.split('/').filter(Boolean)[0];
    console.log(`\n  Your real bucket name is: ${bucketName}`);
    console.log(`\n  Run the import with:`);
    console.log(`    node scripts/import-images.mjs ${bucketName}\n`);
  } else {
    console.log(`
  PRIVATE_OBJECT_DIR is not set in this shell session.

  Try these steps:
    1. Make sure you created a bucket in the Object Storage tool.
    2. Open a NEW shell tab (the variable is set when the bucket is created).
    3. Run: printenv | grep PRIVATE_OBJECT_DIR
    4. Copy the bucket name (the part before /.private) and use it:
       node scripts/import-images.mjs <bucket-name>
`);
  }
  process.exit(0);
}

// ─── Parse arguments ──────────────────────────────────────────────────────────

const isDryRun = process.argv.includes('--dry-run');
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
let BUCKET_NAME = args[0] || '';

// If no bucket name given, try to extract from PRIVATE_OBJECT_DIR
if (!BUCKET_NAME && process.env.PRIVATE_OBJECT_DIR) {
  BUCKET_NAME = process.env.PRIVATE_OBJECT_DIR.split('/').filter(Boolean)[0];
}

if (!BUCKET_NAME) {
  console.error(`
No bucket name provided.

  First, find your real bucket name:
    node scripts/import-images.mjs --info

  Then run:
    node scripts/import-images.mjs <bucket-name>

  The bucket name looks like: replit-objstore-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  It is NOT the display name you see in the Object Storage UI (like "imagesbucket").
`);
  process.exit(1);
}

// ─── Check manifest ───────────────────────────────────────────────────────────

const manifestPath = path.join(INPUT_DIR, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error(`\n${manifestPath} not found.\nCopy the image-export/ folder into this project's root directory first.\n`);
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

// ─── Path mapping ─────────────────────────────────────────────────────────────
// This hardcodes the EXACT structure the app uses:
//   DB path:     /objects/models/{uuid}
//   Bucket path: .private/models/{uuid}
//
// The app resolves paths like this (server/objectStorage.ts getObjectEntityFile):
//   1. Strip "/objects/" from DB path → "models/{uuid}"
//   2. Prepend PRIVATE_OBJECT_DIR   → "/<bucket>/.private/models/{uuid}"
//   3. Split into bucket + object   → bucket: <bucket>, object: ".private/models/{uuid}"

function dbPathToObjectName(originalPath) {
  if (!originalPath.startsWith('/objects/')) {
    throw new Error(`Unexpected DB path format: ${originalPath}`);
  }
  const entityId = originalPath.slice('/objects/'.length); // "models/{uuid}"
  return `${PRIVATE_FOLDER}/${entityId}`; // ".private/models/{uuid}"
}

// ─── Sidecar signed URL upload ────────────────────────────────────────────────

async function getSignedPutUrl(objectName) {
  const res = await fetch(`${SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bucket_name: BUCKET_NAME,
      object_name: objectName,
      method: 'PUT',
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Sidecar error ${res.status}: ${text}`);
  }
  const { signed_url } = await res.json();
  return signed_url;
}

async function uploadViaSignedUrl(signedUrl, fileBuffer) {
  const res = await fetch(signedUrl, {
    method: 'PUT',
    body: fileBuffer,
    headers: { 'Content-Type': 'application/octet-stream' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PUT failed (${res.status}): ${text}`);
  }
}

async function setAclMetadata(objectName) {
  const file = storageClient.bucket(BUCKET_NAME).file(objectName);
  await file.setMetadata({
    metadata: { [ACL_POLICY_METADATA_KEY]: ACL_POLICY_VALUE },
  });
}

async function uploadFile(localFilePath, originalPath) {
  const objectName = dbPathToObjectName(originalPath);

  const signedUrl = await getSignedPutUrl(objectName);
  const fileBuffer = fs.readFileSync(localFilePath);
  await uploadViaSignedUrl(signedUrl, fileBuffer);

  try {
    await setAclMetadata(objectName);
  } catch (err) {
    throw new Error(`Uploaded, but ACL metadata failed: ${err.message}`);
  }

  return objectName;
}

// ─── Create public/ marker ───────────────────────────────────────────────────

async function createPublicFolder() {
  try {
    const objectName = 'public/.keep';
    const signedUrl = await getSignedPutUrl(objectName);
    await uploadViaSignedUrl(signedUrl, Buffer.from(''));
    return true;
  } catch (err) {
    console.log(`  Warning: could not create public/ folder: ${err.message}`);
    return false;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entries = manifest.filter(e => !e.error);
  const skipped = manifest.length - entries.length;

  console.log(`\n=== Image Import ===`);
  console.log(`  Bucket     : ${BUCKET_NAME}`);
  console.log(`  Structure  : ${BUCKET_NAME}/${PRIVATE_FOLDER}/${MODELS_SUBFOLDER}/{uuid}`);
  console.log(`  Files      : ${entries.length}${skipped ? ` (${skipped} skipped — had export errors)` : ''}`);

  if (isDryRun) {
    console.log(`\n--- DRY RUN (nothing will be uploaded) ---\n`);
    for (const entry of entries) {
      const objectName = dbPathToObjectName(entry.originalPath);
      const localFile = path.join(INPUT_DIR, entry.filename);
      const exists = fs.existsSync(localFile);
      const size = exists ? `${(fs.statSync(localFile).size / 1024).toFixed(1)} KB` : 'FILE MISSING';
      console.log(`  ${entry.originalPath}`);
      console.log(`    → ${BUCKET_NAME}/${objectName}  (${size})`);
    }
    console.log(`\n  Also will create: ${BUCKET_NAME}/public/.keep`);
    console.log(`\n--- Run without --dry-run to upload. ---\n`);
    process.exit(0);
  }

  // Sidecar connectivity check
  console.log('\n  Checking sidecar…');
  try {
    await getSignedPutUrl(`${PRIVATE_FOLDER}/.connection-test`);
    console.log('  Sidecar OK.\n');
  } catch (err) {
    console.error(`
  Could not reach the sidecar or bucket name is wrong.
  Error: ${err.message}

  Make sure:
    1. The bucket name is the REAL GCS name (run --info to find it)
    2. The app workflow is running (sidecar needs it)
`);
    process.exit(1);
  }

  // Create public/ folder
  console.log('  Creating public/ folder…');
  await createPublicFolder();

  // Upload all images
  let succeeded = 0;
  let metadataWarn = 0;
  let failed = 0;

  console.log('');
  for (let i = 0; i < entries.length; i++) {
    const { filename, originalPath } = entries[i];
    const localFilePath = path.join(INPUT_DIR, filename);

    process.stdout.write(`  [${String(i + 1).padStart(2)}/${entries.length}] ${path.basename(originalPath)} … `);

    if (!fs.existsSync(localFilePath)) {
      console.log('SKIP (file not found locally)');
      failed++;
      continue;
    }

    try {
      const objectName = await uploadFile(localFilePath, originalPath);
      succeeded++;
      const sizeKb = (fs.statSync(localFilePath).size / 1024).toFixed(1);
      console.log(`OK (${sizeKb} KB)`);
    } catch (err) {
      if (err.message.startsWith('Uploaded, but ACL')) {
        metadataWarn++;
        console.log(`WARN — ${err.message}`);
      } else {
        failed++;
        console.log(`FAIL — ${err.message}`);
      }
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Import complete!
    Uploaded OK      : ${succeeded}
    Metadata warnings: ${metadataWarn}
    Failed           : ${failed}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Bucket structure created:
    ${BUCKET_NAME}/
      .private/
        models/
          {${succeeded} image files}
      public/
`);

  console.log(`  ADD THESE TO YOUR SECRETS TAB (exact values):\n`);
  console.log(`    PRIVATE_OBJECT_DIR         = /${BUCKET_NAME}/.private`);
  console.log(`    PUBLIC_OBJECT_SEARCH_PATHS = /${BUCKET_NAME}/public\n`);

  if (metadataWarn > 0) {
    console.log(`  ${metadataWarn} file(s) uploaded but ACL not set — re-upload via admin panel if needed.\n`);
  }
  if (failed > 0) {
    console.log(`  ${failed} file(s) failed. Safe to re-run.\n`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
