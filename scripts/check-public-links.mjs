#!/usr/bin/env node
/**
 * check-public-links.mjs — every link a developer follows from this repository must resolve for a developer.
 *
 * This kit is the PUBLIC face of a substrate whose source repositories are private. The failure this prevents is
 * specific and easy to commit: a doc here links to `github.com/agentictrustlabs/<private repo>/blob/...`, which
 * renders fine for anyone with access and 404s for everyone else. It happened the day the operator guides were
 * written — three public pages pointed into a private repo.
 *
 * The rule: a public document links to a public repository, to npm, or to the site. Private repositories may be
 * NAMED (they are part of the honest picture) but never linked.
 *
 *   node scripts/check-public-links.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Repositories under the org that are NOT world-readable. Add one here the day it is created, not the day it leaks. */
const PRIVATE_REPOS = ['agenticprimitives', 'skills', 'engage', 'ap-demos', 'ap-discovery'];
/** `agentic-primitives` (this kit) contains `agenticprimitives` as a substring only when hyphen-free — match exactly. */
const linkRe = /https?:\/\/github\.com\/agentictrustlabs\/([A-Za-z0-9._-]+)/g;

const roots = ['docs', 'skills', '.'];
const files = [];
const walk = (d, depth = 0) => {
  for (const e of readdirSync(d)) {
    if (e === 'node_modules' || e === '.git' || e.startsWith('.next')) continue;
    const p = join(d, e);
    if (statSync(p).isDirectory()) { if (depth < 4) walk(p, depth + 1); }
    else if (e.endsWith('.md')) files.push(p);
  }
};
for (const r of roots) { try { r === '.' ? readdirSync(r).filter((f) => f.endsWith('.md')).forEach((f) => files.push(f)) : walk(r); } catch { /* absent */ } }

const bad = [];
for (const f of [...new Set(files)]) {
  const text = readFileSync(f, 'utf8');
  for (const [, repo] of text.matchAll(linkRe)) {
    if (PRIVATE_REPOS.includes(repo)) bad.push(`${relative('.', f)} → github.com/agentictrustlabs/${repo}`);
  }
}

if (bad.length) {
  console.error(`✗ check:public-links — ${bad.length} link(s) into a private repository:\n`);
  for (const b of [...new Set(bad)].sort()) console.error(`  ${b}`);
  console.error(`\nA reader without access sees a 404. Link the public copy (this kit, ap-home, ap-town, npm, agenticprimitives.dev)`);
  console.error(`or name the repository without linking it.`);
  process.exit(1);
}
console.log(`✓ check:public-links — ${files.length} markdown file(s), no links into ${PRIVATE_REPOS.length} private repositories`);
