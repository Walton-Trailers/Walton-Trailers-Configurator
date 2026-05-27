// One-off: dump the most recent reservation snapshot_fields so we can
// see what Airtable column names are actually being returned and fix
// the server-side fallback chain.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = false;

function loadEnv(p) {
  if (!fs.existsSync(p)) return;
  for (const raw of fs.readFileSync(p, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/i);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadEnv(path.join(root, '.env.local'));

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, ssl: { rejectUnauthorized: false } });
const c = await pool.connect();
try {
  const { rows } = await c.query(
    `SELECT id, stock_number, model, snapshot_fields, created_at
     FROM inventory_reservations
     ORDER BY created_at DESC
     LIMIT 5`,
  );
  for (const r of rows) {
    console.log(`\nreservation #${r.id}  stock_number=${r.stock_number}  model=${r.model}  at=${r.created_at}`);
    console.log('  snapshot field keys:', Object.keys(r.snapshot_fields || {}));
    console.log('  snapshot field values:', JSON.stringify(r.snapshot_fields, null, 2));
  }
} finally {
  c.release();
  await pool.end();
}
