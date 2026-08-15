# Construct a project

This repo is a **developer kit**, not a product. Commons is one example of what you can build.
Your job is to scaffold a monorepo, register an app at a Home, and write features against the
published npm packages and the live Home / A2A / MCP rails.

## 1. Scaffold

```sh
npx create-primitives-app@latest my-app
# from a clone of this repo:
pnpm create-app my-app
```

That produces a pnpm workspace with:

```
my-app/
  AGENTS.md CLAUDE.md .cursor/rules/     # so Claude and Cursor start correct
  docs/                                  # principles, API, contracts, ceremonies
  packages/home-connect                  # relying-app OIDC
  packages/interactions-client           # vault-backed topics, messages, library
  apps/web                               # your Worker + SPA — empty of product features
```

`apps/web` already does Connect, session cookies, org wires, and contract display. It does **not**
ship Commons. Add your product on top.

Full CLI: [create-app.md](./create-app.md).

## 2. Register the app at a Home

Your `client_id` and redirect URI must exist at the Home before anyone can sign in. Exact match —
a trailing slash matters.

[register-your-app.md](./register-your-app.md) · `Manage → Your apps` at `www.impact-agent.me`.

Templates to request: `site-login` always; `org-create` if you work with organizations.

## 3. Secrets and run

```sh
cd my-app
cp apps/web/.dev.vars.example apps/web/.dev.vars
# SESSION_SECRET = 32+ random bytes
pnpm dev          # http://localhost:8799
pnpm check:endpoints
```

## 4. The shape every feature follows

```ts
// WHO — verified against the Home's JWKS. Authorizes nothing.
const session = idToken;

// WHAT — ERC-1271 + caveats + unrevoked on-chain. Your app cannot mint this.
const stewardship = org.stewardshipDelegation;

await interactions.postToTopic(orgAddress, { topicId, text }, { session, stewardship });
// The post lands in the ORGANIZATION's vault. Not yours.
```

Privileged calls stay on the Worker. The browser talks only to `/api/*`. A refusal with
`storage_not_enabled` / `messaging_not_approved` / `read_grant_absent` is a ceremony — render the
Home link. Never retry, never work around.

## 5. Point an assistant at it

Hand Claude or Cursor, in order:

1. `AGENTS.md` (already in the scaffold)
2. `docs/principles.md`
3. `apps/web/src/worker/index.ts`

Prompts that work, and prompts that produce wrong code: [vibe-coding.md](./vibe-coding.md).

## 6. Add a vault-backed feature

In `apps/web/src/worker/index.ts`, under the comment that says so:

```ts
app.post('/api/topics', async (c) => {
  const cfg = c.get('cfg');
  const session = required(c.get('session'));
  const { org, title } = await c.req.json();
  const r = await cfg.interactions.createTopic(
    org,
    { title },
    await orgAuth(cfg, c, session, org),
  );
  return c.json(r);
});
```

Then a UI that calls `api.post('/api/topics', { org, title })`. That is the whole loop.

Ops you can call: [interactions-api.md](./interactions-api.md).
Packages you can import: [sdk.md](./sdk.md) · [packages.md](./packages.md).
Contracts the gates read: [contracts.md](./contracts.md).

## What you do not build

- A database for user content. If wiping it would be a bereavement, it belonged in the vault.
- A password field, a wallet button, or an "create account" on your origin.
- An organization. The person creates it at their Home.
- A hand-rolled EIP-712 struct or signature check. Use `@agenticprimitives/delegation`.
- A fallback: `cache ?? db ?? api` is the pattern this substrate exists to replace.

## The example

[`apps/commons`](../apps/commons) in this repository is a finished community app — discussion,
messages, library, members. Copy patterns from `src/worker/index.ts`. Do not treat Commons as the
thing you ship.
