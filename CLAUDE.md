# Claude guide

Read [`AGENTS.md`](AGENTS.md) first — it holds the binding rules for every assistant, and the four
instincts this substrate requires you to override. This file is the map.

## Layout

```
apps/commons              the example app: one Cloudflare Worker + a React SPA, no database
  src/worker/index.ts       ← the file to read; every pattern is here
  src/worker/config.ts      the ONE module that knows any hostname
  src/worker/session.ts     AES-GCM sealed httpOnly cookie; no credential reaches JS
  src/worker/orgs.ts        which orgs this person linked to this app, and their wires
  src/ui/                   the SPA — its only API is this app's own /api/*
packages/home-connect     relying-app OIDC: startConnect → completeConnect
packages/interactions-client  typed ops: topics, messages, library, inbox
packages/catalog          every published @agenticprimitives package, import-checked
docs/                     principles, architecture, API reference, troubleshooting
scripts/                  check-endpoints.mjs, check-packages.mjs
```

## Where to look, by intent

| Working on | Read |
| --- | --- |
| Anything, first time | `docs/principles.md`, then `apps/commons/src/worker/index.ts` |
| Sign-in / OIDC / issuers | `packages/home-connect/src/connect.ts` + `origins.ts` |
| A new interactions op | `docs/interactions-api.md`, then `packages/interactions-client/src/client.ts` |
| A refusal you do not understand | `docs/troubleshooting.md` — most are ceremonies, not bugs |
| Which package does X | `docs/packages.md` |
| Contract addresses, delegation hashes | `docs/contracts.md` |
| Registering an app at a Home | `docs/register-your-app.md` |

## The distinction everything rests on

```ts
{
  session: idToken,              // WHO  — verified against the Home's JWKS
  stewardship: delegationWire,   // WHAT — ERC-1271 + caveats + unrevoked on-chain
}
```

The token can only ever act as the person it names. The delegation says what that person may do for
someone else. Neither substitutes for the other, and the gate checks both independently.

## Things that will surprise you

- **`/interactions/*` is CSRF-exempt** — the session is in the body, not a cookie. Which is exactly
  why these calls belong on the server and never in a browser.
- **A named person's Home is their subdomain.** `nathan.impact-agent.me`, not the apex. Accept the
  apex and any single-label subdomain of the zone. Nothing else.
- **Message bodies do not travel in envelopes.** An envelope carries a hash and a vault pointer;
  `channels.read` returns `bodies` keyed by message id. A post with no body renders empty, not with
  a guess.
- **`content.put` with `data: null` is the delete.** The gate reads it as one and checks the caller
  for `delete`, so a `write` grant cannot erase records.
- **Your app cannot create an organization.** The person does, at their Home, custodied by their own
  credential. `org-create` is a ceremony you request, not an operation you perform.
- **`@agenticprimitives/contracts` has no default entry point** — only subpaths
  (`/deployments-json/base-sepolia`, `/abi`). That is deliberate, not a broken package.

## Validation

```sh
pnpm typecheck              # all workspace packages
pnpm check:endpoints        # the live rails, ~5s — catches drift nothing else can
pnpm check:packages         # all 66 published packages, imported for real
pnpm --filter @starter/commons build
```

## Status

Reference deployments on Base Sepolia testnet. Sessions are demo-grade by design. The packages are
alpha across two concurrent release lines — pin exactly, and pin the transitive tree with
`pnpm.overrides` (see the root `package.json`).
