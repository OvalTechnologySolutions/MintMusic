#!/usr/bin/env node
/**
 * Sync MintMusic production env vars from Neon + local app secrets to Railway (API) and Vercel (web).
 *
 * Prerequisites:
 *   neon link   (project MintMusic already linked via .neon)
 *   railway login && railway link   (API service)
 *   vercel login && vercel link     (web project)
 *
 * Usage:
 *   node scripts/sync-production-env.mjs           # dry-run: print what would be set
 *   node scripts/sync-production-env.mjs --apply   # push to Railway + Vercel when logged in
 */

import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const apiEnvPath = resolve(root, 'apps/api/.env');
const apply = process.argv.includes('--apply');

function run(cmd, opts = {}) {
  return spawnSync(cmd, { shell: true, encoding: 'utf8', cwd: root, ...opts });
}

function hasCmd(name) {
  return run(`command -v ${name}`).status === 0;
}

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function pullNeonEnv() {
  if (!existsSync(resolve(root, '.neon'))) {
    console.error('Missing .neon — run: neon link --project-id dark-king-03663821 --org-id org-dry-grass-17126034');
    process.exit(1);
  }
  console.log('→ Pulling Neon postgres + object-storage into apps/api/.env');
  const res = run(
    'npx neon@latest env pull --file apps/api/.env -s postgres -s object-storage',
    { stdio: 'pipe' }
  );
  if (res.status !== 0) {
    console.warn('⚠ Neon env pull failed (token may be expired). Using existing apps/api/.env.');
    console.warn('  Refresh with: npx neon auth && node scripts/sync-production-env.mjs');
    if (!existsSync(apiEnvPath)) process.exit(1);
  } else if (res.stdout) {
    process.stdout.write(res.stdout);
  }
}

function buildRailwayVars(local) {
  const neonKeys = [
    'DATABASE_URL',
    'DATABASE_URL_UNPOOLED',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_ENDPOINT_URL_S3',
    'AWS_REGION',
    'NEON_BRANCH',
  ];
  const appKeys = [
    'INTERNAL_API_SECRET',
    'PLAYBACK_JWT_SECRET',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'TASTE_TOKEN_ENCRYPTION_KEY',
    'REDIS_URL',
  ];
  const vars = {
    NODE_ENV: 'production',
    CORS_ORIGIN: 'https://mintmusic.ai',
    WEB_URL: 'https://mintmusic.ai',
    API_VERSION: '0.2.0',
    STRIPE_CONNECT_RETURN_PATH: '/settings?tab=payments',
    DRM_PROVIDER: 'mock',
    MEDIA_MAX_BYTES: '524288000',
    PLAYBACK_TOKEN_TTL_SECONDS: '900',
  };
  for (const k of [...neonKeys, ...appKeys]) {
    if (local[k]) vars[k] = local[k];
  }
  return vars;
}

function buildVercelVars(local, apiLocal) {
  const secretKeys = [
    'AUTH_SECRET',
    'INTERNAL_API_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
  ];
  const vars = {
    AUTH_URL: 'https://mintmusic.ai',
    NEXT_PUBLIC_APP_URL: 'https://mintmusic.ai',
    NEXT_PUBLIC_API_URL: 'https://api.mintmusic.ai',
    NEXT_PUBLIC_CHAIN_ID: local.NEXT_PUBLIC_CHAIN_ID ?? '11155111',
  };
  for (const k of secretKeys) {
    if (local[k]) vars[k] = local[k];
  }
  // Fallback INTERNAL_API_SECRET from API env if web .env.local lacks it
  if (!vars.INTERNAL_API_SECRET && apiLocal.INTERNAL_API_SECRET) {
    vars.INTERNAL_API_SECRET = apiLocal.INTERNAL_API_SECRET;
  }
  return vars;
}

function setRailway(vars) {
  if (!hasCmd('railway')) {
    console.log('\n⚠ railway CLI not installed. Install: npm i -g @railway/cli');
    return false;
  }
  const whoami = run('railway whoami');
  if (whoami.status !== 0) {
    console.log('\n⚠ Railway not logged in. Run: railway login && railway link');
    return false;
  }
  console.log('\n→ Setting Railway variables (API)');
  for (const [key, value] of Object.entries(vars)) {
    if (!value) {
      console.log(`  skip ${key} (empty)`);
      continue;
    }
    const escaped = value.replace(/'/g, "'\\''");
    const res = run(`railway variables set '${key}=${escaped}'`, { stdio: 'inherit' });
    if (res.status !== 0) return false;
  }
  return true;
}

function setVercel(vars) {
  if (!hasCmd('vercel')) {
    console.log('\n⚠ vercel CLI not installed. Use: npx vercel');
    return false;
  }
  const whoami = run('npx vercel whoami');
  if (whoami.status !== 0) {
    console.log('\n⚠ Vercel not logged in. Run: npx vercel login && npx vercel link');
    return false;
  }
  console.log('\n→ Setting Vercel environment variables (production)');
  for (const [key, value] of Object.entries(vars)) {
    if (!value) {
      console.log(`  skip ${key} (empty)`);
      continue;
    }
    // vercel env add requires stdin for value
    const res = spawnSync('npx', ['vercel', 'env', 'add', key, 'production', '--force'], {
      input: value,
      encoding: 'utf8',
      cwd: root,
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    if (res.status !== 0) return false;
  }
  return true;
}

function printPlan(label, vars) {
  console.log(`\n${label} (${Object.keys(vars).length} vars):`);
  for (const key of Object.keys(vars).sort()) {
    const val = vars[key];
    const preview = val?.length > 8 ? `${val.slice(0, 4)}…${val.slice(-4)}` : '(set)';
    console.log(`  ${key}=${preview}`);
  }
}

// ─── main ───
pullNeonEnv();
const apiLocal = parseEnvFile(apiEnvPath);
const webLocal = parseEnvFile(resolve(root, 'apps/web/.env.local'));

const railwayVars = buildRailwayVars(apiLocal);
const vercelVars = buildVercelVars(webLocal, apiLocal);

printPlan('Railway (API @ api.mintmusic.ai)', railwayVars);
printPlan('Vercel (Web @ mintmusic.ai)', vercelVars);

if (!apply) {
  console.log('\nDry run complete. Re-run with --apply to push vars after logging in:');
  console.log('  railway login && railway link');
  console.log('  npx vercel login && npx vercel link');
  console.log('  node scripts/sync-production-env.mjs --apply');
  process.exit(0);
}

const okRailway = setRailway(railwayVars);
const okVercel = setVercel(vercelVars);

if (okRailway) console.log('\n✓ Railway env synced');
if (okVercel) console.log('✓ Vercel env synced');
if (!okRailway && !okVercel) process.exit(1);
