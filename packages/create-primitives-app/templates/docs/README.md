# Documentation

The developer kit for the Agentic Primitives substrate: 66 npm packages, Ethereum contracts on
Base Sepolia, and three live services. If you read one file, read
[principles.md](./principles.md) — everything else hangs off it.

## Build

| | |
| --- | --- |
| [getting-started.md](./getting-started.md) | Scaffold a project → register at a Home → first vault write |
| [create-app.md](./create-app.md) | The `create-primitives-app` CLI: flags, output, publishing |
| [register-your-app.md](./register-your-app.md) | `client_id`, exact redirect URIs, templates, the issuer rule |
| [vibe-coding.md](./vibe-coding.md) | Building with Claude or Cursor — instincts to override |

## Understand

| | |
| --- | --- |
| [principles.md](./principles.md) | Twelve rules, each enforced by a real gate |
| [architecture.md](./architecture.md) | Home, A2A, MCP, chain — who trusts whom, and why |

## Reference

| | |
| --- | --- |
| [sdk.md](./sdk.md) | The npm packages a builder actually imports |
| [packages.md](./packages.md) | The full 66-package catalog, grouped |
| [contracts.md](./contracts.md) | Deployed addresses, caveat enforcers, reading the chain |
| [interactions-api.md](./interactions-api.md) | Every op, including what a third-party app cannot call |
| [live-endpoints.md](./live-endpoints.md) | Exact routes on the three live services |

## When something refuses

| | |
| --- | --- |
| [troubleshooting.md](./troubleshooting.md) | Most refusals are ceremonies, not bugs |

## Verify anything on this page

```sh
pnpm check:endpoints    # the live rails
pnpm check:packages     # the published packages
```

If a check disagrees with a doc, believe the check and fix the doc.
