import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const source = path.join(root, 'skills');
const targets = [
  path.join(root, '.agents', 'skills'),
  path.join(root, '.claude', 'skills'),
  path.join(root, '.cursor', 'skills'),
];
const checkOnly = process.argv.includes('--check');

async function files(dir, prefix = '') {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'README.md' && prefix === '') continue;
    if (entry.name === '.generated-from-skills.json') continue;
    const rel = path.join(prefix, entry.name);
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await files(full, rel));
    else out.push(rel);
  }
  return out.sort();
}

async function digest(dir) {
  const hash = createHash('sha256');
  for (const rel of await files(dir)) {
    hash.update(rel.replaceAll('\\\\', '/'));
    hash.update(await readFile(path.join(dir, rel)));
  }
  return hash.digest('hex');
}

const sourceDigest = await digest(source);

for (const target of targets) {
  if (checkOnly) {
    try {
      const targetDigest = await digest(target);
      if (targetDigest !== sourceDigest) {
        console.error(`Skill projection drift: ${path.relative(root, target)}`);
        process.exitCode = 1;
      }
    } catch {
      console.error(`Missing skill projection: ${path.relative(root, target)}`);
      process.exitCode = 1;
    }
    continue;
  }

  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    await cp(path.join(source, entry.name), path.join(target, entry.name), { recursive: true });
  }
  await writeFile(path.join(target, '.generated-from-skills.json'), JSON.stringify({
    source: 'skills/',
    sha256: sourceDigest,
    generatedAt: new Date().toISOString(),
  }, null, 2) + '\n');
  console.log(`Synced ${path.relative(root, target)}`);
}
