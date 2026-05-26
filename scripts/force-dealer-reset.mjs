// One-shot: invalidate every dealer + dealer-user session and send a
// password-reset email to every active dealer. Use this after switching
// dealer login from Dealer ID to email so everyone is forced to set fresh
// credentials.
//
// Usage:
//   APP_URL=https://your-prod-url.vercel.app node scripts/force-dealer-reset.mjs
//
// APP_URL points at the deployed Vercel app — the script POSTs each
// dealer's email at /api/dealer/forgot-password, which uses the configured
// email provider to deliver the reset link. Sessions are cleared directly
// in the DB using DATABASE_URL from .env.local.

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

const appUrl = process.env.APP_URL?.replace(/\/$/, '');
if (!appUrl) {
  console.error('APP_URL env var is required. Example: APP_URL=https://your-prod.vercel.app node scripts/force-dealer-reset.mjs');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set (looked in .env.local).');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, ssl: { rejectUnauthorized: false } });
const c = await pool.connect();

try {
  // 1. Invalidate every active session so anyone currently logged in is kicked out.
  const sessionRes = await c.query('DELETE FROM dealer_sessions RETURNING id');
  const userSessionRes = await c.query('DELETE FROM dealer_user_sessions RETURNING id');
  console.log(`Cleared ${sessionRes.rowCount} dealer sessions, ${userSessionRes.rowCount} dealer-user sessions.`);

  // 2. Pull active dealers (skip archived — they can't log in anyway).
  const { rows: dealers } = await c.query(
    'SELECT id, dealer_id, dealer_name, email FROM dealers WHERE is_active = true AND email IS NOT NULL AND email != \'\''
  );
  console.log(`Sending password-reset emails to ${dealers.length} active dealer(s)…`);

  let sent = 0, failed = 0;
  for (const d of dealers) {
    try {
      const resp = await fetch(`${appUrl}/api/dealer/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: d.email }),
      });
      if (resp.ok) {
        console.log(`  ✓ ${d.dealer_id} ${d.dealer_name} <${d.email}>`);
        sent++;
      } else {
        console.warn(`  ✗ ${d.dealer_id} <${d.email}> — HTTP ${resp.status}`);
        failed++;
      }
    } catch (err) {
      console.warn(`  ✗ ${d.dealer_id} <${d.email}> — ${err?.message || err}`);
      failed++;
    }
  }
  console.log(`Done. ${sent} sent, ${failed} failed.`);
} finally {
  c.release();
  await pool.end();
}
