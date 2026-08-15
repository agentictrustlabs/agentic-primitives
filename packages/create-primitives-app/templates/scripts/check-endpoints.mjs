#!/usr/bin/env node
// Are the live rails reachable, and do they still answer the way docs/live-endpoints.md says?
//
// This is the check an AI assistant cannot perform by reading the repo. The three services are
// real deployments that change; a doc that drifts from them is worse than no doc, because it
// reads as authoritative. When this disagrees with the docs, believe the endpoint.
//
//   node scripts/check-endpoints.mjs
//
// Exits non-zero if a REQUIRED expectation fails. Notes are informational — several of these
// endpoints are *supposed* to refuse an unauthenticated caller, and a refusal in the documented
// shape is a pass.

const A2A = process.env.A2A_BASE ?? 'https://demo-a2a-production.richardpedersen3.workers.dev';
const MCP = process.env.MCP_BASE ?? 'https://demo-mcp-production.richardpedersen3.workers.dev';
const HOME = process.env.HOME_ORIGIN ?? 'https://www.impact-agent.me';

const TIMEOUT_MS = 20_000;

/** A principal that certainly has no storage — used to prove `status` answers rather than errors. */
const NOBODY = '0x0000000000000000000000000000000000000001';

const checks = [
  {
    name: 'A2A · health',
    required: true,
    run: () => get(`${A2A}/health`),
    expect: (r) => (r.body?.ok === true ? null : 'expected { ok: true }'),
  },
  {
    name: 'A2A · agent card',
    required: true,
    run: () => get(`${A2A}/.well-known/agent-card.json`),
    expect: (r) => (r.body?.protocolVersion ? null : 'expected an A2A agent card'),
  },
  {
    name: 'A2A · interactions status is a PUBLIC read',
    required: true,
    run: () => post(`${A2A}/interactions/${NOBODY}/status`, {}),
    // The point of this check: no session, still a 200 with a verdict. If this ever starts
    // requiring auth, every app's first-run screen breaks and this is where it shows up.
    expect: (r) =>
      r.status === 200 && typeof r.body?.granted === 'boolean' ? null : 'expected a 200 with { granted }',
  },
  {
    name: 'A2A · interactions rejects an unverifiable session',
    required: true,
    run: () => post(`${A2A}/interactions/${NOBODY}/channels.list`, { session: 'not-a-jwt' }),
    expect: (r) => (r.status === 401 ? null : `expected 401, got ${r.status}`),
  },
  {
    name: 'MCP · agentic-data routes require an edge assertion',
    required: false,
    // Documented behaviour, not a fault: your app reaches the vault THROUGH the A2A worker.
    run: () => post(`${A2A}/mcp/vault/get`, {}),
    expect: (r) =>
      r.status === 401 && /gateway_assertion/.test(JSON.stringify(r.body))
        ? null
        : `expected 401 gateway_assertion_required, got ${r.status}`,
  },
  {
    name: 'MCP · reachable',
    required: false,
    run: () => get(`${MCP}/health`).catch(() => ({ status: 0, body: null })),
    expect: (r) => (r.status > 0 ? null : 'no answer'),
  },
  {
    name: 'Home · OIDC discovery',
    required: true,
    run: () => get(`${HOME}/.well-known/openid-configuration`),
    expect: (r) => {
      const b = r.body ?? {};
      if (!b.issuer) return 'no issuer';
      if (!b.token_endpoint) return 'no token_endpoint';
      if (!b.jwks_uri) return 'no jwks_uri';
      if (!(b.code_challenge_methods_supported ?? []).includes('S256')) return 'PKCE S256 not advertised';
      return null;
    },
  },
  {
    name: 'Home · JWKS',
    required: true,
    run: () => get(`${HOME}/jwks`),
    expect: (r) => (Array.isArray(r.body?.keys) && r.body.keys.length > 0 ? null : 'no keys'),
  },
  {
    name: 'Home · client registry lookup',
    required: false,
    // 404 here is a legitimate answer: it means this deployment has no `commons-app` registered.
    // Reported rather than failed, because a fork will not have one.
    run: () => get(`${HOME}/connect/client-info?client_id=commons-app`),
    expect: (r) =>
      r.status === 200
        ? null
        : r.status === 404
          ? 'not registered on this Home (see docs/register-your-app.md)'
          : `unexpected status ${r.status}`,
  },
];

async function fetchJson(url, init) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, redirect: 'follow' });
    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
    return { status: res.status, body, text };
  } finally {
    clearTimeout(timer);
  }
}

const get = (url) => fetchJson(url, { headers: { accept: 'application/json' } });
const post = (url, body) =>
  fetchJson(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

let failed = 0;
let noted = 0;

console.log(`A2A   ${A2A}\nMCP   ${MCP}\nHome  ${HOME}\n`);

for (const check of checks) {
  let problem;
  try {
    problem = check.expect(await check.run());
  } catch (e) {
    problem = e instanceof Error ? e.message : String(e);
  }
  if (!problem) {
    console.log(`  ok    ${check.name}`);
  } else if (check.required) {
    failed++;
    console.log(`  FAIL  ${check.name}\n        ${problem}`);
  } else {
    noted++;
    console.log(`  note  ${check.name}\n        ${problem}`);
  }
}

console.log(
  `\n${checks.length - failed - noted} ok, ${noted} noted, ${failed} failed` +
    (failed ? '\n\nA required expectation changed. Believe the endpoint — fix docs/live-endpoints.md.' : ''),
);
process.exit(failed ? 1 : 0);
