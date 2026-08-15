// Smoke test: real stdio handshake + tool calls against the running server.
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const client = new Client({ name: 'smoke', version: '0.0.0' });
await client.connect(
  new StdioClientTransport({ command: process.execPath, args: [join(here, '..', 'src', 'index.js')] }),
);

const tools = await client.listTools();
const names = tools.tools.map((t) => t.name).sort();
for (const required of [
  'release_current', 'packages_list', 'packages_describe',
  'contracts_list', 'contracts_resolve', 'contracts_get_abi',
  'skills_list', 'skills_get', 'release_endpoints',
]) {
  assert.ok(names.includes(required), `missing tool ${required}`);
}

const release = JSON.parse((await client.callTool({ name: 'release_current', arguments: {} })).content[0].text);
assert.equal(release.status, 'pilot');
assert.ok(release.packages.length >= 60, 'expected the full package pin list');

const dm = JSON.parse(
  (await client.callTool({ name: 'contracts_resolve', arguments: { name: 'delegationManager' } })).content[0].text,
);
assert.match(dm.address, /^0x[0-9a-fA-F]{40}$/);
assert.equal(dm.chain.chainId, 84532);

const abi = JSON.parse(
  (await client.callTool({ name: 'contracts_get_abi', arguments: { name: 'delegationManager' } })).content[0].text,
);
assert.ok(Array.isArray(abi) ? abi.length > 0 : Object.keys(abi).length > 0, 'ABI should be non-empty');

const missing = await client.callTool({ name: 'contracts_resolve', arguments: { name: 'notAContract' } });
assert.equal(missing.isError, true, 'unknown contract must refuse, not guess');

const skills = JSON.parse((await client.callTool({ name: 'skills_list', arguments: {} })).content[0].text);
assert.equal(skills.skills.length, 13);

await client.close();
console.log(`dev-mcp smoke: ${names.length} tools, release ${release.release}, all checks passed`);
