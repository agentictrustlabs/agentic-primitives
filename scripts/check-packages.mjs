#!/usr/bin/env node
// Every published @agenticprimitives/* package, imported for real.
//
// The catalog in docs/packages.md is prose and can drift. This resolves each package against the
// npm registry, and — for the ones this workspace installs — actually imports the entry point and
// counts its exports. An unpublished package, a package that no longer imports under Node's ESM
// resolver, or a version that moved shows up here rather than in someone's first build.
//
//   node scripts/check-packages.mjs            # registry check for all, import check for installed
//   node scripts/check-packages.mjs --imports  # import check only (fast, offline)

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

// Resolve from `packages/catalog` — the workspace member that depends on ALL of them. Resolving
// from this script's own directory would only ever see the root devDependencies, because pnpm
// isolates each package's tree.
//
// The lookup reads each package's own `package.json` rather than using `require.resolve`: these
// packages are ESM-only with `exports` maps that carry no `require` condition, so the CJS
// resolver reports "no exports main defined" for a package that is installed and perfectly fine.
const RESOLVE_FROM = process.env.CATALOG_DIR ?? join(import.meta.dirname, '..', 'packages', 'catalog');
const importsOnly = process.argv.includes('--imports');

/** The absolute entry-point URL for an installed package, or null if it is not installed. */
async function entryPointOf(name) {
  const dir = join(RESOLVE_FROM, 'node_modules', '@agenticprimitives', name);
  let manifest;
  try {
    manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
  } catch {
    return null;
  }
  // Walk the shapes these packages actually use, in the order Node would.
  const dot = manifest.exports?.['.'] ?? manifest.exports;
  const candidate =
    (typeof dot === 'string' ? dot : (dot?.import ?? dot?.default ?? dot?.node)) ??
    manifest.module ??
    manifest.main;
  const relative = typeof candidate === 'string' ? candidate : candidate?.default;
  // Installed, but deliberately has NO default entry point — `contracts` is the case: it ships
  // ABIs and deployment JSON under explicit subpaths and nothing at `.`. Reporting that as "not
  // installed" would be wrong, and reporting it as a broken import would be worse.
  if (typeof relative !== 'string') return { subpathOnly: true };
  return pathToFileURL(join(dir, relative)).href;
}

/** Every package in the @agenticprimitives scope, grouped the way docs/packages.md groups them. */
const CATALOG = {
  'Identity & accounts': [
    'types', 'agent-account', 'agent-naming', 'agent-profile', 'agent-relationships',
    'agent-resolution', 'account-custody', 'related-agents', 'organization', 'identity-directory',
    'identity-directory-adapters', 'browser-identity',
  ],
  'Authority & custody': [
    'delegation', 'delegated-signer', 'key-custody', 'key-authorization', 'agentic-authorization',
    'entitlements', 'ap-kms', 'vault', 'vault-authority', 'admission',
  ],
  'Connect & the Home': [
    'connect', 'connect-auth', 'connect-client', 'fedcm-idp', 'fedcm-rp', 'home',
  ],
  'Interaction & coordination': [
    'a2a', 'fabric', 'coordination', 'situations', 'orchestration', 'orchestration-anthropic',
    'service-agent',
  ],
  'Capability & tools': [
    'agent-skills', 'capability-claims', 'tool-policy', 'mcp-runtime', 'mcp-protocol', 'mcp-oauth',
    'surface-catalog',
  ],
  'Content & credentials': [
    'content-primitives', 'content-storage', 'verifiable-credentials', 'privacy-credentials',
    'attestations', 'provenance', 'verification-receipts', 'witness', 'ontology',
  ],
  'Commerce & fulfilment': [
    'payments', 'agreements', 'intent-marketplace', 'intent-resolver', 'fulfillment',
  ],
  'Infrastructure': [
    'audit', 'chain-state', 'chain-state-viem', 'contracts', 'edge-runtime', 'edge-cloudflare',
    'rate-control', 'rate-control-cloudflare', 'registry-kit', 'geo-features',
  ],
};

const ALL = Object.values(CATALOG).flat();

async function registryVersion(name) {
  const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(`@agenticprimitives/${name}`)}/latest`, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) return null;
  const body = await res.json();
  return typeof body.version === 'string' ? body.version : null;
}

/** Is this package installed in THIS workspace, and does its entry point actually import? */
async function importCheck(name) {
  const entry = await entryPointOf(name);
  if (!entry) return { installed: false };
  if (typeof entry === 'object' && entry.subpathOnly) return { installed: true, subpathOnly: true };
  try {
    const mod = await import(entry);
    return { installed: true, exports: Object.keys(mod).length };
  } catch (e) {
    return { installed: true, error: e instanceof Error ? e.message : String(e) };
  }
}

let missing = 0;
let broken = 0;
let installed = 0;

for (const [group, names] of Object.entries(CATALOG)) {
  console.log(`\n${group}`);
  for (const name of names) {
    const imp = await importCheck(name);
    const version = importsOnly ? null : await registryVersion(name);

    if (!importsOnly && !version) {
      missing++;
      console.log(`  ─  @agenticprimitives/${name.padEnd(30)} not published`);
      continue;
    }
    if (imp.error) {
      broken++;
      console.log(`  ✗  @agenticprimitives/${name.padEnd(30)} ${version ?? ''} — import failed: ${imp.error}`);
      continue;
    }
    if (imp.installed) {
      installed++;
      const detail = imp.subpathOnly ? 'subpaths only (no default entry)' : `${imp.exports} exports`;
      console.log(`  ✓  @agenticprimitives/${name.padEnd(30)} ${(version ?? '').padEnd(18)} ${detail}`);
    } else {
      console.log(`  ·  @agenticprimitives/${name.padEnd(30)} ${(version ?? '').padEnd(18)} (not installed here)`);
    }
  }
}

console.log(
  `\n${ALL.length} packages · ${installed} installed and importing · ${missing} unpublished · ${broken} broken`,
);
// An unpublished package is a fact about the upstream release train, not a failure of this repo —
// noted, never fatal. A package that IS published and does not import is a real problem.
process.exit(broken ? 1 : 0);
