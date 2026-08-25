# Agentic Primitives

[![CI](https://github.com/agentictrustlabs/agentic-primitives/actions/workflows/ci.yml/badge.svg)](https://github.com/agentictrustlabs/agentic-primitives/actions/workflows/ci.yml)
[![npm org](https://img.shields.io/badge/npm-%40agenticprimitives-cb3837)](https://www.npmjs.com/org/agenticprimitives)
[![chain](https://img.shields.io/badge/chain-Base%20Sepolia%2084532-0052ff)](docs/contracts.md)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2020-339933)](package.json)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**The trust substrate for the agent economy** — published as npm packages, Ethereum contracts, and
three live rails. Every person, organization, and AI agent has one canonical on-chain identity.
Custody, admission, authority, resolution, responsibility, naming, credentials, and audit evidence
are one system, not eight vendors.

This repository is the **developer kit**: the
[`@agenticprimitives`](https://www.npmjs.com/org/agenticprimitives) surface those packages agree
with, the contracts they bind to, the Home / A2A / MCP services you call without deploying
anything, and a CLI that scaffolds a monorepo so you — or Claude or Cursor — can construct a
product on top. Source, ADRs, and the open findings ledger live in
[`agenticprimitives`](https://github.com/agentictrustlabs/agenticprimitives).

```sh
npx create-primitives-app@latest my-app
cd my-app
# register client_id at your Home — docs/register-your-app.md
cp apps/web/.dev.vars.example apps/web/.dev.vars
pnpm dev
```

[Construct a project](docs/getting-started.md) · [CLI](docs/create-app.md) · [SDK](docs/sdk.md) ·
[Contracts](docs/contracts.md) · [Claude / Cursor](docs/vibe-coding.md)

---

## The question with real money behind it

AI agents are getting wallets, names, registries, and payment rails — this year. ERC-8004 agent
identity went to mainnet. MetaMask shipped an Agent Wallet. GoDaddy launched an Agent Naming
Service. In June 2026 the Linux Foundation announced the
[Agent Name Service](https://www.linuxfoundation.org/press/linux-foundation-announces-intent-to-launch-agent-name-service-to-establish-trusted-identity-infrastructure-for-ai-agents)
to anchor agent identity to DNS at internet scale. x402 made machine payments real.

Every team building agentic products now faces the same question:

> **When an agent acts on a human's behalf — who authorized what, under which limits, provable to whom?**

The standard answer is a stitch-job: Privy + Safe + Pimlico + ENS + EAS + Turnkey + a policy
engine + an audit log. Eight vendors. Eight identity models. Zero coherent trust chain. The
stitched stack cannot answer the question, because no two of its parts agree on who "the agent"
even is.

**This is the other answer:** 66 TypeScript packages and the contracts they are CI-locked to,
designed as one system, all pointing at one canonical Smart Agent address. A person who leaves
your app keeps their conversations. A revoked grant stops you everywhere, without your
cooperation. A leaked credential of yours is something they revoke in one transaction — never
their identity.

**The one-sentence pitch:** when an AI agent spends money or touches data on your behalf, this
stack can prove exactly who allowed it, exactly what was allowed, and lets you take that
permission back at any moment — without trusting any single vendor.

---

## In plain terms

An AI agent that acts for you is like a new kind of employee. To trust an employee, a company
needs a few boring, non-negotiable things — and today's agent stacks bolt each one on from a
different vendor. This project builds them as **one system**:

| What a trustworthy employee needs | What this project provides |
| --- | --- |
| **One permanent identity** that doesn't change when they lose their badge | Every person, org, and agent has one permanent on-chain address. Lose your login? You replace the *key*, never the *identity* — everything you set up keeps working. |
| **Permission slips, not master keys** | You never hand an app or agent your keys. You hand it a signed, narrow permission — "these two actions, until Friday, max $50" — and you can revoke it instantly. |
| **A front desk** that checks who's walking in | An edge layer admits or rejects traffic — but it only guards the door; it never decides what anyone is *allowed to do* inside. |
| **A locked filing cabinet** with per-folder access | Private data lives in the owner's vault, not your database. Access is granted field-by-field, for a stated purpose, with a key-release step and an audit event on every read. |
| **A tamper-evident logbook** | Every action leaves signed evidence: who authorized what, under which limits, verifiable after the fact. |
| **A named job, not a master key** | A role says what you are expected to care for. It never unlocks the cabinet by itself. Only a signed, revocable permission does that. |
| **A private directory, not a phone book** | Partners can be invited to find a nameless agent and its current endpoint — without listing it publicly, and without that invitation becoming a license to act. |

Twelve rules, each enforced by a real gate: [docs/principles.md](docs/principles.md).

---

## Five things that are true here and almost nowhere else

### 1. The address IS the identity

Every person, organization, service agent, and treasury is an ERC-4337 Smart Agent address. Names,
passkeys, Google logins, SIWE wallets, profiles, credentials, registry entries — all of them are
**replaceable facets pointing at that one anchor**.

Lose your passkey? Recovery rotates the credential, **never the address**. Every delegation your
agent ever issued stays valid. Your name still resolves. Identity persists; credentials rotate.

### 2. A token says WHO. A delegation says WHAT.

The OIDC `id_token` proves identity and authorizes nothing. Authority is a separate on-chain
artifact the person or organization signed, verified by ERC-1271 + caveats + an unrevoked check,
**on every call**.

The same EIP-712 delegation authorizes a web app session, an A2A agent call, an MCP tool
invocation, and an on-chain spend. *"These two actions, until Friday, max $50, and I can revoke
it instantly"* is one primitive, not four products. Apps receive **revocable, scoped authority —
never keys**.

```ts
const start = await connect.startConnect({ agentName: 'nathan.impact' });
const { person, idToken, org } = await connect.completeConnect({ start, code, state });

await interactions.postToTopic(org.orgAgent, { topicId, text }, {
  session: idToken,                        // who
  stewardship: org.stewardshipDelegation,  // may they act as this organization
});
// The post lands in the ORGANIZATION's vault. Delete this app tomorrow and nobody loses it.
```

If you find yourself gating a capability on a claim, a scope, or an audience — stop. That is the
OAuth-shaped thinking this substrate exists to replace.

### 3. Custody, admission, authority, resolution, and responsibility are five separate things

Most stacks collapse "who signed," "may this request enter," "what may this actor do," "how do I
reach you," and "what are they supposed to own" into one service account or one workspace-admin
role. We keep them apart. A "yes" to one is never a "yes" to another.

| Concern | The question | A yes does **not** mean |
| --- | --- | --- |
| **Custody** | Who signed — and which credential controls this Smart Agent? | They may act |
| **Admission** | May these bytes enter, for this route? | They may do anything inside |
| **Authority** | What may this principal do, on whose behalf, to which fields? | They control the account |
| **Resolution** | May this party discover how to reach this agent? | They may use it |
| **Responsibility** | What are they expected to care for, in this workspace? | They have permission to act |

Being findable is never permission to act. A workspace role is never permission to act. A
workspace is not an agent — it is a purpose-bound coordination plane. It has no Smart Agent
address, holds no custody, and cannot sign. Switching workspace switches **context**, not identity.

That separation is what makes the primitives composable: swap the edge, add a KMS custodian, issue
a new delegation, or reassign a role without re-earning trust anywhere else.

How the live pieces fit: [docs/architecture.md](docs/architecture.md).

### 4. Contracts and SDK are one artifact

TypeScript typehashes are locked to the Solidity constants. ABIs ship with the packages. This
kit's [`release-manifest.json`](release-manifest.json) binds the exact npm pins, the contract
deployment records, and the live endpoints for this release. You cannot quietly copy an address
from prose and drift from the chain.

```ts
import deployments from '@agenticprimitives/contracts/deployments-json/base-sepolia';
// Flat map of name → address. The values your UI shows and the gates read are the same artifact.
```

`@agenticprimitives/contracts` has no default entry — only subpaths. That is deliberate.

### 5. You never hold the person's identity or their data

Your app is a **delegate**, never a custodian. Privileged calls run on your server. The browser
gets an `httpOnly` cookie it cannot read. Topics, posts, messages, and library artifacts go in the
**owner's vault**. If your store were wiped, the loss is a rebuild — never a bereavement.

A refusal (`storage_not_enabled`, `messaging_not_approved`, `read_grant_absent`, `wire_absent`)
means a person must sign something at their **Home**, with a credential that does not exist on
this origin. Render a link. Never retry, never work around, never fake success.

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

**Home** is the person's origin. Passkey, wallet, Google, email — none of that happens on your
site. A named person lives at `<label>.impact-agent.me`; accept the apex and any single-label
subdomain of the zone, nothing else. Your app cannot create an identity or an organization. It
requests the ceremony.

**A2A** verifies the token, verifies the delegation, and serializes writes per Smart Agent
address. `/interactions/*` is CSRF-exempt because the session is in the body — which is why those
calls belong on your server.

**MCP** is the vault: encrypted, per-record delegation scope, replay-protected. Your app does not
call it; on the live deployment it cannot.

Exact routes: [docs/live-endpoints.md](docs/live-endpoints.md).

---

## What it replaces

You would normally stitch these. Here each row shares one identity, one delegation model, and one
evidence trail — and the seams between rows are exactly where stitched stacks leak authority.

| You'd normally integrate… | Here it's… |
| --- | --- |
| Privy / Dynamic / Auth0 / Okta | `@agenticprimitives/connect-client` — sessions bound to the Smart Agent, not a vendor account |
| Safe / ZeroDev / Pimlico | `@agenticprimitives/agent-account` + `contracts` — ERC-4337 + ERC-7579, paymaster included |
| Turnkey / Fireblocks / cloud KMS | `@agenticprimitives/key-custody` — signing infra plugs in; it never owns the identity |
| MetaMask Delegation Toolkit / session keys | `@agenticprimitives/delegation` — caveats enforced on-chain, revocable instantly |
| OAuth scopes / ABAC / Vault policies | `@agenticprimitives/entitlements` + `key-authorization` — field-level, purpose-bound |
| App PII tables / custom encrypted stores | The owner's vault, via A2A — you keep no copy |
| ENS / GoDaddy ANS / LF ANS | `@agenticprimitives/agent-naming` — names are facets; the address is the identity |
| `@modelcontextprotocol/sdk` + custom auth | `@agenticprimitives/mcp-runtime` — MCP tools gated by the same delegations |
| `@a2aproject/a2a-js` + a task store | `@agenticprimitives/a2a` — delegation-authorized Task / Message / Artifact |
| Google Workspace / Slack admin roles | A role names **responsibility**. The gate still checks a live delegation |
| Custom audit logs | `@agenticprimitives/audit` + `verification-receipts` — signed evidence, not a log you wrote |

The full 66-package catalog, grouped: [docs/packages.md](docs/packages.md).

The seam every registry still skips: **discovery ≠ willingness ≠ authority**. A listing that says
"this agent appears relevant" is not "this agent has read this exact intent and agrees to fulfil
it on these terms." Authority is created only when a mandate is signed — nine steps before that
grant nothing.

---

## Person, Organization, and Service Agents

All three are the same thing underneath — an ERC-4337 Smart Agent address with an on-chain
`agentKind` (`person` \| `org` \| `service`). What differs is who controls them.

| Actor | What it is | Control | Acts |
| --- | --- | --- | --- |
| **Person SA** | The human's canonical agent — the only direct user→agent link | Passkey / custodian(s) | Issues delegations to apps, orgs, and service agents |
| **Organization SA** | A collective agent whose members are other Smart Agents, not users | Quorums, trustees, timelocks | Grants scoped authority to members and counterparties |
| **Service Agent SA** | An autonomous on-chain service (treasury, A2A/MCP hosts) | Owned by an org; capabilities bounded by caveats | Executes only what its organization granted, and narrower |

A human controls exactly one Person Smart Agent. Every cross-agent action after that is a
delegation between Smart Agents. The user never appears inside an authority chain — their agent
does.

A name is a locator, never the trust root. There is no global certificate authority. Custody keys
control the SA; publication keys advertise an endpoint; a delegation says what may be done;
knowing how to reach someone is never a certificate to spend.

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

**Start-here packages** — a relying app needs these, not the other sixty:

| Package | What it gives you |
| --- | --- |
| `@agenticprimitives/types` | `Address`, `Hex` — the branded types every other package speaks |
| `@agenticprimitives/connect-client` | PKCE, authorize URL, `/token`, ES256 verification |
| `@agenticprimitives/delegation` | Build, hash, verify EIP-712 delegations and caveats |
| `@agenticprimitives/home` | Home manifest schema, fail-closed validators |
| `@agenticprimitives/fabric` | Message envelopes, topic boards, inbox projections |
| `@agenticprimitives/contracts` | Deployed addresses and ABIs, as shipped data |

Contracts your app actually *shows* (the gates read them): `delegationManager` (`isRevoked`),
`agentNameRegistry`, `agentAccountFactory`, `universalSignatureValidator`. Addresses:
[docs/contracts.md](docs/contracts.md).

```sh
pnpm check:packages    # all 66, imported for real
pnpm check:endpoints   # the live rails, ~5s
```

---

## Build with Claude or Cursor

The substrate looks like OAuth + REST and is not. Assistants confidently produce
bearer-as-authority, app-owned user data, and fallback chains — all of which typecheck.

`AGENTS.md` and `.cursor/rules/` ship in every scaffold. Put [docs/principles.md](docs/principles.md)
in front of the model before it writes code. [vibe-coding.md](docs/vibe-coding.md) has prompts that
work and prompts that produce wrong code.

Point the agent at the read-only [Developer MCP](packages/dev-mcp/README.md)
(`cp .mcp.json.example .mcp.json`) so it resolves versions, addresses, and ABIs instead of guessing
them. [`llms.txt`](llms.txt) is the machine-readable index.

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
| [Release binding](docs/release-binding.md) | Pins, deployment records, doctor |

Full index: [docs/README.md](docs/README.md) · Source, ADRs, audits:
[agenticprimitives](https://github.com/agentictrustlabs/agenticprimitives)

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

## Status

**Testnet / pilot-ready. Not production.** Reference deployments on **Base Sepolia**. Sessions are
demo-grade by design; production custody is the job of the KMS backends in
`@agenticprimitives/key-custody`. Packages are alpha across two release lines — pin exactly.

Works today: auth → account → custody → delegation → vault write → MCP/A2A → revoke, end to end,
behind `check:packages`, `check:endpoints`, and `doctor:full`.

Learn the model here. Do not put real value through it.

The source monorepo publishes an [open findings ledger](https://github.com/agentictrustlabs/agenticprimitives/blob/master/docs/audits/findings.yaml)
and keeps it CI-gated: a "closed" finding must anchor to real source or the build fails. Trust
infrastructure should be the most transparent code you depend on.

## Contributing & security

[CONTRIBUTING.md](CONTRIBUTING.md) · [SUPPORT.md](SUPPORT.md) ·
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

Security reports go through private vulnerability reporting, never a public issue:
[SECURITY.md](SECURITY.md).

## License

MIT. The `@agenticprimitives/*` packages carry their own licenses.
