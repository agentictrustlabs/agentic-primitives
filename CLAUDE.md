# Claude guide

Read [`AGENTS.md`](AGENTS.md) first — it holds the binding rules for every assistant, and the five
instincts this substrate requires you to override. This file is the map.

## Layout

```
apps/commons              the example app: one Cloudflare Worker + a React SPA, no database
  src/worker/index.ts       ← the file to read; every pattern is here
  src/worker/config.ts      the ONE module that knows any hostname
  src/worker/session.ts     AES-GCM sealed httpOnly cookie; no credential reaches JS
  src/worker/orgs.ts        which orgs this person linked to this app, and their wires
  src/ui/                   the SPA — its only API is this app's own /api/*
packages/create-primitives-app   npx create-primitives-app — scaffold a product monorepo
packages/home-connect     relying-app OIDC: startConnect → completeConnect
packages/interactions-client  typed ops: topics, messages, library, inbox
packages/catalog          every published @agenticprimitives package, import-checked
packages/dev-mcp          read-only Developer MCP server — release facts as tools
release-manifest.json     the release binding: pins, deployments, skills, endpoints
catalog/                  packages.json, contracts.json, skills.json — generated indexes
contracts/                abis/ + per-contract deployment records (generated)
skills/                   13 developer Agent Skills, projected to .claude/.cursor/.agents
                          (runtime playbooks live in the separate skills corpus — see skills/README.md)
articles/                 the 21-part LinkedIn series: the argument the kit backs up
docs/                     principles, architecture, SDK, CLI, API, troubleshooting
scripts/                  check-endpoints, check-packages, generate/validate-release, doctor
llms.txt                  machine-readable doc index
```

## Where to look, by intent

| Working on | Read |
| --- | --- |
| Anything, first time | `docs/principles.md`, then `apps/commons/src/worker/index.ts` |
| Starting a **new product** | `docs/getting-started.md` + `npx create-primitives-app` — do not fork Commons |
| Sign-in / OIDC / issuers | `packages/home-connect/src/connect.ts` + `origins.ts` |
| A new interactions op | `docs/interactions-api.md`, then `packages/interactions-client/src/client.ts` |
| npm packages a builder imports | `docs/sdk.md` |
| A refusal you do not understand | `docs/troubleshooting.md` — most are ceremonies, not bugs |
| Which package does X | `docs/packages.md` |
| A domain fact (whose treasury, who is a member) | `@agenticprimitives/ontology` — bind by IRI; never a prompt or a table |
| Which control stops what, and who holds it | `docs/controls-catalog.md`; the argument in `docs/rails-not-throttles.md` |
| What is being built, what is shipped, what is next | `docs/products.md` — offerings, products, the harness program, spec numbers |
| Why the design is this way | [the series](https://github.com/agentictrustlabs/agentic-primitives/blob/main/articles/README.md) — one idea a day |
| Contract addresses, delegation hashes | `docs/contracts.md` |
| Which exact versions belong together | `release-manifest.json` + `docs/release-binding.md` |
| Resolving an address or ABI | `contracts/deployments/` records — never copy from prose |
| Task-specific procedure | the matching skill in `skills/` |
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
  (`/deployments-json/base-sepolia`, `/deployments`, `/abi`). That is deliberate, not a broken
  package. The map is flat except `permissionlessSubregistries`, one typed-suffix subregistry each.
- **Two chains ship in the package.** Base Sepolia is public and verified by `doctor:full`. The
  estate chain (`34348`) is where `DigestBindingEnforcer` runs; its RPC is gated, so its records are
  resolved, never verified, from here.
- **A mandate is not a type.** It is a delegation carrying a `digestBinding` caveat and a `payment`
  caveat. Do not invent a `Mandate` object; do not let a plan lower a tool's declared risk.

## Validation

```sh
pnpm typecheck              # all workspace packages
pnpm check:endpoints        # the live rails, ~5s — catches drift nothing else can
pnpm check:packages         # all 75 published packages, imported for real
pnpm release:validate       # release surfaces consistent, ABI digests, override pins
pnpm doctor:full            # npm pins + endpoints + eth_getCode per deployment
pnpm --filter @starter/commons build
```

## Status

Reference deployments on Base Sepolia testnet; the mandate path is live on a private estate chain.
Sessions are demo-grade by design. The packages are alpha across two concurrent release lines
(`1.0.0-alpha.24` and `0.0.0-alpha.N`) — pin exactly, and pin the transitive tree with
`pnpm.overrides` (see the root `package.json`, or `catalog/packages.json` for the whole set).
