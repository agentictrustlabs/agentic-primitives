# create-primitives-app

Scaffold a pnpm monorepo for building on the
[Agentic Primitives](https://github.com/agentictrustlabs/agentic-primitives) substrate —
apps where identity, authority, and data belong to the person, not to you.

```sh
npx create-primitives-app@latest my-app
# or
npm create primitives-app@latest
```

The installed command is `create-primitives-app`.

## What you get

```
my-app/
  AGENTS.md  CLAUDE.md  .cursor/rules/   Claude and Cursor start correct
  llms.txt                               machine-readable doc index
  docs/                                  principles, API, contracts, ceremonies
  packages/home-connect                  relying-app OIDC: person → Home → verified token
  packages/interactions-client           topics, messages, library — in the owner's vault
  apps/web                               your Worker + SPA, Connect already wired
  package.json                           exact @agenticprimitives pins (pnpm.overrides)
```

`apps/web` handles sign-in via the person's Home, seals the session in an httpOnly cookie,
resolves organization stewardship wires, and shows the on-chain contracts. It ships **no product
features** — that part is yours. The generated project installs, typechecks, and builds out of
the box, and CI in the source repo proves that on every commit.

## Options

| Flag | |
| --- | --- |
| `[directory]` | Where to write the project |
| `--name <name>` | Display name |
| `--client-id <id>` | Home `client_id` (3–40 chars, `[a-z0-9-]`) |
| `--with-catalog` | Include the 66-package import harness |
| `--yes`, `-y` | Accept defaults, no prompts |
| `--skip-install` | Skip `pnpm install` |
| `--no-git` | Skip `git init` + initial commit |

## After scaffolding

1. Register your `client_id` at your Home — `docs/register-your-app.md` in the project.
2. `cp apps/web/.dev.vars.example apps/web/.dev.vars` and set `SESSION_SECRET`.
3. `pnpm dev` → `http://localhost:8799`.

## Requirements

Node ≥ 20, pnpm. The generated app deploys as a single Cloudflare Worker — no database, because
durable records live in the owner's encrypted vault, reached through delegations they signed and
can revoke on-chain.

## The model, in one line

> A token says WHO. A delegation says WHAT. Your app is a delegate, never a custodian.

Docs: [github.com/agentictrustlabs/agentic-primitives](https://github.com/agentictrustlabs/agentic-primitives)

## License

MIT
