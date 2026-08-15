#!/usr/bin/env node
// Copy live wrappers, docs, scripts, and AI rules into this package's templates/
// so `npx create-primitives-app` works after publish without a clone.

import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyDir } from '../src/fs.js';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, '..');
const repo = join(pkg, '..', '..');
const dest = join(pkg, 'templates');

if (!existsSync(join(repo, 'AGENTS.md')) || !existsSync(join(repo, 'packages', 'home-connect'))) {
  console.error('sync-templates: run from a clone of agentic-primitives');
  process.exit(1);
}

function replace(from, to) {
  rmSync(to, { recursive: true, force: true });
  mkdirSync(dirname(to), { recursive: true });
  copyDir(from, to);
}

replace(join(repo, 'packages', 'home-connect'), join(dest, 'packages', 'home-connect'));
replace(join(repo, 'packages', 'interactions-client'), join(dest, 'packages', 'interactions-client'));
replace(join(repo, 'packages', 'catalog'), join(dest, 'packages', 'catalog'));
replace(join(repo, 'docs'), join(dest, 'docs'));
replace(join(repo, 'scripts'), join(dest, 'scripts'));

mkdirSync(join(dest, 'cursor'), { recursive: true });
copyDir(join(repo, '.cursor', 'rules'), join(dest, 'cursor'));

mkdirSync(join(dest, 'root'), { recursive: true });
copyFileSync(join(repo, 'AGENTS.md'), join(dest, 'root', 'AGENTS.md'));
copyFileSync(join(repo, 'CLAUDE.md'), join(dest, 'root', 'CLAUDE.md'));
if (existsSync(join(repo, 'llms.txt'))) {
  copyFileSync(join(repo, 'llms.txt'), join(dest, 'root', 'llms.txt'));
}

console.log('synced templates from', repo);
