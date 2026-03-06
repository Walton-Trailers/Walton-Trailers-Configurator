/**
 * IMPORT SCRIPT — Run this on the NEW Replit after copying image-export/ here.
 *
 * Prerequisites:
 *   1. The image-export/ folder must be in the root of this project.
 *   2. An Object Storage bucket must be created on this Replit account.
 *
 * Usage — pass the bucket name shown in the Object Storage tool:
 *   node import-images.mjs imagesbucket
 *
 * Or, if PRIVATE_OBJECT_DIR is already set in your environment:
 *   node import-images.mjs
 *
 * What it does:
 *   Uploads every image to the new Object Storage bucket using the same UUID
 *   filename as before, so all existing database paths work without any DB changes.
 */

import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

const SIDECAR_ENDPOINT = 'http://127.0.0.1:1106';
const INPUT_DIR = 'image-export';
const ACL_POLICY_METADATA_KEY = 'custom:aclPolicy';

// ─── Resolve private object dir ───────────────────────────────────────────────

// Priority: command-line arg > PRIVATE_OBJECT_DIR env var
const bucketArg = process.argv[2]; // e.g. "imagesbucket"

let privateObjectDir = process.env.PRIVATE_OBJECT_DIR || '';

if (bucketArg && !bucketArg.startsWith('--')) {
  // User passed bucket name directly — build the path the same way Replit does
  privateObjectDir = `/${bucketArg}/.private`;
  console.log(`🪣  Using bucket from argument: ${privateObjectDir}`);
} else if (privateObjectDir) {
  console.log(`🪣  Using bucket from PRIVATE_OBJECT_DIR: ${privateObjectDir}`);
} else {
  console.error(`
❌  No bucket specified.

    Pass your bucket name as an argument:
      node import-images.mjs imagesbucket

    Replace "imagesbucket" with whatever name is shown at the top of
    the Object Storage tool in your Replit sidebar.

    Or, if you know your PRIVATE_OBJECT_DIR value, set it in Secrets
    and re-run without arguments.
`);
  process.exit(1);
}

if (!privateObjectDir.endsWith('/')) privateObjectDir += '/';

// ─── Check manifest exists ────────────────────────────────────────────────────

const manifestPath = path.join(INPUT_DIR, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error(`❌  ${manifestPath} not found. Copy the image-export/ folder here first.`);
  process.exit(1);
}

// ─── GCS client ───────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseObjectPath(fullPath) {
  if (!fullPath.startsWith('/')) fullPath = `/${fullPath}`;
  const parts = fullPath.split('/');
  return { bucketName: parts[1], objectName: parts.slice(2).join('/') };
}

async function uploadFile(localFilePath, uuid) {
  const fullPath = `${privateObjectDir}models/${uuid}`;
  const { bucketName, objectName } = parseObjectPath(fullPath);

  const bucket = storageClient.bucket(bucketName);
  const file = bucket.file(objectName);

  await file.save(fs.readFileSync(localFilePath), { resumable: false });

  // Mark as public so the app can serve it (same as normal upload flow)
  await file.setMetadata({
    metadata: {
      [ACL_POLICY_METADATA_KEY]: JSON.stringify({ owner: 'admin', visibility: 'public' }),
    },
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entries = manifest.filter(e => !e.error);
  const skipped = manifest.length - entries.length;

  console.log(`📋  ${entries.length} file(s) to import${skipped ? `, ${skipped} skipped (export errors)` : ''}.`);

  // Quick connectivity check — try to access the bucket before processing all files
  console.log('🔌  Testing bucket connection…');
  try {
    const { bucketName } = parseObjectPath(privateObjectDir);
    const bucket = storageClient.bucket(bucketName);
    await bucket.exists(); // throws if auth/bucket is wrong
    console.log(`✅  Connected to bucket "${bucketName}"\n`);
  } catch (err) {
    console.error(`
❌  Could not connect to the bucket.

    Error: ${err.message}

    Things to check:
      1. The bucket name you passed matches exactly what's shown in the
         Object Storage tool (check for typos, it is case-sensitive).
      2. The Object Storage tool is open/active — it must be set up first.
      3. The app is running on Replit (the sidecar must be active).

    Current path attempted: ${privateObjectDir}
`);
    process.exit(1);
  }

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < entries.length; i++) {
    const { filename } = entries[i];
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
    console.log('All images are in the new bucket. Database paths are unchanged —');
    console.log('the app will display images immediately with no further changes.\n');
    console.log('You should also add these to your Secrets so the app can serve images:');
    const { bucketName } = parseObjectPath(privateObjectDir);
    console.log(`  PRIVATE_OBJECT_DIR        = /${bucketName}/.private`);
    console.log(`  PUBLIC_OBJECT_SEARCH_PATHS = /${bucketName}/public\n`);
  } else if (failed > 0) {
    console.log(`${failed} file(s) failed. Safe to re-run — already-uploaded files are simply overwritten.\n`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
