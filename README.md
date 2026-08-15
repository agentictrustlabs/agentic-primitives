# Agentic Primitives

[![CI](https://github.com/agentictrustlabs/agentic-primitives/actions/workflows/ci.yml/badge.svg)](https://github.com/agentictrustlabs/agentic-primitives/actions/workflows/ci.yml)
[![npm org](https://img.shields.io/badge/npm-%40agenticprimitives-cb3837)](https://www.npmjs.com/org/agenticprimitives)
[![chain](https://img.shields.io/badge/chain-Base%20Sepolia%2084532-0052ff)](docs/contracts.md)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2020-339933)](package.json)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**npm packages + Ethereum contracts + live Home / A2A / MCP rails.**
Build an app that holds neither the person's identity nor their data.

This public repository is the developer kit: the published
[`@agenticprimitives`](https://www.npmjs.com/org/agenticprimitives) surface, the contracts those
packages agree with, the three services you call without deploying anything, and a CLI that
scaffolds a monorepo so Claude or Cursor can construct a product on top.

```sh
npx create-primitives-app@latest my-app
cd my-app
# register client_id at your Home — docs/register-your-app.md
cp apps/web/.dev.vars.example apps/web/.dev.vars
pnpm dev
```

From a clone: `pnpm create-app my-app`. Until the package is on npm, that and
`node packages/create-primitives-app/bin/cli.js` are the paths that work.

[Construct a project](docs/getting-started.md) · [CLI](docs/create-app.md) · [SDK](docs/sdk.md) ·
[Contracts](docs/contracts.md) · [Claude / Cursor](docs/vibe-coding.md)

---

## What you are building on

Three live services, one chain, 66 npm packages. Nothing here is a mock.

```
  person ──▶ HOME     www.impact-agent.me
             ceremony, custody, OIDC id_token (WHO)
                 │
  browser ──▶ YOUR APP     httpOnly cookie, proxies /api/*
                 │
             A2A      demo-a2a-production.…workers.dev
             verifies token + delegation (WHAT), serializes writes
                 │
             MCP      the vault — encrypted, per-record scope
                 │
             Base Sepolia 84532
             revocations · ERC-1271 · names · accounts
```

| Surface | What it is | How you use it |
| --- | --- | --- |
| **npm** `@agenticprimitives/*` | Identity, delegation, Connect, fabric, vault types, ABIs | Pin exactly. Start with [the six](docs/sdk.md) |
| **Contracts** | `DelegationManager`, name registry, ERC-4337 accounts, caveat enforcers | Import addresses from the package. Do not re-type them |
| **Home** | The only place a credential is used | `createHomeConnect` — you never run a ceremony |
| **A2A** | Agent boundary + `/interactions/*` | `createInteractionsClient` — server-side only |
| **MCP** | Encrypted vault | You do not call it. A2A does |

A person who leaves your app **keeps their conversations**. A revoked grant **stops you everywhere**,
without your cooperation. A leaked credential of yours is something they revoke in one transaction
— never their identity.

---

## The one thing to get right

> **A token says WHO. A delegation says WHAT.**
>
> The OIDC `id_token` proves identity and authorizes nothing. Authority is a separate on-chain
> artifact the person or organization signed, verified by ERC-1271 + caveats + an unrevoked check,
> on every call. If you find yourself gating a capability on a claim, a scope, or an audience,
> stop — that is the OAuth-shaped thinking this substrate exists to replace.

```ts
const start = await connect.startConnect({ agentName: 'nathan.impact' });
const { person, idToken, org } = await connect.completeConnect({ start, code, state });

await interactions.postToTopic(org.orgAgent, { topicId, text }, {
  session: idToken,                        // who
  stewardship: org.stewardshipDelegation,  // may they act as this organization
});
// The post lands in the ORGANIZATION's vault. Delete this app tomorrow and nobody loses it.
```

Twelve rules, each enforced by a real gate: [docs/principles.md](docs/principles.md).

---

## Construct a solution

This kit is set up so a developer — or an assistant — can **start a project**, not fork an example.

| You want | Do this |
| --- | --- |
| A new product | `npx create-primitives-app@latest` → [getting-started](docs/getting-started.md) |
| Connect / OIDC | `@starter/home-connect` · [register-your-app](docs/register-your-app.md) |
| Topics, messages, library, inbox | `@starter/interactions-client` · [interactions-api](docs/interactions-api.md) |
| Delegation hash, revoke, names | `@agenticprimitives/delegation` + `contracts` · [contracts](docs/contracts.md) |
| The rest of the 66 packages | [sdk](docs/sdk.md) · [packages](docs/packages.md) · `pnpm check:packages` |
| Claude or Cursor to write it | [vibe-coding](docs/vibe-coding.md) · `AGENTS.md` is already in the scaffold |

The generated `apps/web` is an empty product with Connect, org wires, and chain display already
correct. Add routes. Do not add a database for user content.

### What the CLI puts in the monorepo

```
my-app/
  AGENTS.md  CLAUDE.md  .cursor/rules/   assistants start correct
  docs/                                  principles, API, contracts, ceremonies
  packages/home-connect                  relying-app half of Connect
  packages/interactions-client           vault-backed ops
  apps/web                               your Worker + SPA
  pnpm.overrides                         the known-good @agenticprimitives tree
```

Same shape MetaMask's `create-gator-app`, wagmi's `create-wagmi`, and `create-t3-app` use: solve
the boring parts (workspace, pins, auth, types, assistant rules), leave the product to you.

---

## npm + contracts

**Start-here packages** — a relying app needs these, not the other sixty:

| Package | What it gives you |
| --- | --- |
| `@agenticprimitives/types` | `Address`, `Hex` — the branded types every other package speaks |
| `@agenticprimitives/connect-client` | PKCE, authorize URL, `/token`, ES256 verification |
| `@agenticprimitives/delegation` | Build, hash, verify EIP-712 delegations and caveats |
| `@agenticprimitives/home` | Home manifest schema, fail-closed validators |
| `@agenticprimitives/fabric` | Message envelopes, topic boards, inbox projections |
| `@agenticprimitives/contracts` | Deployed addresses and ABIs, as shipped data |

```ts
import deployments from '@agenticprimitives/contracts/deployments-json/base-sepolia';
// Flat map of name → address. The values your UI shows and the gates read are the same artifact.
```

`contracts` has no default entry — only subpaths. That is deliberate.

**Contracts your app actually touches** (almost none, directly — you *show* them):

| Contract | Answers |
| --- | --- |
| `delegationManager` | `isRevoked(hash)` — is this grant dead? |
| `agentNameRegistry` | Who claimed this name |
| `agentAccountFactory` | Counterfactual address for a set of custodians |
| `universalSignatureValidator` | ERC-1271 / ERC-6492, including undeployed accounts |

Caveat enforcers bound a wire (`timestamp`, `allowedTargets`, `allowedMethods`, `value`, `quorum`).
A stewardship wire and a data-access grant have opposite shapes; the gate rejects a replay on
shape before it checks the signature.

Full catalog: [docs/packages.md](docs/packages.md). Addresses: [docs/contracts.md](docs/contracts.md).

```sh
pnpm check:packages    # all 66, imported for real
pnpm check:endpoints   # the live rails, ~5s
```

---

## Home, A2A, MCP — what you leverage

**Home** is the person's origin. Passkey, wallet, Google, email — none of that happens on your
site. A named person lives at `<label>.impact-agent.me`; accept the apex and any single-label
subdomain of the zone, nothing else. Your app cannot create an identity or an organization. It
requests the ceremony.

**A2A** is the agent boundary. It verifies the token, verifies the delegation, and serializes
writes per Smart Agent address. `/interactions/*` is CSRF-exempt because the session is in the
body — which is why these calls belong on your server. Agent cards live at
`/.well-known/agent-card.json` and on `<handle>.impact-agent.io`.

**MCP** is the vault: encrypted, per-record delegation scope, replay-protected. Your app does not
call it; on the live deployment it cannot. Everything reaches storage through A2A so the
delegation chain stays intact.

How the pieces trust each other: [docs/architecture.md](docs/architecture.md).
Exact routes: [docs/live-endpoints.md](docs/live-endpoints.md).

---

## Build with Claude or Cursor

The substrate looks like OAuth + REST and is not. Assistants confidently produce bearer-as-authority,
app-owned user data, and fallback chains — all of which typecheck.

`AGENTS.md` and `.cursor/rules/` ship in every scaffold. Put `docs/principles.md` in front of the
model before it writes code. [vibe-coding.md](docs/vibe-coding.md) has prompts that work and
prompts that produce wrong code.

`llms.txt` in this repo is the machine-readable index.

---

## The example

[`apps/commons`](apps/commons) is a complete community app — connect, discuss, message, library.
One Worker, no database. It is here so you can copy patterns, not so you ship it.

**<https://commons-production.richardpedersen3.workers.dev>** — deployed. Sign in, post, then open
**Under the hood** and look up the delegation hash on Basescan.

```sh
git clone https://github.com/agentictrustlabs/agentic-primitives.git
cd agentic-primitives && pnpm install
cp apps/commons/.dev.vars.example apps/commons/.dev.vars
pnpm dev
```

---

## Docs

| | |
| --- | --- |
| [Construct a project](docs/getting-started.md) | Scaffold → register → first vault write |
| [create-primitives-app](docs/create-app.md) | CLI flags and what it generates |
| [Principles](docs/principles.md) | Twelve rules, each enforced by a gate |
| [Architecture](docs/architecture.md) | Home, A2A, MCP, chain — who trusts whom |
| [SDK](docs/sdk.md) | npm packages a builder actually imports |
| [Packages](docs/packages.md) | All 66 |
| [Contracts](docs/contracts.md) | Addresses, caveats, how to read the chain |
| [Interactions API](docs/interactions-api.md) | Ops, including what you cannot call |
| [Register your app](docs/register-your-app.md) | `client_id`, redirect URIs, templates |
| [Live endpoints](docs/live-endpoints.md) | Discovery, JWKS, interactions |
| [Troubleshooting](docs/troubleshooting.md) | Most refusals are ceremonies |
| [Claude / Cursor](docs/vibe-coding.md) | Instincts to override |

Full index: [docs/README.md](docs/README.md) · machine-readable: [llms.txt](llms.txt)

---

## Release binding — resolve, never copy

[`release-manifest.json`](release-manifest.json) binds this release: 65 exact
`@agenticprimitives/*` pins ([catalog/](catalog/)), 34 contract deployment records with ABI
digests ([contracts/deployments/](contracts/deployments/)), 62 released ABIs, 13 developer
[Agent Skills](skills/), and the live endpoints. All generated, all CI-checked —
[docs/release-binding.md](docs/release-binding.md).

Point Claude or Cursor at the read-only [Developer MCP server](packages/dev-mcp/README.md)
(`cp .mcp.json.example .mcp.json` or `cp .cursor/mcp.json.example .cursor/mcp.json`) and your
coding agent resolves versions, addresses, and ABIs instead of guessing them.

---

## Quality gates

Every claim in this kit is checked by something that can fail:

```sh
pnpm typecheck          # strict TS across the workspace — noUncheckedIndexedAccess is on
pnpm test               # includes the create-primitives-app smoke test
pnpm check:endpoints    # the live rails, ~5s — catches drift nothing else can
pnpm check:packages     # all 66 published packages, imported for real
pnpm release:validate   # manifest, catalogs, deployment records, checksums agree
pnpm doctor:full        # npm pins exist, rails respond, every address has code on-chain
```

CI additionally scaffolds a fresh project and proves it installs, typechecks, and builds — the
same pipeline a new developer hits in their first ten minutes.

## Contributing & security

[CONTRIBUTING.md](CONTRIBUTING.md) · [SUPPORT.md](SUPPORT.md) ·
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

Security reports go through private vulnerability reporting, never a public issue:
[SECURITY.md](SECURITY.md).

## Status

Reference deployments on **Base Sepolia**. Sessions are demo-grade by design; production custody
is the job of the KMS backends in `@agenticprimitives/key-custody`. Packages are alpha across two
release lines — pin exactly.

Learn the model here. Do not put real value through it.

## License

MIT. The `@agenticprimitives/*` packages carry their own licenses.
