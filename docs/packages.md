# The package catalog

75 published libraries under `@agenticprimitives/*`. `packages/catalog` depends on every one of
them, so `pnpm install` in this repo pulls the whole surface and `pnpm check:packages` imports each
entry point for real rather than asserting from this table that it would work.

```sh
pnpm check:packages    # registry versions + a live import check for all 75
```

You will not use most of these. The **start here** set is six packages, and `apps/commons` uses
exactly those plus two workspace wrappers. The exact pins for this release are in
[`catalog/packages.json`](../catalog/packages.json) — resolve from there, never from prose.

---

## Start here

| Package | What it gives you |
| --- | --- |
| `types` | `Address`, `Hex`, `CanonicalAgentId`, `AgentType` — the branded types every other package speaks |
| `connect-client` | The relying-party OIDC flow: PKCE, authorize URL, `/token`, ES256 verification |
| `delegation` | Build, hash, and verify delegations; caveat encoders; token envelopes |
| `home` | The Home manifest schema and its fail-closed validators |
| `fabric` | Message envelopes, topic boards, inbox projections (`/messaging`, `/interactions` subpaths) |
| `contracts` | Deployed addresses and ABIs, as shipped data — for two chains |

---

## Identity & accounts

*The anchor, and everything that is a projection of it.*

| Package | |
| --- | --- |
| `types` | Cross-cutting branded types and chain primitives |
| `agent-account` | ERC-4337 account client; counterfactual addresses; batched execute calldata — owns the canonical anchor |
| `agent-naming` | Typed names (`.me`, `.org`, `.team`, `.svc`, `.treasury`, `.registry`): claim, resolve, reverse; the suffix names the agent's class and is checked on-chain |
| `agent-profile` | AP-native `AgentCard` schema, signed-card bundle, binding proofs — the A2A card is a projection of the profile |
| `agent-relationships` | Typed on-chain relationship edges `(subject, object, type)` |
| `agent-resolution` | Private / unlisted / pairwise resolution; sequenced, expiring service publications — **never** authority |
| `registry-resolution` | The composed typed resolver: name → subject → type → relationship → publication, returned as **separate signals**, never a trust score |
| `account-custody` | `CustodyPolicy` SDK: custodians, trustees, quorums, credential recovery — the address never changes |
| `related-agents` | Private person↔org links, held as vault credentials |
| `organization` | Membership, enrollment, `RoleAssignment`, revocation cascade — a role names responsibility, never permission |
| `identity-directory` (+ `-adapters`) | Evidence-backed directory read model and its backends |
| `browser-identity` | Browser sign-in seam: FedCM-first `chooseSignIn` |

## Authority & custody

*The permission slip, and the key that signs it.*

| Package | |
| --- | --- |
| `delegation` | **The core authority object.** EIP-712 delegations, caveats, hashing, tokens, on-chain revocation |
| `delegated-signer` | Named identity → SA → delegation-chain verify → KMS-backed signer. The service that acts as an agent never *is* that agent |
| `key-custody` | KMS-backed signers, envelope encryption, MAC providers |
| `key-authorization` | Policy-bound one-time `DecryptGrant` + KAS verification — the gate in front of every vault decryption |
| `agentic-authorization` | `/.well-known/agentic-authorization` builder + MCP authority extension |
| `entitlements` | Field-level, purpose-bound durable grants; fail-closed resolver |
| `ap-kms` | Manifest-driven KMS provisioning: HSM keys, IAM, delegate derivation, drift verify |
| `vault` | Delegated data-vault seam: read/write/list, classification taxonomy, object envelope |
| `vault-authority` | Vault-subject responsibility: compiles a `RoleAssignment` into record-scope grants; denies when the materializing wire is gone |
| `admission` | The admission boundary (ADR-0057): HTTPS required, mTLS optional, admission always |

## Connect & the Home

*The front door. WHO, never WHAT.*

| Package | |
| --- | --- |
| `connect` | The broker/Home side: sessions, OIDC minting, JWKS, assurance floors |
| `connect-auth` | Credential ceremonies: SIWE, passkey, session mint/verify, CSRF |
| `connect-client` | **The relying-app side.** What a third-party app uses |
| `fedcm-idp` / `fedcm-rp` | Browser-native FedCM, both halves |
| `home` | Portable Home manifest, surface descriptors, action cards, inbox bindings |

## Acting: the harness

*Planner proposes, mandate authorizes, executor acts, receipt proves.*

| Package | |
| --- | --- |
| `harness` | The authority-aware agent harness (spec 350): binds delegation mandates, the tool-policy risk ladder, and receipts to the orchestration loop's ports. Verifies before every step, re-verifies after every approval |
| `orchestration` | The vendor-free loop: intent → plan → execute → observe → re-plan; `Planner` and `ToolInvoker` ports; `InputRequired` prompts |
| `orchestration-anthropic` | The Anthropic `Planner` binding (tool use), Worker-friendly |
| `orchestration-openai-compat` | An OpenAI-compatible chat-completions binding: Groq, Ollama, OpenRouter — you supply `baseUrl` + model |
| `context` | The two-tier context contract: public knowledge vs a subject's private records; entity resolution that refuses to guess |
| `evaluation` | Truthfulness evaluation: cases seeded from live incidents, ground-truth probes, checks over the prose *and* the evidence |
| `service-agent` | Deterministic capability envelope: define → assert → entitle → delegate → plan → execute → receipt |

## Interaction & coordination

*Between agents, and between principals — two different planes.*

| Package | |
| --- | --- |
| `a2a` | Delegation-authorized A2A: Task / Message / Artifact runtime, agent cards, skill selectors |
| `fabric` | Exchanges, interactions, messaging, topic boards, the Cloudflare gateway adapter — bodies recipient-owned, vault-resident |
| `coordination` | Endeavors, outcome specifications, plans, participations — coordination *between* principals, never orchestration inside one |
| `collaboration` | Governed collaboration activities (huddles): scope, run, participant, lifecycle; admission as pure functions |
| `situations` | Situation records — membership, participation, consent, role bindings as facts |

## Capability & tools

*One noun — capability — defined once, projected everywhere.*

| Package | |
| --- | --- |
| `capability-claims` | Capability claims as verifiable credentials + `SkillDefinitionRegistry` helpers + the harness contract (`SKILL.md` frontmatter: risk, requirement, resource and authority args) |
| `agent-skills` | *Deprecated alias* → `capability-claims` |
| `tool-policy` | Tool classification, risk tiers, exact-call DSL, deterministic `evaluatePolicy()` — risk is declared by the tool, never by the plan |
| `mcp-runtime` | Delegation-gated MCP middleware, JTI replay protection |
| `mcp-protocol` | Conformant stateless MCP: negotiation, Streamable-HTTP integrity, `ap conform mcp` |
| `mcp-oauth` | RFC 9728 ingress adapter — an envelope, never the authority |
| `surface-catalog` | One descriptor per route/skill/tool → MCP tools, A2A skills, OpenAPI |

## Content & credentials

*Portable claims, and the evidence that travels with the agent.*

| Package | |
| --- | --- |
| `content-primitives` | **Referenced** content: address, commit, entitle, cite — never stores text |
| `content-storage` | **Stored** content: encrypted artifacts, bundles, storage ports, per-artifact entitlements |
| `verifiable-credentials` | W3C VC 2.0 signing and verification; RFC 8785 canonicalization; ERC-1271 verifier |
| `privacy-credentials` | Selective disclosure, pairwise pseudonyms |
| `attestations` | On-chain attestation registry, bilateral consent |
| `provenance` | PROV-O / P-Plan projector; the public-projection firewall |
| `verification-receipts` | A verifier's signed record of what it checked and found at time T |
| `witness` | Evidentiary dispute attestation over a record + receipt |
| `ontology` | The T-box, SHACL shapes, typed IRI constants, vault-record bindings — code binds to it by IRI |

## Commerce & engagement

*Discovery → willingness → authority. Nine steps grant nothing; the mandate is the only grant.*

| Package | |
| --- | --- |
| `payments` | Payment mandates, x402 / escrow / recurring rails, receipt VCs |
| `agreements` | Two-party agreements, commitment math, joint assertions |
| `intent-engagement` | Probe → response → offer → acceptance → mandate requirement → execute → receipt, as pure documents and deterministic reducers. Transport-free; grants nothing |
| `intent-marketplace` | Intents, offers, constraint matching, commitment handoff |
| `intent-resolver` | Intent → capability resolution |
| `fulfillment` | `FulfillmentCase` lifecycle, evidence and outcome issuance |

## Infrastructure

| Package | |
| --- | --- |
| `audit` | Append-only, hash-chained evidence events for every gated call |
| `chain-state` (+ `-viem`) | The chain-read port (revocation, signature, session reads with evidence), and its viem binding — `readContract` only |
| `contracts` | Solidity sources, ABIs, deployed addresses for Base Sepolia and the estate chain |
| `edge-runtime` / `edge-cloudflare` | Gateway assertions and the edge boundary — admission, never authority |
| `rate-control` (+ `-cloudflare`) | Rate limiting and hard budgets, portable and platform-bound |
| `registry-kit` | Build your own registry from SA-anchored primitives: admission receipts, lifecycle, binding proofs |
| `geo-features` | Geographic feature registry and geo claim VCs |

## Developer Kit

*The packages' own front door.*

| Package | |
| --- | --- |
| `devkit` | The `ap` CLI: `ap doctor` (doctrine gates as data + pure rules), `ap doctor --rules` (project one pinned rules source into `AGENTS.md` / `CLAUDE.md` / `.cursor/rules`), `ap upgrade` (every pin to one coherent exact set; stops for review when a definition's authority shape changes), `ap conform a2a\|mcp`, `ap test`, `ap mcp` (the read-only Developer MCP) |
| `create-app` | `npx @agenticprimitives/create-app my-product --template product-repo` — a product repository with exact pins, `agentic.lock.json`, `ap doctor` + `ap test` CI, and the projected rules |

`create-primitives-app` in this repo scaffolds a **relying app** against the live rails (Home,
A2A, vault). `@agenticprimitives/create-app` scaffolds a **product repository** in the shape the
substrate's own products use. They are complementary: start with the first to learn the ceremonies;
graduate to the second when you are building a product that owns a runtime.

---

## The dependency rule

Package boundaries are one-directional and there are no back-edges:

```
types ← agent-account ← delegation ← harness
              ↑             ↑
        account-custody   key-custody
```

If you find yourself wanting to import "upward", the thing you want is almost certainly a port that
should be **injected** by your app. That is why `content-storage` takes a `StorageProvider`, why
`content-primitives` takes a `verifySignature`, why `home` takes a `ManifestVerificationPort`, and
why `harness` takes a `Planner`, a `ToolInvoker`, and an approval port — the package stays at the
base of the graph and the app wires the concrete thing.

Copy the pattern. It is also what keeps these packages runnable in a Worker, where most concrete
implementations are not available.

## Versions

Alpha across the board; two release lines run concurrently (`1.0.0-alpha.24` for the original
core, `0.0.0-alpha.N` for everything that arrived later). Pin exactly, and pin the transitive tree
with `pnpm.overrides` — this repo's root `package.json` shows the shape. Mixing lines is the
fastest way to a type error that reads like a mystery.

Upstream now publishes a `canary` dist-tag on every commit alongside `alpha`. `npx ap upgrade
--canary` in a product repo rewrites every pin to one coherent canary set; `npx ap upgrade --pin
1.0.0-alpha.24` pins a named version. This kit's `catalog/packages.json` is the coherent set for
this release.

Two upstream packages are not yet published and so are not here: `acp` (an Agent Client Protocol
host binding that admits Claude Code, goose, or Codex as a workspace *member*, behind A2A) and
`runtime-member` (`ap runtime join|mcp|run`). They will appear in the catalog when they are.
