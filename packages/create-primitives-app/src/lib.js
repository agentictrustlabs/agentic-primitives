import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--version' || a === '-v') out.version = true;
    else if (a === '--yes' || a === '-y') out.yes = true;
    else if (a === '--skip-install') out.skipInstall = true;
    else if (a === '--with-catalog') out.withCatalog = true;
    else if (a === '--no-git') out.git = false;
    else if (a === '--name') out.name = argv[++i];
    else if (a === '--client-id') out.clientId = argv[++i];
    else if (a === '--template') out.template = argv[++i];
    else if (a.startsWith('-')) {
      console.error(`unknown flag: ${a}`);
      process.exit(1);
    } else out._.push(a);
  }
  return out;
}

export async function prompt(label, fallback) {
  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question(`  ${label}${fallback ? ` (${fallback})` : ''}: `)).trim();
    return answer || fallback || '';
  } finally {
    rl.close();
  }
}

export function slugify(name) {
  const s = String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'my-app';
}

/** Home client_id: 3–40 chars, lowercase, digits, single dashes. */
export function toClientId(name) {
  let s = slugify(name).slice(0, 40);
  if (s.length < 3) s = `${s}-app`.slice(0, 40);
  return s.replace(/^-+|-+$/g, '') || 'my-app';
}

export function toCookiePrefix(name) {
  return slugify(name).replace(/-/g, '_').slice(0, 24) || 'app';
}

export function toWorkerName(name) {
  return slugify(name).slice(0, 40) || 'app';
}
