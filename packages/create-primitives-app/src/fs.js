import { cpSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SKIP = new Set([
  'node_modules',
  'dist',
  '.wrangler',
  '.git',
  '.dev.vars',
  '.DS_Store',
]);

export function copyDir(from, to, opts = {}) {
  const { filter, tokens } = opts;
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from)) {
    if (SKIP.has(name)) continue;
    if (filter && !filter(name)) continue;
    const src = join(from, name);
    const dest = join(to, name);
    const st = statSync(src);
    if (st.isDirectory()) copyDir(src, dest, opts);
    else {
      mkdirSync(dirname(dest), { recursive: true });
      let buf = readFileSync(src);
      if (tokens && isText(name)) {
        let text = buf.toString('utf8');
        for (const [k, v] of Object.entries(tokens)) text = text.split(k).join(v);
        buf = Buffer.from(text, 'utf8');
      }
      writeFileSync(dest, buf);
    }
  }
}

export function replaceTokensInTree(root, tokens) {
  walk(root, (file) => {
    if (!isText(file)) return;
    let text = readFileSync(file, 'utf8');
    let changed = false;
    for (const [k, v] of Object.entries(tokens)) {
      if (text.includes(k)) {
        text = text.split(k).join(v);
        changed = true;
      }
    }
    if (changed) writeFileSync(file, text);
  });
}

function walk(dir, visit) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, visit);
    else visit(p);
  }
}

function isText(name) {
  return /\.(md|mdc|json|ts|tsx|js|mjs|cjs|toml|html|css|txt|example|gitignore|yml|yaml)$/i.test(name)
    || name === 'LICENSE'
    || name.startsWith('.');
}

/** Used by the sync script. */
export function copyTree(from, to) {
  cpSync(from, to, {
    recursive: true,
    filter: (src) => !SKIP.has(src.split(/[/\\]/).pop() ?? ''),
  });
}
