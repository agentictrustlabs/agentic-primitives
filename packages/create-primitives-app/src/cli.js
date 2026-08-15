#!/usr/bin/env node
// create-primitives-app — scaffold a pnpm monorepo that builds on the substrate.
//
// Inspired by create-t3-app / create-gator-app / create-wagmi: interactive, opinionated,
// and small. It solves the boring parts (workspace, pins, Connect, session cookie, AI rules)
// and leaves the product to you. Commons in the starter repo is an example, not this output.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { parseArgs, prompt, slugify, toClientId, toCookiePrefix, toWorkerName } from './lib.js';
import { copyDir, replaceTokensInTree } from './fs.js';
import { findSourceRepo, packageDir } from './source.js';
import { banner, bold, cyan, dim, errorLine, info, step, warn } from './ui.js';

const VERSION = '0.1.0';
const MIN_NODE = 20;

const HELP = `
create-primitives-app  v${VERSION}

  Scaffold a pnpm monorepo for building on the Agentic Primitives substrate:
  Home connect, A2A/MCP vault, pinned @agenticprimitives packages, Ethereum
  contract addresses, and Claude/Cursor rules.

Usage:
  npx create-primitives-app@latest [directory] [options]
  npm create primitives-app@latest
  pnpm create-app [directory]          # from a clone of this repo

Options:
  --name <name>          Display name (default: directory)
  --client-id <id>       Home client_id (3–40 chars, [a-z0-9-])
  --template <name>      app (default)
  --with-catalog         Include the 66-package import harness
  --yes, -y              Accept defaults; no prompts
  --skip-install         Do not run pnpm install
  --no-git               Do not initialize a git repository
  --help, -h
  --version, -v

After it finishes:
  1. Register the app at your Home  — docs/register-your-app.md
  2. Copy apps/web/.dev.vars.example → .dev.vars and set SESSION_SECRET
  3. pnpm dev
`.trim();

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }
  if (args.version) {
    console.log(VERSION);
    return;
  }

  const major = Number(process.versions.node.split('.')[0]);
  if (major < MIN_NODE) {
    fail(`Node ${MIN_NODE}+ is required (you are on ${process.versions.node})`);
  }

  banner(VERSION);

  const yes = args.yes;
  const dirArg = args._[0];

  const directory = yes
    ? (dirArg || 'my-app')
    : await prompt('Project directory', dirArg || 'my-app');
  const target = resolve(process.cwd(), directory);
  if (existsSync(target) && readdirSync(target).length > 0) {
    fail(`${target} exists and is not empty`);
  }

  const displayName = yes
    ? (args.name || slugify(directory))
    : await prompt('Display name', args.name || slugify(directory));
  const clientId = yes
    ? (args.clientId || toClientId(displayName))
    : await prompt('Home client_id (register this at your Home)', args.clientId || toClientId(displayName));
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(clientId)) {
    fail('client_id must be 3–40 chars, lowercase letters, digits, single dashes');
  }

  const withCatalog =
    args.withCatalog ||
    (!yes && (await prompt('Include the 66-package catalog harness? (y/N)', 'n')).toLowerCase() === 'y');
  const skipInstall = args.skipInstall || false;
  const withGit = args.git !== false;

  const tokens = {
    __PROJECT_NAME__: displayName,
    __PACKAGE_NAME__: slugify(displayName),
    __CLIENT_ID__: clientId,
    __COOKIE_PREFIX__: toCookiePrefix(displayName),
    __WORKER_NAME__: toWorkerName(displayName),
    __YEAR__: String(new Date().getFullYear()),
  };

  const source = findSourceRepo();
  const templates = join(packageDir(), 'templates');
  if (!existsSync(join(templates, 'app'))) {
    fail('templates/app is missing — run this from a clone, or reinstall create-primitives-app');
  }

  console.log(`  Creating ${bold(displayName)} in ${cyan(target)}`);
  info(source ? `using live packages from ${source}` : 'using bundled templates');
  console.log('');

  mkdirSync(target, { recursive: true });

  copyDir(join(templates, 'root'), target, { tokens });
  copyDir(join(templates, 'app'), join(target, 'apps', 'web'), { tokens });
  step('workspace + apps/web');

  const pkgSrc = source ? join(source, 'packages') : join(templates, 'packages');
  const docsSrc = source ? join(source, 'docs') : join(templates, 'docs');
  const scriptsSrc = source ? join(source, 'scripts') : join(templates, 'scripts');

  copyRequired(join(pkgSrc, 'home-connect'), join(target, 'packages', 'home-connect'));
  copyRequired(join(pkgSrc, 'interactions-client'), join(target, 'packages', 'interactions-client'));
  if (withCatalog) {
    copyRequired(join(pkgSrc, 'catalog'), join(target, 'packages', 'catalog'));
  }
  step(withCatalog ? 'packages: home-connect, interactions-client, catalog' : 'packages: home-connect, interactions-client');

  if (existsSync(docsSrc)) {
    copyDir(docsSrc, join(target, 'docs'));
  } else {
    fail('docs/ is missing from the scaffold source');
  }

  if (existsSync(scriptsSrc)) {
    copyDir(scriptsSrc, join(target, 'scripts'), {
      filter: (name) => name.endsWith('.mjs'),
    });
  }
  step('docs + endpoint checks');

  const agents = source ? join(source, 'AGENTS.md') : join(templates, 'root', 'AGENTS.md');
  const claude = source ? join(source, 'CLAUDE.md') : join(templates, 'root', 'CLAUDE.md');
  const llms = source ? join(source, 'llms.txt') : join(templates, 'root', 'llms.txt');
  const rules = source
    ? join(source, '.cursor', 'rules', 'agentic-primitives.mdc')
    : join(templates, 'cursor', 'agentic-primitives.mdc');
  if (existsSync(agents)) copyFile(agents, join(target, 'AGENTS.md'));
  if (existsSync(claude)) copyFile(claude, join(target, 'CLAUDE.md'));
  if (existsSync(llms)) copyFile(llms, join(target, 'llms.txt'));
  if (existsSync(rules)) {
    mkdirSync(join(target, '.cursor', 'rules'), { recursive: true });
    copyFile(rules, join(target, '.cursor', 'rules', 'agentic-primitives.mdc'));
  }
  step('AGENTS.md, CLAUDE.md, Cursor rules, llms.txt');

  rewriteGeneratedAgents(target);
  rewriteCursorRule(target);
  rewriteRootPackage(target, { withCatalog, tokens });
  replaceTokensInTree(target, tokens);

  if (withGit) {
    const ok = initGit(target, displayName);
    if (ok) step('git repository with an initial commit');
    else warn('git init skipped (git not available?)');
  }

  if (!skipInstall) {
    console.log('');
    info('installing with pnpm…');
    const install = spawnSync('pnpm', ['install'], { cwd: target, stdio: 'inherit', shell: false });
    if (install.status !== 0) {
      warn('pnpm install failed — run it yourself inside the project.');
    } else {
      step('dependencies installed');
    }
  }

  const rel = relative(process.cwd(), target);
  const cdPath = !rel || rel.startsWith('..') ? target : rel;
  console.log(`
  ${bold('Done.')} Next:

    ${cyan(`cd ${cdPath}`)}
    ${dim(`# 1. Register client_id "${clientId}" at your Home — docs/register-your-app.md`)}
    ${cyan('cp apps/web/.dev.vars.example apps/web/.dev.vars')}
    ${dim('# 2. Put 32+ random bytes in SESSION_SECRET')}
    ${cyan('pnpm dev')}

  Point Claude or Cursor at ${bold('AGENTS.md')} and ${bold('docs/principles.md')} before writing code.
  Docs: ${cyan('https://github.com/agentictrustlabs/agentic-primitives')}
`);
}

function initGit(target, displayName) {
  const inside = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: target, stdio: 'ignore' });
  // Already inside a repo (e.g. scaffolding into a monorepo subfolder) — leave git alone.
  if (inside.status === 0) return false;
  const init = spawnSync('git', ['init', '-q'], { cwd: target, stdio: 'ignore' });
  if (init.status !== 0) return false;
  spawnSync('git', ['add', '-A'], { cwd: target, stdio: 'ignore' });
  const commit = spawnSync(
    'git',
    ['commit', '-q', '-m', `Scaffold ${displayName} with create-primitives-app`],
    { cwd: target, stdio: 'ignore' },
  );
  return commit.status === 0;
}

function copyRequired(from, to) {
  if (!existsSync(from)) fail(`required scaffold piece missing: ${from}`);
  copyDir(from, to);
}

function copyFile(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, readFileSync(from));
}

function rewriteGeneratedAgents(target) {
  const path = join(target, 'AGENTS.md');
  if (!existsSync(path)) return;
  let text = readFileSync(path, 'utf8');
  text = text.replaceAll('apps/commons/src/worker/index.ts', 'apps/web/src/worker/index.ts');
  text = text.replaceAll('apps/commons/src/worker/config.ts', 'apps/web/src/worker/config.ts');
  text = text.replaceAll('`apps/commons`', '`apps/web`');
  text = text.replace(
    /In a project from `create-primitives-app`, read `apps\/web\/src\/worker\/index\.ts` instead[^\n]*\n[^\n]*\n/,
    '',
  );
  writeFileSync(path, text);
}

function rewriteCursorRule(target) {
  const path = join(target, '.cursor', 'rules', 'agentic-primitives.mdc');
  if (!existsSync(path)) return;
  let text = readFileSync(path, 'utf8');
  text = text.replaceAll('apps/commons/src/worker/config.ts', 'apps/web/src/worker/config.ts');
  text = text.replaceAll('apps/commons/src/worker/index.ts', 'apps/web/src/worker/index.ts');
  writeFileSync(path, text);
}

function rewriteRootPackage(target, { withCatalog, tokens }) {
  const path = join(target, 'package.json');
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  pkg.name = tokens.__PACKAGE_NAME__;
  pkg.description = `${tokens.__PROJECT_NAME__} — an app on the Agentic Primitives substrate.`;
  pkg.scripts = {
    dev: 'pnpm --filter @app/web dev',
    build: 'pnpm --filter @app/web build',
    deploy: 'pnpm --filter @app/web deploy',
    typecheck: 'pnpm -r typecheck',
    test: 'pnpm -r test',
    check: 'pnpm typecheck && pnpm test',
    'check:endpoints': 'node scripts/check-endpoints.mjs',
    ...(withCatalog ? { 'check:packages': 'node scripts/check-packages.mjs' } : {}),
  };
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
}

function fail(message) {
  errorLine(message);
  process.exit(1);
}

main().catch((e) => {
  errorLine(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
