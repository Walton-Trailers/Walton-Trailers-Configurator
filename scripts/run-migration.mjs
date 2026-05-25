// Apply a SQL migration file against the configured DATABASE_URL.
// Usage: node scripts/run-migration.mjs <path-to-migration.sql>
//
// Loads .env.local for DATABASE_URL. Each top-level statement is executed
// inside a single transaction so the migration is atomic.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = false;

// Minimal .env loader (no extra deps). Reads KEY="value" / KEY=value lines.
function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/i);
    if (!m) continue;
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadEnv(path.join(root, '.env.local'));
loadEnv(path.join(root, '.env.production'));

const migrationArg = process.argv[2];
if (!migrationArg) {
  console.error('Usage: node scripts/run-migration.mjs <path-to-migration.sql>');
  process.exit(1);
}
const migrationPath = path.isAbsolute(migrationArg) ? migrationArg : path.join(root, migrationArg);
if (!fs.existsSync(migrationPath)) {
  console.error(`Migration file not found: ${migrationPath}`);
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set. Add it to .env.local or .env.production.');
  process.exit(1);
}

const sql = fs.readFileSync(migrationPath, 'utf8');
const host = (process.env.DATABASE_URL.match(/@([^/]+)\//) || [])[1] || '(unknown host)';

console.log(`Applying ${path.basename(migrationPath)}`);
console.log(`  host: ${host}`);
console.log(`  bytes: ${sql.length}`);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false },
});

const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query(sql);
  await client.query('COMMIT');
  console.log('Migration applied successfully.');
} catch (err) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('Migration FAILED — rolled back.');
  console.error(err?.message || err);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
