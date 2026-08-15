#!/usr/bin/env node
// Live diagnosis of this release against the world it points at.
//
//   node scripts/doctor.mjs                 registry pins + live endpoints
//   node scripts/doctor.mjs --verify-code   also eth_getCode every deployment record
//   node scripts/doctor.mjs --offline       skip everything that needs a network
//
// validate-release.mjs answers "is the release internally consistent";
// doctor answers "does the outside world still match it". Prints no secrets —
// it holds none.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const OFFLINE = args.includes('--offline');
const VERIFY_CODE = args.includes('--verify-code');

const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
let failures = 0;
let warnings = 0;
const fail = (msg) => { failures += 1; console.log(`  FAIL ${msg}`); };
const warn = (msg) => { warnings += 1; console.log(`  warn ${msg}`); };
const ok = (msg) => console.log(`  ok   ${msg}`);

const manifest = readJson('release-manifest.json');
console.log(`doctor — release ${manifest.release} (${manifest.status}), node ${process.version}`);

// ── node engine ──
const wanted = Number((manifest.compatibility.node ?? '>=20').replace(/[^\d.]/g, '').split('.')[0]);
const running = Number(process.versions.node.split('.')[0]);
if (running < wanted) fail(`node ${manifest.compatibility.node} required, running ${process.versions.node}`);
else ok(`node ${process.versions.node} satisfies ${manifest.compatibility.node}`);

async function fetchJson(url, init) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000), ...init });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ── npm registry: every pinned version must exist, exactly ──
async function checkRegistry() {
  console.log('\nnpm registry');
  const results = [];
  const queue = [...manifest.packages];
  const workers = Array.from({ length: 8 }, async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      try {
        const meta = await fetchJson(`https://registry.npmjs.org/${encodeURIComponent(item.name)}`);
        if (!meta.versions?.[item.version]) results.push(`${item.name}@${item.version} is pinned but not published`);
      } catch (error) {
        results.push(`${item.name}: registry lookup failed (${error.message})`);
      }
    }
  });
  await Promise.all(workers);
  if (results.length === 0) ok(`all ${manifest.packages.length} pinned package versions exist on npm`);
  else for (const r of results) fail(r);
}

// ── live endpoints ──
async function checkEndpoints() {
  console.log('\nlive endpoints');
  const { home, a2a, mcp } = manifest.endpoints;
  try {
    const oidc = await fetchJson(`${home}/.well-known/openid-configuration`);
    if (oidc.issuer) ok(`home OIDC discovery: ${oidc.issuer}`);
    else fail('home OIDC discovery returned no issuer');
  } catch (error) {
    fail(`home unreachable: ${error.message}`);
  }
  for (const [name, base] of [['a2a', a2a], ['mcp', mcp]]) {
    try {
      const res = await fetch(`${base}/.well-known/agent-card.json`, { signal: AbortSignal.timeout(15000) });
      if (res.ok) { ok(`${name} agent card reachable`); continue; }
      const ping = await fetch(base, { signal: AbortSignal.timeout(15000) });
      if (ping.status < 500) ok(`${name} responding (HTTP ${ping.status})`);
      else fail(`${name} returned HTTP ${ping.status}`);
    } catch (error) {
      fail(`${name} unreachable: ${error.message}`);
    }
  }
}

// ── on-chain: runtime code must exist at every recorded address ──
async function checkRuntimeCode() {
  console.log('\non-chain runtime code');
  for (const chain of manifest.supportedChains) {
    const setDir = `contracts/deployments/${chain.caip2.replace(':', '-')}/${chain.deploymentRelease}`;
    const index = readJson(`${setDir}/index.json`);
    const calls = index.contracts.map((c, i) => ({
      jsonrpc: '2.0', id: i, method: 'eth_getCode', params: [c.address, 'latest'],
    }));
    try {
      const responses = await fetchJson(index.rpc, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(calls),
      });
      const byId = new Map(responses.map((r) => [r.id, r]));
      let present = 0;
      index.contracts.forEach((c, i) => {
        const code = byId.get(i)?.result;
        if (typeof code === 'string' && code.length > 2) present += 1;
        else fail(`${c.logicalName} has no runtime code at ${c.address} on ${chain.caip2}`);
      });
      if (present === index.contracts.length) {
        ok(`${present}/${index.contracts.length} contracts have runtime code on ${chain.name} (${index.rpc})`);
      }
    } catch (error) {
      warn(`RPC batch check failed on ${chain.caip2}: ${error.message}`);
    }
  }
}

if (OFFLINE) {
  console.log('\n(offline — skipped registry, endpoint, and on-chain checks)');
} else {
  await checkRegistry();
  await checkEndpoints();
  if (VERIFY_CODE) await checkRuntimeCode();
  else console.log('\n(on-chain code check skipped — pass --verify-code to run it)');
}

console.log(
  failures === 0
    ? `\nDoctor: healthy${warnings ? ` (${warnings} warning${warnings > 1 ? 's' : ''})` : ''}.`
    : `\nDoctor: ${failures} failure(s), ${warnings} warning(s).`,
);
process.exit(failures === 0 ? 0 : 1);
