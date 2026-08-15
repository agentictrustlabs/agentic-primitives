#!/usr/bin/env node
// Smoke test: scaffold a project and assert the output is complete and token-free.
// Fast (no install), deterministic, and run in CI before anything is published.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, '..', 'bin', 'cli.js');
const work = mkdtempSync(join(tmpdir(), 'caa-smoke-'));
const target = join(work, 'smoke-app');

try {
  const run = spawnSync(
    process.execPath,
    [cli, target, '--yes', '--name', 'Smoke App', '--client-id', 'smoke-app', '--skip-install', '--no-git'],
    { encoding: 'utf8' },
  );
  assert.equal(run.status, 0, `cli exited ${run.status}\n${run.stdout}\n${run.stderr}`);

  const mustExist = [
    'package.json',
    'pnpm-workspace.yaml',
    'tsconfig.base.json',
    '.gitignore',
    'AGENTS.md',
    'CLAUDE.md',
    'llms.txt',
    '.cursor/rules/agentic-primitives.mdc',
    'README.md',
    'docs/principles.md',
    'docs/getting-started.md',
    'docs/register-your-app.md',
    'docs/interactions-api.md',
    'scripts/check-endpoints.mjs',
    'packages/home-connect/src/index.ts',
    'packages/interactions-client/src/index.ts',
    'apps/web/package.json',
    'apps/web/wrangler.toml',
    'apps/web/.dev.vars.example',
    'apps/web/src/worker/index.ts',
    'apps/web/src/worker/config.ts',
    'apps/web/src/worker/session.ts',
    'apps/web/src/worker/orgs.ts',
    'apps/web/src/ui/App.tsx',
    'apps/web/src/ui/main.tsx',
  ];
  for (const rel of mustExist) {
    assert.ok(existsSync(join(target, rel)), `missing: ${rel}`);
  }

  // No template tokens may survive, anywhere.
  walk(target, (file) => {
    if (!/\.(md|mdc|json|ts|tsx|js|mjs|toml|html|css|txt|yaml|yml|example)$/i.test(file)) return;
    const text = readFileSync(file, 'utf8');
    const leftover = text.match(/__[A-Z][A-Z_]+__/);
    assert.equal(leftover, null, `leftover token ${leftover?.[0]} in ${file}`);
  });

  // Every JSON file parses and the root manifest is coherent.
  const rootPkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'));
  assert.equal(rootPkg.name, 'smoke-app');
  assert.ok(rootPkg.pnpm?.overrides?.['@agenticprimitives/delegation'], 'pins missing');
  const appPkg = JSON.parse(readFileSync(join(target, 'apps', 'web', 'package.json'), 'utf8'));
  assert.equal(appPkg.name, '@app/web');

  // Substitutions landed where they matter.
  const wrangler = readFileSync(join(target, 'apps', 'web', 'wrangler.toml'), 'utf8');
  assert.ok(wrangler.includes('CLIENT_ID = "smoke-app"'), 'client_id not substituted');
  const session = readFileSync(join(target, 'apps', 'web', 'src', 'worker', 'session.ts'), 'utf8');
  assert.ok(session.includes("'smoke_app_session'"), 'cookie prefix not substituted');

  // Refuses a non-empty directory.
  const again = spawnSync(process.execPath, [cli, target, '--yes', '--skip-install', '--no-git'], {
    encoding: 'utf8',
  });
  assert.notEqual(again.status, 0, 'should refuse a non-empty directory');

  // Rejects a malformed client_id.
  const bad = spawnSync(
    process.execPath,
    [cli, join(work, 'bad'), '--yes', '--client-id', 'NO CAPS', '--skip-install', '--no-git'],
    { encoding: 'utf8' },
  );
  assert.notEqual(bad.status, 0, 'should reject an invalid client_id');

  console.log('smoke: ok');
} finally {
  rmSync(work, { recursive: true, force: true });
}

function walk(dir, visit) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, visit);
    else visit(p);
  }
}
