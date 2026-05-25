// One-off: verify migration 0006 by listing the new columns and counting
// how many existing dealers have established_year populated.
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
  const cols = await c.query(`
    SELECT column_name, data_type, is_nullable, character_maximum_length
    FROM information_schema.columns
    WHERE table_name='dealers' AND column_name IN ('parent_dealer_id','established_year')
    ORDER BY column_name`);
  console.log('Columns:');
  console.table(cols.rows);

  const fk = await c.query(`
    SELECT constraint_name FROM information_schema.table_constraints
    WHERE table_name='dealers' AND constraint_name='dealers_parent_dealer_fk'`);
  console.log('FK present:', fk.rows.length > 0);

  const idx = await c.query(`SELECT indexname FROM pg_indexes WHERE tablename='dealers' AND indexname='dealers_parent_dealer_idx'`);
  console.log('Index present:', idx.rows.length > 0);

  const counts = await c.query(`
    SELECT
      COUNT(*) FILTER (WHERE established_year IS NOT NULL) AS with_year,
      COUNT(*) FILTER (WHERE established_year IS NULL) AS missing_year,
      COUNT(*) AS total
    FROM dealers`);
  console.log('Backfill counts:', counts.rows[0]);
} finally {
  c.release();
  await pool.end();
}
