/**
 * Diagnostic script — run on the new Replit to test uploads + database.
 * Usage: node scripts/test-upload.mjs
 */

const SIDECAR = 'http://127.0.0.1:1106';

console.log('=== Full Diagnostic ===\n');

// Step 1: Check PRIVATE_OBJECT_DIR
const privDir = process.env.PRIVATE_OBJECT_DIR;
console.log('1. PRIVATE_OBJECT_DIR:', privDir || '(NOT SET)');
if (!privDir) {
  console.log('   FAIL — Must be set in Secrets.\n');
  process.exit(1);
}
if (!privDir.startsWith('/')) {
  console.log('   WARNING — Missing leading /. Should be: /' + privDir);
}
console.log('   OK\n');

// Step 2: Check DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
console.log('2. DATABASE_URL:', dbUrl ? dbUrl.replace(/:[^@]+@/, ':****@') : '(NOT SET)');
if (!dbUrl) {
  console.log('   FAIL — DATABASE_URL is not available.');
  console.log('   The app CANNOT save image paths without a database.');
  console.log('');
  console.log('   To fix: Open Shell and run:');
  console.log('     echo "postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$PGDATABASE"');
  console.log('   Then add the output as DATABASE_URL in Secrets.\n');
  process.exit(1);
}
console.log('   OK\n');

// Step 3: Test database connection
console.log('3. Testing database connection...');
try {
  const pg = await import('pg');
  const pool = new pg.default.Pool({ connectionString: dbUrl });
  const result = await pool.query('SELECT 1 as test');
  console.log('   Connected! Query returned:', result.rows[0].test);
  
  // Check if tables exist
  const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
  console.log('   Tables found:', tables.rows.length);
  tables.rows.forEach(r => console.log('     -', r.tablename));
  
  if (tables.rows.length === 0) {
    console.log('   WARNING — No tables found! Run: npm run db:push');
  }
  
  await pool.end();
  console.log('   OK\n');
} catch (err) {
  console.log('   FAIL —', err.message);
  console.log('   The database is not reachable. Check DATABASE_URL.\n');
  process.exit(1);
}

// Step 4: Test sidecar
console.log('4. Testing sidecar...');
try {
  const res = await fetch(`${SIDECAR}/credential`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  console.log('   OK\n');
} catch (err) {
  console.log('   FAIL —', err.message, '\n');
  process.exit(1);
}

// Step 5: Test signed URL
const parts = (privDir.startsWith('/') ? privDir.slice(1) : privDir).split('/');
const bucketName = parts[0];
const prefix = parts.slice(1).join('/');

console.log('5. Testing signed URL (bucket:', bucketName + ')...');
try {
  const objectName = `${prefix}/models/test-diagnostic`;
  const res = await fetch(`${SIDECAR}/object-storage/signed-object-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: objectName,
      method: 'PUT',
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  console.log('   OK\n');
} catch (err) {
  console.log('   FAIL —', err.message, '\n');
  process.exit(1);
}

// Step 6: Test app server
console.log('6. Testing app server (localhost:5000)...');
try {
  const res = await fetch('http://localhost:5000/health');
  console.log('   Health check:', res.status);
  if (res.ok) {
    console.log('   OK\n');
  } else {
    console.log('   WARNING — Health check returned', res.status, '\n');
  }
} catch (err) {
  console.log('   FAIL — App not running:', err.message, '\n');
}

// Step 7: Test upload endpoint
console.log('7. Testing upload endpoint...');
try {
  const res = await fetch('http://localhost:5000/api/models/upload-url', { method: 'POST' });
  console.log('   Status:', res.status);
  if (res.status === 401) {
    console.log('   Got 401 (auth required) — EXPECTED and OK\n');
  } else {
    const text = await res.text();
    console.log('   Response:', text.substring(0, 200), '\n');
  }
} catch (err) {
  console.log('   FAIL —', err.message, '\n');
}

console.log('=== Summary ===');
console.log('If all steps passed, uploads should work from the admin panel.');
console.log('If step 2 or 3 failed, the database is the problem — uploads cannot');
console.log('save without it. Add DATABASE_URL to Secrets and restart the app.');
