# `@agenticprimitives/dev-mcp`

Read-only Developer MCP server for the Agentic Primitives devkit. Serves exact
release knowledge over stdio: the release manifest, package pins, contract
deployment records, released ABIs, live endpoints, and the developer skill pack.

```bash
node src/index.js          # run from the devkit checkout
node test/smoke.mjs        # full stdio handshake + tool assertions
```

## Tools

| Tool | Returns |
| --- | --- |
| `release_current` | the full release manifest |
| `release_endpoints` | live Home / A2A / MCP endpoints for this release |
| `packages_list` / `packages_describe` | pinned versions and exact install commands |
| `contracts_list` / `contracts_resolve` | deployment records — address, chain, ABI digest |
| `contracts_get_abi` | the released ABI, byte-identical to the published package |
| `skills_list` / `skills_get` | developer skills and their references |

Unknown names refuse with guidance; the server never guesses.

## What it cannot do — by design

Hold private keys, sign messages or typed data, broadcast transactions, mint
credentials, read protected person or organization vault data, mutate the
ontology or deployment registry, or bypass an application's A2A/MCP admission
path. Operational MCP servers are a separate, authority-gated surface.

## Configuration

`DEVKIT_ROOT` overrides the artifact root (defaults to the devkit checkout the
server runs inside). See `.mcp.json.example` (Claude Code) and
`.cursor/mcp.json.example` (Cursor) at the repository root.
