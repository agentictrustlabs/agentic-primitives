# Contributing

This repository is the developer kit for the Agentic Primitives substrate. Contributions are
welcome — the bar is that everything in here must stay **true**: the docs describe the live rails,
the example enforces the principles, and the scaffold produces a project that builds.

## Before you open a PR

```sh
pnpm install
pnpm typecheck          # all workspace packages, strict
pnpm test               # includes the create-primitives-app smoke test
pnpm check:endpoints    # the live rails are real and they change
```

If `check:endpoints` disagrees with `docs/live-endpoints.md`, believe the endpoint and fix the doc
in the same PR.

## What kind of change is this?

| Change | Also touch |
| --- | --- |
| A doc edit | Nothing else — but verify claims against the live rails |
| A wrapper (`packages/home-connect`, `interactions-client`) | `pnpm --filter create-primitives-app sync-templates`, and the smoke test must pass |
| The CLI (`packages/create-primitives-app`) | `node packages/create-primitives-app/test/smoke.mjs` |
| The example (`apps/commons`) | Keep it exemplary — it is the file assistants copy |
| A new `@agenticprimitives` package pin | Root `pnpm.overrides`, `packages/catalog/package.json`, `scripts/check-packages.mjs`, `docs/packages.md` — all four |

## Rules that are not up for debate

These are the substrate's own rules ([docs/principles.md](docs/principles.md)), and a PR that
violates one will be declined regardless of how well it works:

1. No database, KV, or Durable Object for user content — records live in the owner's vault.
2. No token in `localStorage`, a readable cookie, or a URL.
3. No fallback chains. One mechanism per path.
4. No hand-rolled EIP-712 structs or signature checks — use `@agenticprimitives/delegation`.
5. No widened issuer allowlists, ever, including to make a test pass.
6. No comment asserting a property nothing enforces.

## Style

- TypeScript strict, ESM, Node ≥ 20. `noUncheckedIndexedAccess` is on and stays on.
- Comments explain **why**, or they do not exist.
- Docs are written for a developer who has never seen this stack. Spell things out once, then
  link back to where they were spelled out.
- Match the voice of the existing docs: direct, specific, honest about limits.

## Commit messages

One to two sentences on **why**. The diff already says what.

## Releasing `create-primitives-app`

Maintainers only:

```sh
pnpm --filter create-primitives-app sync-templates   # bundle live wrappers + docs
pnpm --filter create-primitives-app test             # smoke
cd packages/create-primitives-app && npm publish
```

`prepublishOnly` runs both steps again as a gate.

## Questions

Open a [discussion or issue](https://github.com/agentictrustlabs/agentic-primitives/issues). For
anything security-related, read [SECURITY.md](SECURITY.md) first — do not open a public issue.
