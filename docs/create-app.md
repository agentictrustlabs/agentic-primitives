# `create-primitives-app`

Interactive CLI that scaffolds a pnpm monorepo for building on the substrate. Same job
`create-t3-app`, `create-wagmi`, and `@metamask/create-gator-app` do for their stacks: workspace,
pins, Connect, session cookie, contract addresses, and assistant rules — then you write the product.

```sh
npx create-primitives-app@latest
npx create-primitives-app@latest my-app --yes --client-id my-app
npm create primitives-app@latest   # same package — npm expands it
pnpm create-app my-app                     # from a clone of this repo
node packages/create-primitives-app/bin/cli.js my-app
```

Until the package is on npm, the clone paths work. `npx github:agentictrustlabs/agentic-primitives`
also runs the same bin. (The name `create-agentic-app` was not used because an unrelated package
already owns it on npm.)

## What it generates

```
<dir>/
  package.json                 pnpm workspace + exact @agenticprimitives overrides
  AGENTS.md  CLAUDE.md         binding rules for assistants
  .cursor/rules/               Cursor loads these automatically
  docs/                        principles, API, contracts, ceremonies
  scripts/check-endpoints.mjs  the live rails are real
  packages/
    home-connect               relying-app OIDC
    interactions-client        vault-backed ops
    catalog                    optional — all 66 published packages
  apps/web                     Worker + SPA: Connect, orgs, chain. No product features.
```

Commons is **not** copied. It stays in this public repo as the worked example.

## Options

| | |
| --- | --- |
| `[directory]` | Where to write the project |
| `--name` | Display name |
| `--client-id` | Home `client_id` (3–40 chars, `[a-z0-9-]`) |
| `--with-catalog` | Include the 66-package import harness |
| `--yes`, `-y` | No prompts |
| `--skip-install` | Do not run `pnpm install` |
| `--no-git` | Do not `git init` + initial commit |

## After it finishes

1. Register `--client-id` at your Home. Redirect `http://localhost:8799/` — exact.
   [register-your-app.md](./register-your-app.md)
2. `cp apps/web/.dev.vars.example apps/web/.dev.vars` and set `SESSION_SECRET`
3. `pnpm dev`
4. Read `docs/principles.md` before adding a feature

## Why a monorepo

Hostnames stay in `apps/web/src/worker/config.ts`. Wrappers in `packages/*` stay generic. That is
the same split this starter uses, and it is what makes the app white-labelable without a rewrite.

The root `pnpm.overrides` pin the two concurrent `@agenticprimitives` release lines. Mixing them
is the fastest way to a type error that reads like a mystery. Copy the pins; do not float ranges.

## Publishing this CLI

`packages/create-primitives-app` is the publishable package (`name: create-primitives-app`,
installed command `create-primitives-app`). One-time setup, then per release:

```sh
# once
npm login

# per release, from the repo root
cd packages/create-primitives-app
npm version patch                 # or minor / major
npm publish                       # prepublishOnly re-syncs templates + runs the smoke test
```

Verify with `npm view create-primitives-app version`, then
`npx create-primitives-app@latest smoke-test --yes --skip-install --no-git` from an empty
directory.
