import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function packageDir() {
  return join(dirname(fileURLToPath(import.meta.url)), '..');
}

/**
 * A clone of the public starter — the source of truth for wrappers, docs, and pins.
 * Walks from this package and from cwd. Used so a local `pnpm create-app` always
 * copies the live packages rather than a stale bundle.
 */
export function findSourceRepo() {
  const starts = [packageDir(), process.cwd()];
  for (const start of starts) {
    let dir = start;
    for (let i = 0; i < 8; i++) {
      if (
        existsSync(join(dir, 'AGENTS.md')) &&
        existsSync(join(dir, 'packages', 'home-connect', 'src', 'index.ts')) &&
        existsSync(join(dir, 'docs', 'principles.md'))
      ) {
        return dir;
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return null;
}
