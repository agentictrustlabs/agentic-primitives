# Agentic Primitives

[![CI](https://github.com/agentictrustlabs/agentic-primitives/actions/workflows/ci.yml/badge.svg)](https://github.com/agentictrustlabs/agentic-primitives/actions/workflows/ci.yml)
[![npm org](https://img.shields.io/badge/npm-%40agenticprimitives-cb3837)](https://www.npmjs.com/org/agenticprimitives)
[![chain](https://img.shields.io/badge/chain-Base%20Sepolia%2084532-0052ff)](docs/contracts.md)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2020-339933)](package.json)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**The trust substrate for the agent economy.**

Every person, organization, and AI agent has one canonical on-chain identity. Custody, admission,
authority, resolution, responsibility, naming, credentials, and audit evidence are **one system**
— not eight vendors.

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
{
  session: idToken,              // WHO
  stewardship: delegationWire,   // MAY they act as this organization
}
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

### 4. Contracts and SDK are one artifact

TypeScript typehashes are locked to the Solidity constants. ABIs ship with the packages. You
cannot quietly copy an address from prose and drift from the chain. The contract layer and the SDK
co-evolve under the same checks — which is what "designed as one system" actually means.

### 5. You never hold the person's identity or their data

Your app is a **delegate**, never a custodian. Topics, posts, messages, and library artifacts go
in the **owner's vault**. If your store were wiped, the loss is a rebuild — never a bereavement.

A person who leaves your app keeps their conversations. A revoked grant stops you everywhere,
without your cooperation. A leaked credential of yours is something they revoke in one
transaction — never their identity.

---

## What it replaces

You would normally stitch these. Here each row shares one identity, one delegation model, and one
evidence trail — and the seams between rows are exactly where stitched stacks leak authority.

| You'd normally integrate… | Here it's one primitive |
| --- | --- |
| Privy / Dynamic / Auth0 / Okta | Sessions bound to the Smart Agent, not a vendor account |
| Safe / ZeroDev / Pimlico | ERC-4337 + ERC-7579 accounts; sponsored gas included |
| Turnkey / Fireblocks / cloud KMS | Signing infra plugs in; it never owns the identity |
| MetaMask Delegation Toolkit / session keys | On-chain caveats, revocable instantly |
| OAuth scopes / ABAC / Vault policies | Field-level, purpose-bound entitlements |
| App PII tables / custom encrypted stores | The owner's vault — you keep no copy |
| ENS / GoDaddy ANS / LF ANS | Names are facets; the address is the identity |
| MCP / A2A SDKs + custom auth | The same delegation on every hop |
| Google Workspace / Slack admin roles | A role names **responsibility**. The gate still checks a live delegation |
| Custom audit logs | Signed evidence, not a log you wrote |

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

## The live system

Three services, one chain. Nothing here is a mock.

```
  person ──▶ HOME     ceremony, custody, identity token (WHO)
                 │
             YOUR APP     a delegate — never a custodian
                 │
             A2A      verifies the delegation (WHAT)
                 │
             VAULT    encrypted, per-record, owner's
                 │
             CHAIN    revocations · ERC-1271 · names · accounts
```

**Home** is the person's origin — the only place a credential is used. **A2A** is the agent
boundary: token + delegation, re-checked on every hop. **The vault** is the owner's; your app
does not call it. **The chain** is the revocation and signature root.

How the pieces trust each other: [docs/architecture.md](docs/architecture.md).
Twelve rules, each enforced by a real gate: [docs/principles.md](docs/principles.md).

---

## Status

**Testnet / pilot-ready. Not production.** Reference deployments on Base Sepolia. Sessions are
demo-grade by design.

Works today: auth → account → custody → delegation → vault write → revoke, end to end.

The source monorepo publishes an
[open findings ledger](https://github.com/agentictrustlabs/agenticprimitives/blob/master/docs/audits/findings.yaml)
and keeps it CI-gated: a "closed" finding must anchor to real source or the build fails. Trust
infrastructure should be the most transparent code you depend on.

Learn the model here. Do not put real value through it.

---

## This repository

The public developer kit for that substrate: published
[`@agenticprimitives`](https://www.npmjs.com/org/agenticprimitives) packages, the contracts they
bind to, and the live Home / A2A / vault rails. Source, ADRs, and audits live in
[`agenticprimitives`](https://github.com/agentictrustlabs/agenticprimitives).

[Construct a project](docs/getting-started.md) · [Principles](docs/principles.md) ·
[Architecture](docs/architecture.md) · [Packages](docs/packages.md) ·
[Contracts](docs/contracts.md) · [Doc index](docs/README.md)

[CONTRIBUTING](CONTRIBUTING.md) · [SECURITY](SECURITY.md) · MIT
