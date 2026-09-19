# Documentation

The developer kit for the Agentic Primitives substrate: 75 npm packages, Ethereum contracts on
Base Sepolia (and the estate chain), and three live services. If you read one file, read
[principles.md](./principles.md) — everything else hangs off it. If you want the *why* in
essay form, the [LinkedIn series](https://github.com/agentictrustlabs/agentic-primitives/blob/main/articles/README.md) — 21 pieces on the missing layer —
is the argument the kit is built to back up.

## Build

| | |
| --- | --- |
| [getting-started.md](./getting-started.md) | Scaffold a project → register at a Home → first vault write |
| [create-app.md](./create-app.md) | The `create-primitives-app` CLI: flags, output, publishing |
| [register-your-app.md](./register-your-app.md) | `client_id`, exact redirect URIs, templates, the issuer rule |
| [vibe-coding.md](./vibe-coding.md) | Building with Claude or Cursor — instincts to override |

## The case

| | |
| --- | --- |
| [rails-not-throttles.md](./rails-not-throttles.md) | The calls to slow AI agents down, what they actually ask for, and why a throttle is the wrong instrument — with sources |
| [controls-catalog.md](./controls-catalog.md) | Every asked-for control (stop it · know what it did · know what it may do · oversight · data · behaviour) mapped to mechanism, package, spec, status — and the gaps |
| [assets/](./assets/) | Architecture diagrams: substrate scope, one harness turn, the anchor and its projections, rails — SVG source and 5760-px PNGs |

## Understand

| | |
| --- | --- |
| [principles.md](./principles.md) | Twelve rules, each enforced by a real gate |
| [architecture.md](./architecture.md) | Home, A2A, MCP, the harness, the ontology — who trusts whom, and why |
| [products.md](./products.md) | The product map: nine offerings, three products, the harness program, what is in flight — with spec numbers and status |
| [articles/](https://github.com/agentictrustlabs/agentic-primitives/blob/main/articles/README.md) | The 21-part series: anchor, projections, delegation, mandate, harness, receipts |

## Reference

| | |
| --- | --- |
| [sdk.md](./sdk.md) | The npm packages a builder actually imports |
| [packages.md](./packages.md) | The full 75-package catalog, grouped — including the harness and the `ap` CLI |
| [contracts.md](./contracts.md) | Deployed addresses on two chains, caveat enforcers, the mandate shape, reading the chain |
| [release-binding.md](./release-binding.md) | The manifest, deployment records, doctor, Developer MCP |
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
pnpm release:validate   # the release binding, offline
pnpm doctor:full        # the release binding against npm, the rails, and the chain
```

If a check disagrees with a doc, believe the check and fix the doc.
