/**
 * Diagnostic script — run on the new Replit to test if image uploads work.
 * Usage: node scripts/test-upload.mjs
 */

const SIDECAR = 'http://127.0.0.1:1106';

console.log('=== Upload Diagnostic ===\n');

// Step 1: Check PRIVATE_OBJECT_DIR
const privDir = process.env.PRIVATE_OBJECT_DIR;
console.log('1. PRIVATE_OBJECT_DIR:', privDir || '(NOT SET)');
if (!privDir) {
  console.log('   FAIL — This must be set for uploads to work.');
  console.log('   Add it to Secrets: /<your-bucket-name>/.private');
  process.exit(1);
}
console.log('   OK\n');

// Step 2: Parse bucket name
const parts = privDir.split('/').filter(Boolean);
const bucketName = parts[0];
const prefix = parts.slice(1).join('/');
console.log('2. Parsed bucket:', bucketName);
console.log('   Prefix:', prefix);
console.log('   OK\n');

// Step 3: Test sidecar connectivity
console.log('3. Testing sidecar at', SIDECAR, '...');
try {
  const credRes = await fetch(`${SIDECAR}/credential`);
  if (!credRes.ok) throw new Error(`HTTP ${credRes.status}`);
  const cred = await credRes.json();
  console.log('   Sidecar responded. Access token:', cred.access_token ? 'present' : 'MISSING');
  console.log('   OK\n');
} catch (err) {
  console.log('   FAIL — Sidecar not reachable:', err.message);
  console.log('   Make sure the app workflow is running.\n');
  process.exit(1);
}

// Step 4: Test signed URL generation
console.log('4. Requesting signed PUT URL...');
try {
  const objectName = `${prefix}/models/test-upload-diagnostic`;
  const body = {
    bucket_name: bucketName,
    object_name: objectName,
    method: 'PUT',
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  };
  const res = await fetch(`${SIDECAR}/object-storage/signed-object-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const { signed_url } = await res.json();
  console.log('   Got signed URL:', signed_url.substring(0, 80) + '...');
  console.log('   OK\n');

  // Step 5: Test actual upload
  console.log('5. Uploading test file...');
  const uploadRes = await fetch(signed_url, {
    method: 'PUT',
    body: Buffer.from('test-upload-diagnostic'),
    headers: { 'Content-Type': 'application/octet-stream' },
  });
  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`HTTP ${uploadRes.status}: ${text}`);
  }
  console.log('   Upload succeeded!');
  console.log('   OK\n');

} catch (err) {
  console.log('   FAIL —', err.message);
  console.log('   The bucket name might be wrong or the sidecar cannot sign for this bucket.\n');
  process.exit(1);
}

// Step 6: Test the app's upload endpoint
console.log('6. Testing app upload endpoint (http://localhost:5000/api/models/upload-url)...');
try {
  const res = await fetch('http://localhost:5000/api/models/upload-url', { method: 'POST' });
  const text = await res.text();
  console.log('   Status:', res.status);
  if (res.status === 401) {
    console.log('   Got 401 (login required) — this is EXPECTED for an authenticated endpoint.');
    console.log('   OK — The upload endpoint is working, you just need to be logged in.\n');
  } else if (res.ok) {
    console.log('   Response:', text.substring(0, 100));
    console.log('   OK\n');
  } else {
    console.log('   Response:', text.substring(0, 200));
    console.log('   This might indicate a problem.\n');
  }
} catch (err) {
  console.log('   FAIL — Could not reach the app:', err.message);
  console.log('   Make sure the app is running on port 5000.\n');
}

console.log('=== Diagnostic Complete ===');
console.log('If steps 1-5 all passed, uploads should work from the admin panel.');
console.log('If step 6 shows 401, that is normal — it just means auth is required.');
