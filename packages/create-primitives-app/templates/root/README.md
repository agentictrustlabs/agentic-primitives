# __PROJECT_NAME__

An app on the [Agentic Primitives](https://github.com/agentictrustlabs/agentic-primitives) substrate.
You hold neither the person's identity nor their data. Home runs the ceremony; the vault holds the
records; the chain answers whether a grant is still live.

```sh
cp apps/web/.dev.vars.example apps/web/.dev.vars   # SESSION_SECRET, 32+ random bytes
pnpm dev                                           # http://localhost:8799
```

Register `client_id` **`__CLIENT_ID__`** at your Home before the first sign-in:
[docs/register-your-app.md](docs/register-your-app.md). Redirect URI must be an exact match
(`http://localhost:8799/`).

## What this monorepo is

| | |
| --- | --- |
| **`apps/web`** | Your product. One Cloudflare Worker + a React SPA. No database. |
| **`packages/home-connect`** | Hand a person to their Home; get back a verified token |
| **`packages/interactions-client`** | Topics, messages, library, inbox — all in the owner's vault |
| **`docs/`** | Principles, API, contracts, troubleshooting |
| **`AGENTS.md`** | Binding rules for Claude, Cursor, and anything else |

This is a **construct-your-product** scaffold, not a demo. Add features in `apps/web`. Records go
in the owner's vault via `interactions.call`. Privileged work stays on the Worker.

## The one thing to get right

> A token says WHO. A delegation says WHAT.
>
> The `id_token` proves identity and authorizes nothing. Authority is a separate on-chain artifact
> the person signed. Never gate a capability on a claim, a scope, or an audience.

Read [docs/principles.md](docs/principles.md) before writing code. Point an assistant at
`AGENTS.md` and `apps/web/src/worker/index.ts`.

## Live rails

| | |
| --- | --- |
| Home | `https://www.impact-agent.me` |
| A2A | `https://demo-a2a-production.richardpedersen3.workers.dev` |
| MCP | vault — reach it only through A2A |
| Chain | Base Sepolia `84532` |

```sh
pnpm check:endpoints
```

## License

MIT.
