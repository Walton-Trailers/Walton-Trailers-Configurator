// One-shot: invalidate every dealer + dealer-user session and send a
// password-reset email to every active dealer AND every active dealer-user.
// Use this after switching login identifiers (Dealer ID → email for dealers,
// username → email for dealer-users) so everyone is forced to set fresh
// credentials they actually know.
//
// Usage:
//   APP_URL=https://your-prod-url.vercel.app node scripts/force-dealer-reset.mjs
//
// APP_URL points at the deployed Vercel app — the script POSTs each
// account's email at /api/dealer/forgot-password (dealers) or
// /api/dealer/user/forgot-password (dealer-users), which uses the
// configured email provider to deliver the reset link. Sessions are
// cleared directly in the DB using DATABASE_URL from .env.local.

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
  console.log(`\nSending password-reset emails to ${dealers.length} active dealer(s)…`);

  let dealerSent = 0, dealerFailed = 0;
  for (const d of dealers) {
    try {
      const resp = await fetch(`${appUrl}/api/dealer/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: d.email }),
      });
      if (resp.ok) {
        console.log(`  ✓ ${d.dealer_id} ${d.dealer_name} <${d.email}>`);
        dealerSent++;
      } else {
        console.warn(`  ✗ ${d.dealer_id} <${d.email}> — HTTP ${resp.status}`);
        dealerFailed++;
      }
    } catch (err) {
      console.warn(`  ✗ ${d.dealer_id} <${d.email}> — ${err?.message || err}`);
      dealerFailed++;
    }
  }

  // 3. Pull active dealer-users (sub-users under a dealer account) and reset
  // their passwords too. Skip users whose parent dealer is archived — those
  // accounts can't log in regardless.
  const { rows: users } = await c.query(`
    SELECT u.id, u.email, u.first_name, u.last_name, d.dealer_id AS parent_dealer_id, d.dealer_name AS parent_dealer_name
    FROM dealer_users u
    JOIN dealers d ON d.id = u.dealer_id
    WHERE u.is_active = true
      AND d.is_active = true
      AND u.email IS NOT NULL
      AND u.email != ''
  `);
  console.log(`\nSending password-reset emails to ${users.length} active dealer-user(s)…`);

  let userSent = 0, userFailed = 0;
  for (const u of users) {
    try {
      const resp = await fetch(`${appUrl}/api/dealer/user/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u.email }),
      });
      if (resp.ok) {
        console.log(`  ✓ ${u.first_name} ${u.last_name} <${u.email}> (under ${u.parent_dealer_id} ${u.parent_dealer_name})`);
        userSent++;
      } else {
        console.warn(`  ✗ <${u.email}> — HTTP ${resp.status}`);
        userFailed++;
      }
    } catch (err) {
      console.warn(`  ✗ <${u.email}> — ${err?.message || err}`);
      userFailed++;
    }
  }

  console.log(`\nDone.`);
  console.log(`  Dealers:      ${dealerSent} sent, ${dealerFailed} failed`);
  console.log(`  Dealer-users: ${userSent} sent, ${userFailed} failed`);
} finally {
  c.release();
  await pool.end();
}
