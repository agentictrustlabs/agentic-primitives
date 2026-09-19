#!/usr/bin/env node
// Generate the release artifacts from canonical sources.
//
// This is the assembly step the whole devkit exists for: it binds the published
// @agenticprimitives/* package versions, the released contract deployments, and the
// developer skill pack into one release-manifest.json, and emits per-contract
// deployment records + ABIs that applications resolve instead of copying addresses
// from prose.
//
// Canonical sources are in this repository: packages/catalog pins the published
// tree, and the installed @agenticprimitives/contracts package carries the released
// ABIs and deployment addresses.
//
//   node scripts/generate-release.mjs [--release <id>]

import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_VERSION = '1.0.0';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const SOURCE = ROOT;
const RELEASE = flag('--release', '2026.09.0-pilot.1');
const STATUS = 'pilot';

// Addresses in the deployments map that are operational accounts, not contracts.
// They get listed as roles, never as deployment records — an EOA has no runtime
// code and a record claiming otherwise would fail its own verification.
const ACCOUNT_ROLES = new Set(['deployer', 'governanceGuardian']);

// The chains the published contracts package carries deployment records for. Base Sepolia is the
// public reference testnet — anyone can read it, and doctor verifies runtime code there. The
// estate chain (34348) is where the mandate path (DigestBindingEnforcer, PaymentEnforcer) runs
// live behind a gated RPC; its records are resolved from the same artifact so a builder can
// name the addresses, but nothing here can reach the chain to verify them.
const CHAINS = [
  {
    file: 'deployments-base-sepolia.json',
    slug: 'base-sepolia',
    name: 'Base Sepolia',
    tier: 'reference-testnet',
    rpc: 'https://sepolia.base.org',
    explorer: 'https://sepolia.basescan.org',
    note: null,
  },
  {
    file: 'deployments-faithchain.json',
    slug: 'faithchain',
    name: 'Faithchain (estate chain)',
    tier: 'estate-private',
    rpc: null,
    explorer: null,
    note: 'Private estate chain behind a gated RPC. Addresses are resolved from the published package; runtime code is not verifiable from here.',
  },
];

function fail(msg) {
  console.error(`generate-release: ${msg}`);
  process.exit(1);
}

const contractsPkgDir = join(SOURCE, 'packages', 'catalog', 'node_modules', '@agenticprimitives', 'contracts');
if (!existsSync(join(contractsPkgDir, 'deployments-base-sepolia.json'))) {
  fail(`@agenticprimitives/contracts not installed — run pnpm install first`);
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const writeJson = (p, v) => {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`);
};

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { cwd: SOURCE, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

// ── 1. Package catalog ────────────────────────────────────────────────────────────────────────
const catalogPkg = readJson(join(SOURCE, 'packages', 'catalog', 'package.json'));
const rootPkg = readJson(join(SOURCE, 'package.json'));
const packages = Object.entries(catalogPkg.dependencies)
  .filter(([name]) => name.startsWith('@agenticprimitives/'))
  .map(([name, version]) => ({ name, version }))
  .sort((a, b) => a.name.localeCompare(b.name));

writeJson(join(ROOT, 'catalog', 'packages.json'), {
  schemaVersion: SCHEMA_VERSION,
  release: RELEASE,
  registry: 'https://registry.npmjs.org',
  count: packages.length,
  pinnedBy: 'agentic-primitives/packages/catalog/package.json',
  packages,
});

// ── 2. Contract artifacts + deployment records ────────────────────────────────────────────────
const contractsPkg = readJson(join(contractsPkgDir, 'package.json'));

// ABIs, copied from the published package so the devkit serves the same artifact
// applications install — never a re-typed copy.
const abiSrcDir = join(contractsPkgDir, 'dist', 'abi');
const abiOutDir = join(ROOT, 'contracts', 'abis');
rmSync(abiOutDir, { recursive: true, force: true });
mkdirSync(abiOutDir, { recursive: true });
const abiFiles = new Map();
for (const f of readdirSync(abiSrcDir).filter((f) => f.endsWith('.json'))) {
  copyFileSync(join(abiSrcDir, f), join(abiOutDir, f));
  abiFiles.set(f.replace(/\.json$/, ''), f);
}

const pascal = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// Logical names whose ABI file does not follow the simple PascalCase rule.
const ABI_ALIASES = {
  agentAccountImplementation: 'AgentAccount',
  agentNameResolver: 'AgentNameAttributeResolver',
  permissionlessSubregistry: 'PermissionlessSubregistry',
  permissionlessSubregistryDemoAgent: null,
  entryPoint: null, // canonical ERC-4337 EntryPoint — its ABI ships with account-abstraction, not here
  timelockController: null, // OpenZeppelin TimelockController — its ABI ships with openzeppelin-contracts
  mockUsdc: 'MockUSDC',
};

// The published map is flat except for one nested object: the typed-suffix subregistries
// (`.me`, `.org`, `.team`, `.svc`, `.treasury`, …), one PermissionlessSubregistry each. They are
// flattened to `permissionlessSubregistries.<suffix>` so every record is one address.
function flattenDeployments(deployed) {
  const out = [];
  for (const [key, value] of Object.entries(deployed)) {
    if (key === 'chainId') continue;
    if (value && typeof value === 'object') {
      for (const [suffix, address] of Object.entries(value)) {
        out.push([`${key}.${suffix}`, String(address), 'PermissionlessSubregistry']);
      }
      continue;
    }
    out.push([key, String(value), null]);
  }
  return out.sort(([a], [b]) => a.localeCompare(b));
}

rmSync(join(ROOT, 'contracts', 'deployments'), { recursive: true, force: true });

const supportedChains = [];
const contractReleases = [];
const catalogContracts = [];
for (const chain of CHAINS) {
  const file = join(contractsPkgDir, chain.file);
  if (!existsSync(file)) fail(`${chain.file} missing from ${contractsPkg.name}@${contractsPkg.version}`);
  const deployed = readJson(file);
  const chainId = Number(deployed.chainId);
  const caip2 = `eip155:${chainId}`;
  const deploymentSetId = `${chain.slug}-${RELEASE.split('-')[0]}`;
  const chainInfo = { caip2, chainId, name: chain.name };
  const deployDir = join(ROOT, 'contracts', 'deployments', caip2.replace(':', '-'), deploymentSetId);
  mkdirSync(deployDir, { recursive: true });

  const records = [];
  const roles = [];
  for (const [logicalName, address, forcedAbi] of flattenDeployments(deployed)) {
    if (ACCOUNT_ROLES.has(logicalName)) {
      roles.push({ role: logicalName, address, kind: 'account' });
      continue;
    }
    const abiName =
      forcedAbi ??
      (logicalName in ABI_ALIASES
        ? ABI_ALIASES[logicalName]
        : abiFiles.has(pascal(logicalName))
          ? pascal(logicalName)
          : null);
    const abiRel = abiName && abiFiles.has(abiName) ? `contracts/abis/${abiFiles.get(abiName)}` : null;

    const record = {
      $schema: '../../../../schemas/contract-deployment.schema.json',
      schemaVersion: SCHEMA_VERSION,
      logicalName,
      canonicalId: `${caip2}/${logicalName}@${deploymentSetId}`,
      contractVersion: contractsPkg.version,
      status: STATUS,
      chain: chainInfo,
      address,
      proxy: null,
      source: {
        package: contractsPkg.name,
        packageVersion: contractsPkg.version,
        repository: contractsPkg.repository?.url ?? null,
        recordedFrom: chain.file,
      },
      compiler: {
        toolchain: 'foundry',
        // Not restated here: the published package's build metadata is the source of
        // truth, and a value copied into this record could drift from it.
        details: 'see @agenticprimitives/contracts build metadata',
      },
      artifacts: {
        abi: abiRel,
        abiSha256: abiRel ? sha256(readFileSync(join(ROOT, abiRel))) : null,
      },
      deployment: {
        deployer: deployed.deployer ?? null,
        transactionHash: null,
        blockNumber: null,
        note: 'tx/block provenance lives in the canonical deploy pipeline; this record is resolved from the published package',
      },
      verification: {
        runtimeCodePresent: null,
        lastCheckedAt: null,
        method: chain.rpc
          ? 'scripts/doctor.mjs --verify-code (eth_getCode against the public RPC)'
          : 'not verifiable from this kit — the chain has no public RPC',
      },
    };
    writeJson(join(deployDir, `${logicalName}.json`), record);
    records.push({ logicalName, address, abi: abiRel });
  }

  writeJson(join(deployDir, 'index.json'), {
    schemaVersion: SCHEMA_VERSION,
    deploymentSet: deploymentSetId,
    release: RELEASE,
    status: STATUS,
    chain: chainInfo,
    tier: chain.tier,
    rpc: chain.rpc,
    explorer: chain.explorer,
    ...(chain.note ? { note: chain.note } : {}),
    source: { package: contractsPkg.name, version: contractsPkg.version, file: chain.file },
    contracts: records,
    roles,
  });

  supportedChains.push({ caip2, chainId, name: chain.name, tier: chain.tier, deploymentRelease: deploymentSetId });
  contractReleases.push({ caip2, deploymentSet: deploymentSetId, contracts: records.length, roles: roles.length });
  for (const r of records) catalogContracts.push({ ...r, chain: caip2 });
  console.log(`  ${chain.name}: ${records.length} records + ${roles.length} roles (${deploymentSetId})`);
}

writeJson(join(ROOT, 'catalog', 'contracts.json'), {
  schemaVersion: SCHEMA_VERSION,
  release: RELEASE,
  deploymentSets: Object.fromEntries(supportedChains.map((c) => [c.caip2, c.deploymentRelease])),
  count: catalogContracts.length,
  contracts: catalogContracts,
});

// ── 3. Skill pack ─────────────────────────────────────────────────────────────────────────────
const skillsDir = join(ROOT, 'skills');
const skills = readdirSync(skillsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

writeJson(join(ROOT, 'catalog', 'skills.json'), {
  schemaVersion: SCHEMA_VERSION,
  release: RELEASE,
  pack: 'developer-core',
  packVersion: '1.0.0',
  kind: 'developer',
  note: 'Developer skills guide Claude/Cursor while building. Runtime skills are a separate, authority-gated surface.',
  skills,
});

// ── 4. The release manifest ───────────────────────────────────────────────────────────────────
const sourceCommit = git('rev-parse HEAD');
const sourceCommitTime = git('show -s --format=%cI HEAD');

writeJson(join(ROOT, 'release-manifest.json'), {
  $schema: './schemas/release-manifest.schema.json',
  schemaVersion: SCHEMA_VERSION,
  release: RELEASE,
  status: STATUS,
  generatedAt: sourceCommitTime ?? new Date().toISOString(),
  sources: {
    'agentic-primitives': {
      repository: 'https://github.com/agentictrustlabs/agentic-primitives',
      commit: sourceCommit,
      role: 'public starter — package pins, wrappers, docs, example app',
    },
  },
  compatibility: {
    node: rootPkg.engines?.node ?? '>=20',
    pnpm: '>=9',
    typescript: rootPkg.devDependencies?.typescript ?? null,
    viem: '^2.52.2',
  },
  supportedChains,
  endpoints: {
    home: 'https://www.impact-agent.me',
    a2a: 'https://demo-a2a-production.richardpedersen3.workers.dev',
    mcp: 'https://demo-mcp-production.richardpedersen3.workers.dev',
    note: 'Reference testnet deployments. Learn the model here; do not put real value through it.',
  },
  packages,
  contractReleases: [
    {
      sourcePackage: contractsPkg.name,
      sourceVersion: contractsPkg.version,
      deploymentSets: Object.fromEntries(contractReleases.map((r) => [r.caip2, r.deploymentSet])),
      contracts: catalogContracts.length,
      perChain: contractReleases,
    },
  ],
  ontologyProfiles: [],
  skillPacks: [{ name: 'developer-core', version: '1.0.0', skills: skills.length }],
});

// ── 5. Integrity: artifact manifest + checksums ───────────────────────────────────────────────
const INTEGRITY_ROOTS = ['release-manifest.json', 'catalog', 'contracts', 'schemas', 'skills'];
const artifactEntries = [];
function walkFiles(p) {
  const st = statSync(p);
  if (st.isDirectory()) {
    for (const name of readdirSync(p).sort()) walkFiles(join(p, name));
  } else {
    const rel = relative(ROOT, p).replaceAll('\\', '/');
    artifactEntries.push({ path: rel, sha256: sha256(readFileSync(p)), bytes: st.size });
  }
}
for (const root of INTEGRITY_ROOTS) walkFiles(join(ROOT, root));

writeJson(join(ROOT, 'ARTIFACT-MANIFEST.json'), {
  schemaVersion: SCHEMA_VERSION,
  release: RELEASE,
  files: artifactEntries.length,
  artifacts: artifactEntries,
});
writeFileSync(
  join(ROOT, 'CHECKSUMS.sha256'),
  artifactEntries.map((e) => `${e.sha256}  ${e.path}`).join('\n') + '\n',
);

console.log(`release ${RELEASE}`);
console.log(`  packages   ${packages.length}`);
console.log(`  contracts  ${catalogContracts.length} records across ${supportedChains.length} chains`);
console.log(`  abis       ${abiFiles.size}`);
console.log(`  skills     ${skills.length} (developer-core)`);
console.log(`  integrity  ${artifactEntries.length} files hashed`);
