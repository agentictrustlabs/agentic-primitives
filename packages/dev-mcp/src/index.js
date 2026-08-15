#!/usr/bin/env node
// Read-only Developer MCP server for the Agentic Primitives devkit.
//
// Serves exact release knowledge — the manifest, package pins, contract deployment
// records, ABIs, and developer skills — to a coding agent over stdio.
//
// It deliberately cannot: hold keys, sign, broadcast, mint credentials, read vault
// data, or mutate any registry. Operational MCP servers are a separate,
// authority-gated surface.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Repo root when run from the devkit checkout; DEVKIT_ROOT overrides for installs.
const ROOT = process.env.DEVKIT_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const readJson = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
const manifest = readJson('release-manifest.json');
const packagesCatalog = readJson('catalog/packages.json');
const contractsCatalog = readJson('catalog/contracts.json');
const skillsCatalog = readJson('catalog/skills.json');

const text = (value) => ({
  content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
});
const refuse = (message) => ({ content: [{ type: 'text', text: message }], isError: true });

const server = new McpServer({ name: 'agenticprimitives-dev', version: manifest.release });

server.registerTool(
  'release_current',
  {
    title: 'Current release',
    description:
      'The release manifest that binds package versions, contract deployment sets, skill packs, and live endpoints together. Read this first.',
    inputSchema: {},
  },
  async () => text(manifest),
);

server.registerTool(
  'packages_list',
  {
    title: 'List packages',
    description: 'All @agenticprimitives package versions pinned by this release. Optional substring filter.',
    inputSchema: { filter: z.string().optional().describe('case-insensitive substring, e.g. "delegation"') },
  },
  async ({ filter }) => {
    const list = packagesCatalog.packages.filter(
      (p) => !filter || p.name.toLowerCase().includes(filter.toLowerCase()),
    );
    return text({ release: manifest.release, count: list.length, packages: list });
  },
);

server.registerTool(
  'packages_describe',
  {
    title: 'Describe a package',
    description: 'Pinned version and exact install command for one @agenticprimitives package in this release.',
    inputSchema: { name: z.string().describe('package name, with or without the @agenticprimitives/ prefix') },
  },
  async ({ name }) => {
    const full = name.startsWith('@') ? name : `@agenticprimitives/${name}`;
    const pkg = packagesCatalog.packages.find((p) => p.name === full);
    if (!pkg) return refuse(`${full} is not part of release ${manifest.release}. Use packages_list to see what is.`);
    return text({
      ...pkg,
      release: manifest.release,
      install: `pnpm add ${pkg.name}@${pkg.version}`,
      note: 'Pin exactly. The release lines are alpha; a caret range will drift across them.',
    });
  },
);

server.registerTool(
  'contracts_list',
  {
    title: 'List contract deployments',
    description: 'Deployed contracts in this release, with chain and deployment set. Addresses come from records, never from prose.',
    inputSchema: {},
  },
  async () => text(contractsCatalog),
);

server.registerTool(
  'contracts_resolve',
  {
    title: 'Resolve a contract deployment',
    description:
      'Full deployment record for a logical contract name (e.g. "delegationManager"): address, chain, source package, ABI digest, verification method.',
    inputSchema: {
      name: z.string().describe('logical contract name, camelCase'),
      chainId: z.number().optional().describe('numeric chain id; defaults to the only supported chain'),
    },
  },
  async ({ name, chainId }) => {
    const chain = manifest.supportedChains.find((c) => (chainId ? c.chainId === chainId : true));
    if (!chain) return refuse(`chain ${chainId} is not in release ${manifest.release}.`);
    const rel = `contracts/deployments/${chain.caip2.replace(':', '-')}/${chain.deploymentRelease}/${name}.json`;
    if (!existsSync(join(ROOT, rel))) {
      return refuse(`No deployment record for "${name}" on ${chain.caip2}. Use contracts_list for logical names.`);
    }
    return text(readJson(rel));
  },
);

server.registerTool(
  'contracts_get_abi',
  {
    title: 'Get a contract ABI',
    description: 'The released ABI for a logical contract name, exactly as shipped in @agenticprimitives/contracts.',
    inputSchema: { name: z.string().describe('logical contract name, camelCase') },
  },
  async ({ name }) => {
    const entry = contractsCatalog.contracts.find((c) => c.logicalName === name);
    if (!entry) return refuse(`Unknown contract "${name}". Use contracts_list.`);
    if (!entry.abi) return refuse(`${name} has no ABI in this release (e.g. the canonical EntryPoint ships elsewhere).`);
    return text(readFileSync(join(ROOT, entry.abi), 'utf8'));
  },
);

server.registerTool(
  'skills_list',
  {
    title: 'List developer skills',
    description: 'The developer-core skill pack: names and one-line descriptions from each SKILL.md.',
    inputSchema: {},
  },
  async () => {
    const skills = skillsCatalog.skills.map((name) => {
      const md = readFileSync(join(ROOT, 'skills', name, 'SKILL.md'), 'utf8');
      const description = md.match(/^description: (.*)$/m)?.[1] ?? '';
      return { name, description };
    });
    return text({ pack: skillsCatalog.pack, packVersion: skillsCatalog.packVersion, skills });
  },
);

server.registerTool(
  'skills_get',
  {
    title: 'Get a developer skill',
    description: 'Full SKILL.md body for one developer skill, plus its reference files.',
    inputSchema: { name: z.string() },
  },
  async ({ name }) => {
    const dir = join(ROOT, 'skills', name);
    if (!existsSync(join(dir, 'SKILL.md'))) return refuse(`Unknown skill "${name}". Use skills_list.`);
    const parts = [readFileSync(join(dir, 'SKILL.md'), 'utf8')];
    const refDir = join(dir, 'references');
    if (existsSync(refDir)) {
      for (const f of readdirSync(refDir).sort()) {
        parts.push(`\n\n<!-- references/${f} -->\n\n${readFileSync(join(refDir, f), 'utf8')}`);
      }
    }
    return text(parts.join(''));
  },
);

server.registerTool(
  'release_endpoints',
  {
    title: 'Live endpoints',
    description: 'The Home, A2A, and MCP endpoints this release was assembled against.',
    inputSchema: {},
  },
  async () => text(manifest.endpoints),
);

await server.connect(new StdioServerTransport());
