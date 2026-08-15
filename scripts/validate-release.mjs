#!/usr/bin/env node
// Offline release validation. Fails CI when any release surface is missing,
// malformed, or out of sync with another. Network checks live in doctor.mjs.

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const bad = (msg) => {
  failures += 1;
  console.error(`  FAIL ${msg}`);
};
const section = (name) => console.log(`\n${name}`);
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// ── required files ──
section('required files');
const required = [
  'README.md', 'AGENTS.md', 'CLAUDE.md', 'SECURITY.md',
  'release-manifest.json',
  'catalog/packages.json', 'catalog/contracts.json', 'catalog/skills.json',
  'schemas/release-manifest.schema.json',
  'schemas/contract-deployment.schema.json',
  'schemas/agentic-lock.schema.json',
  'docs/release-binding.md',
  'llms.txt',
];
for (const rel of required) {
  if (!existsSync(join(ROOT, rel))) bad(`missing ${rel}`);
}
if (failures === 0) console.log(`  ok (${required.length} files)`);

// Minimal structural check against a schema: required keys, enums, address patterns.
// The schemas stay the authoritative contract; this catches drift without a
// validator dependency.
function checkRequired(obj, schema, label) {
  for (const key of schema.required ?? []) {
    if (!(key in obj)) bad(`${label}: missing required key "${key}"`);
  }
}

// ── release manifest ──
section('release-manifest.json');
const manifestSchema = readJson('schemas/release-manifest.schema.json');
const manifest = readJson('release-manifest.json');
checkRequired(manifest, manifestSchema, 'release-manifest');
if (!manifestSchema.properties.status.enum.includes(manifest.status)) {
  bad(`release-manifest: status "${manifest.status}" not in schema enum`);
}
if (manifest.exampleOnly) bad('release-manifest: exampleOnly is set on a real manifest');
if (!Array.isArray(manifest.packages) || manifest.packages.length === 0) {
  bad('release-manifest: packages is empty');
}
if (failures === 0) console.log(`  ok — release ${manifest.release} (${manifest.status}), ${manifest.packages.length} packages`);

// ── catalog ↔ manifest coherence ──
section('catalog coherence');
const before = failures;
const pkgCatalog = readJson('catalog/packages.json');
const manifestPins = new Map(manifest.packages.map((p) => [p.name, p.version]));
if (pkgCatalog.packages.length !== manifest.packages.length) {
  bad(`catalog/packages.json has ${pkgCatalog.packages.length} packages, manifest has ${manifest.packages.length}`);
}
for (const { name, version } of pkgCatalog.packages) {
  if (manifestPins.get(name) !== version) bad(`package pin drift: ${name} catalog=${version} manifest=${manifestPins.get(name)}`);
  if (!name.startsWith('@agenticprimitives/')) bad(`unexpected package in catalog: ${name}`);
}
const skillCatalog = readJson('catalog/skills.json');
const skillDirs = readdirSync(join(ROOT, 'skills'), { withFileTypes: true })
  .filter((e) => e.isDirectory()).map((e) => e.name).sort();
if (JSON.stringify(skillCatalog.skills) !== JSON.stringify(skillDirs)) {
  bad('catalog/skills.json does not match skills/ directory listing');
}
if (failures === before) console.log('  ok — packages and skills catalogs match the manifest');

// ── deployment records ──
section('contract deployment records');
const depSchema = readJson('schemas/contract-deployment.schema.json');
const addressRe = new RegExp(depSchema.properties.address.pattern);
let recordCount = 0;
const seenAddresses = new Map();
for (const chain of manifest.supportedChains) {
  const setId = chain.deploymentRelease;
  const dir = join(ROOT, 'contracts', 'deployments', chain.caip2.replace(':', '-'), setId);
  if (!existsSync(dir)) { bad(`missing deployment set directory for ${chain.caip2} (${setId})`); continue; }
  const index = readJson(relative(ROOT, join(dir, 'index.json')));
  for (const entry of index.contracts) {
    const rel = relative(ROOT, join(dir, `${entry.logicalName}.json`));
    if (!existsSync(join(ROOT, rel))) { bad(`index lists ${entry.logicalName} but ${rel} is missing`); continue; }
    const record = readJson(rel);
    recordCount += 1;
    checkRequired(record, depSchema, entry.logicalName);
    if (!addressRe.test(record.address)) bad(`${entry.logicalName}: bad address ${record.address}`);
    if (record.chain.chainId !== chain.chainId) bad(`${entry.logicalName}: chainId mismatch`);
    if (!depSchema.properties.status.enum.includes(record.status)) bad(`${entry.logicalName}: bad status ${record.status}`);
    if (seenAddresses.has(record.address)) {
      bad(`${entry.logicalName}: address duplicated with ${seenAddresses.get(record.address)}`);
    }
    seenAddresses.set(record.address, entry.logicalName);
    if (record.artifacts.abi) {
      const abiPath = join(ROOT, record.artifacts.abi);
      if (!existsSync(abiPath)) bad(`${entry.logicalName}: ABI file missing ${record.artifacts.abi}`);
      else if (sha256(readFileSync(abiPath)) !== record.artifacts.abiSha256) {
        bad(`${entry.logicalName}: ABI sha256 does not match record`);
      }
    }
  }
}
if (failures === before) console.log(`  ok — ${recordCount} records, addresses unique, ABI digests match`);

// ── skills ──
section('skills');
const beforeSkills = failures;
for (const name of skillDirs) {
  const p = join(ROOT, 'skills', name, 'SKILL.md');
  try {
    const text = readFileSync(p, 'utf8');
    if (!text.startsWith('---\n')) throw new Error('missing frontmatter');
    if (!text.includes(`name: ${name}\n`)) throw new Error('frontmatter name does not match folder');
    if (!text.includes('description: ')) throw new Error('missing description');
    if (text.split('\n').length > 500) throw new Error('SKILL.md exceeds 500 lines — move detail to references/');
  } catch (error) {
    bad(`skill ${name}: ${error.message}`);
  }
}
if (failures === beforeSkills) console.log(`  ok — ${skillDirs.length} skills, frontmatter valid, all under 500 lines`);

// ── integrity manifest ──
section('integrity');
const beforeIntegrity = failures;
const artifactManifest = readJson('ARTIFACT-MANIFEST.json');
for (const { path: rel, sha256: expected } of artifactManifest.artifacts) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) { bad(`hashed file missing: ${rel}`); continue; }
  if (sha256(readFileSync(p)) !== expected) bad(`checksum drift: ${rel} — rerun generate-release`);
}
if (failures === beforeIntegrity) console.log(`  ok — ${artifactManifest.artifacts.length} files match ARTIFACT-MANIFEST.json`);

// ── pins agree with the workspace overrides ──
section('workspace overrides');
const beforeOverrides = failures;
const rootPkg = readJson('package.json');
for (const [name, version] of Object.entries(rootPkg.pnpm?.overrides ?? {})) {
  if (!name.startsWith('@agenticprimitives/')) continue;
  const pinned = manifestPins.get(name);
  if (pinned && pinned !== version) {
    bad(`pnpm override ${name}@${version} disagrees with release pin ${pinned}`);
  }
}
if (failures === beforeOverrides) console.log('  ok — pnpm.overrides agree with the release pins');

console.log(failures === 0 ? '\nRelease validation passed.' : `\n${failures} failure(s).`);
process.exit(failures === 0 ? 0 : 1);
