# The package catalog

66 published libraries under `@agenticprimitives/*`. `packages/catalog` depends on every one of
them, so `pnpm install` in this repo pulls the whole surface and `pnpm check:packages` imports each
entry point for real rather than asserting from this table that it would work.

```sh
pnpm check:packages    # registry versions + a live import check for all 66
```

You will not use most of these. The **start here** set is six packages, and `apps/commons` uses
exactly those plus two workspace wrappers.

---

## Start here

| Package | What it gives you |
| --- | --- |
| `types` | `Address`, `Hex`, `CanonicalAgentId`, `AgentType` — the branded types every other package speaks |
| `connect-client` | The relying-party OIDC flow: PKCE, authorize URL, `/token`, ES256 verification |
| `delegation` | Build, hash, and verify delegations; caveat encoders; token envelopes |
| `home` | The Home manifest schema and its fail-closed validators |
| `fabric` | Message envelopes, topic boards, inbox projections (`/messaging`, `/interactions` subpaths) |
| `contracts` | Deployed addresses and ABIs, as shipped data |

---

## Identity & accounts

| Package | |
| --- | --- |
| `types` | Cross-cutting branded types and chain primitives |
| `agent-account` | ERC-4337 account client; counterfactual addresses; batched execute calldata |
| `agent-naming` | Name claiming, resolution, reverse resolution |
| `agent-profile` | Profile records and the on-chain resolver |
| `agent-relationships` | Typed relationships between agents |
| `agent-resolution` | Private / unlisted / pairwise resolution — **never** authority |
| `account-custody` | Custodian sets, thresholds, credential rotation |
| `related-agents` | Private person↔org links, held as vault credentials |
| `organization` | Organization shapes and lifecycle |
| `identity-directory` (+ `-adapters`) | Directory abstraction and its backends |
| `browser-identity` | Browser-side credential helpers |

## Authority & custody

| Package | |
| --- | --- |
| `delegation` | **The core authority object.** EIP-712 delegations, caveats, hashing, tokens |
| `delegated-signer` | Signing under a delegation |
| `key-custody` | KMS-backed signers, envelope encryption, MAC providers |
| `key-authorization` | Which key may act for which agent |
| `agentic-authorization` | The authorization decision surface |
| `entitlements` | Issue, check, and revoke entitlements |
| `ap-kms` | KMS port and its adapters |
| `vault` | Vault contracts and record scoping |
| `vault-authority` | Subject-scoped vault authority — **not yet published** |
| `admission` | The admission boundary (ADR-0057) |

## Connect & the Home

| Package | |
| --- | --- |
| `connect` | The broker/Home side: sessions, OIDC minting, JWKS |
| `connect-auth` | Credential ceremonies: SIWE, passkey, session mint/verify, CSRF |
| `connect-client` | **The relying-app side.** What a third-party app uses |
| `fedcm-idp` / `fedcm-rp` | Browser-native FedCM, both halves |
| `home` | Portable Home manifest, action cards, inbox projections |

## Interaction & coordination

| Package | |
| --- | --- |
| `a2a` | Agent-to-agent primitives, agent cards, skill selectors |
| `fabric` | Exchanges, interactions, messaging, topic boards, the Cloudflare gateway adapter |
| `coordination` | Endeavors, plans, contributions |
| `situations` | Situation records — membership, participation, consent as facts |
| `orchestration` (+ `-anthropic`) | The planner port, and its Anthropic binding |
| `service-agent` | Deterministic compile/run target for agent plans |

## Capability & tools

| Package | |
| --- | --- |
| `agent-skills` | Capability declarations and their projections |
| `capability-claims` | Capability claims as verifiable credentials |
| `tool-policy` | Tool classification and risk tiers |
| `mcp-runtime` | Delegation-gated MCP middleware |
| `mcp-protocol` | Protocol types |
| `mcp-oauth` | RFC 9728 ingress adapter — an envelope, never the authority |
| `surface-catalog` | What an agent exposes, catalogued |

## Content & credentials

| Package | |
| --- | --- |
| `content-primitives` | **Referenced** content: address, commit, entitle, cite — never stores text |
| `content-storage` | **Stored** content: encrypted artifacts, bundles, storage ports |
| `verifiable-credentials` | W3C VC 2.0 signing and verification; RFC 8785 canonicalization |
| `privacy-credentials` | Selective disclosure |
| `attestations` | On-chain attestation registry |
| `provenance` | PROV-O provenance records |
| `verification-receipts` | Receipts for verifications performed |
| `witness` | Witnessing and co-signature |
| `ontology` | The T-box, SHACL shapes, and term registry |

## Commerce & fulfilment

| Package | |
| --- | --- |
| `payments` | Payment mandates, x402, receipts |
| `agreements` | Two-party agreements and consent digests |
| `intent-marketplace` | Intents, offers, matching |
| `intent-resolver` | Intent → capability resolution |
| `fulfillment` | Tasks and completion |

## Infrastructure

| Package | |
| --- | --- |
| `audit` | Evidence events for every gated call |
| `chain-state` (+ `-viem`) | The chain-read port, and its viem binding |
| `contracts` | Solidity sources, ABIs, deployed addresses |
| `edge-runtime` / `edge-cloudflare` | Gateway assertions and the edge boundary |
| `rate-control` (+ `-cloudflare`) | Rate limiting, portable and platform-bound |
| `registry-kit` | Build your own registry from SA-anchored primitives |
| `geo-features` | Geographic feature registry |

---

## The dependency rule

Package boundaries are one-directional and there are no back-edges:

```
types ← agent-account ← delegation ← mcp-runtime
              ↑             ↑
        account-custody   key-custody
```

If you find yourself wanting to import "upward", the thing you want is almost certainly a port that
should be **injected** by your app. That is why `content-storage` takes a `StorageProvider`, why
`content-primitives` takes a `verifySignature`, and why `home` takes a `ManifestVerificationPort` —
the package stays at the base of the graph and the app wires the concrete thing.

Copy the pattern. It is also what keeps these packages runnable in a Worker, where most concrete
implementations are not available.

## Versions

Alpha across the board; two release lines run concurrently (`1.0.0-alpha.21` and `0.0.0-alpha.N`).
Pin exactly, and pin the transitive tree with `pnpm.overrides` — this repo's root `package.json`
shows the shape. Mixing lines is the fastest way to a type error that reads like a mystery.
