# The controls catalog

Every control the AI Kill Switch Act, the Lords amendment, the CISO surveys and the enterprise
governance frameworks are asking for — mapped to the mechanism that provides it here, the package
or contract that enforces it, the spec of record, and an honest status. Companion to
[rails-not-throttles.md](./rails-not-throttles.md).

The rule for this table: a row says *what enforces it*, never *what promises it*. A comment, a
prompt, or a playbook that says "every payment leaves a receipt" is not a control; the receipt is.

Status legend: **live** — enforced and gated nightly on a deployment · **shipped** — in published
packages/contracts · **partial** — the mechanism exists; a stated piece is missing · **specified** —
spec of record exists, not built.

---

## 1. Stop it

*"…the technical capability to throttle, suspend or shut down…" — AI Kill Switch Act (July 2026).
"…authority to shut down a large AI system…" — Lords amendment (3 Sept 2026).*

| What is asked for | The mechanism here | Enforced by | Spec | Status |
| --- | --- | --- | --- | --- |
| Stop **one** agent, now, without stopping the rest | The principal revokes the delegation on chain. Every gate reads `isRevoked` on its next step; the step is a terminal denial; enforcers revert at commit | `DelegationManager.isRevoked`; `delegation`, `chain-state`; the harness's per-step verify | 350, 362, ADR-0013 | **live** |
| Stop **an app** everywhere it holds authority | Revoke the stewardship wire it was granted. The app stops at every gate that checks — including gates run by operators you never met | `delegation`; the Home's grants screen (revoke any grant by digest) | 400 W2 (B4) | **live** |
| Stop **a service that signs as an agent** | The service never custodies the identity; it holds one wire to its own session key, one selector, pinned targets, time-bound. Revoke the wire; the identity is untouched | `delegated-signer`, `key-custody`; ERC-1271 against the delegator | 329 §3.1, ADR-0019 | **live** |
| Stop **a runtime that already exists** (Claude Code, goose, Codex) | It joins a workspace as a `.svc` member under a revocable session wire and speaks A2A as itself; revoke the wire | `acp`, `runtime-member` (unpublished); `a2a` | 372 S3, 400 W1 | **partial** — built, packages not yet on npm |
| A stop that is **selective** by act, not by system | Authority is per delegation, per caveat, per intent digest; a mandate covers one act. Withdraw one without touching the others | `delegation` caveats; `DigestBindingEnforcer`, `PaymentEnforcer` | 336 §8.3, 351 | **live** (estate chain) |
| A stop a **compromised runtime cannot skip** | The caveat enforcers run in the same transaction as the act. A runtime that skips its own checks has no transaction to sign for | `DelegationManager` + enforcers, on chain | 202, 351 §3 | **shipped**; mandate enforcers live on the estate chain, ABIs in every release |
| A stop that **holds across a pause** | Resuming after a human approval re-verifies. A checkpointed "approved" is never sufficient; a revocation during the pause is a terminal denial | `harness`, the durable-step port (`DurableStepPort`, `TerminalDenial`) | 362 §0.1 | **live** |
| A **system-wide** pause, governed | `AgenticGovernance` pause behind a `TimelockController` — a governance act with a delay, not a switch an operator flips | contracts `AgenticGovernance`, `GovernanceManaged` | contracts spec | **shipped** (Base Sepolia) |
| Throttle the **rate** of an agent | Rate limits and hard budgets per Smart Agent at the edge; trigger runs carry budgets | `rate-control`, `rate-control-cloudflare` (`SmartAgentBudgetDO`); `edge-runtime` | 288, 375 | **live** |
| A stop the **runtime's operator cannot veto** | The principal holds revocation; a registry can delist but never revoke a grant it never issued; a resolver returns addresses, never credentials | ADR-0038, ADR-0056 | 338, 346 | **live** |

**What is not here:** push notification of revocation to peers holding live grants (planned; will be
consumed as a reason to re-verify, never as a verdict) · a published propagation latency (bound is one
block + one read; unmeasured) · the obligation/depth enforcers (specified).

---

## 2. Know what it did

*"…to report incidents and preserve forensic records…" — AI Kill Switch Act. "Half of enterprises
had an incident tied to an unauthorized or misconfigured agent." — DigiCert, 2026.*

| What is asked for | The mechanism here | Enforced by | Spec | Status |
| --- | --- | --- | --- | --- |
| A record of **every protected act**: who, under what, what ran, what changed | A step receipt: tool · declared risk · capability · mandate ref · verifier decision · approvals over which digest · idempotency key · input digest · tx hash · playbook digest | `harness` receipts; `audit` (hash-chained sink) | 350, 354 K4 | **live** |
| A record the **runtime does not own** | Receipts land in the owner's vault as a PROV-O / P-Plan graph; the runtime holds a cache | `provenance`; the vault via `interactions` | 381, 389, ADR-0055 | **live** |
| A record a **third party can verify** without trusting the operator | A public projection of anchored digests only; a counterparty recomputes a held receipt's digest, checks the tx and the mandate's `isRevoked` on chain, with none of our services trusted | `provenance` public projector; `verify-receipt-recompute` (nightly) | 395 | **live** |
| **Tamper evidence** | Each audit row commits to the previous; the middle cannot be rewritten unnoticed | `audit` | 303, 316 §6 | **shipped** |
| **Which playbook version** shaped the act | The compiled behaviour definition is digested at load and stamped on every receipt; `skill-provenance/v1` on A2A artifacts is verifiable against the corpus's Merkle log | `capability-claims`; the skills corpus validator | 354, skills corpus | **live** |
| The **authority chain**, whole, on the receipt | Every hop of an attenuated delegation chain is assembled, verified end to end, and named on the receipt | `delegation` chain assembly + verifier port | 383 | **live** |
| **Operational** traces beside the evidence | OpenTelemetry spans for the authority stages, the planner's call and the outcome, bridged to PROV; W3C Trace Context in and out | `orchestration` projections; `audit` | 390 | **shipped** (OTLP export is a Ring-1 binding) |
| A **dispute** that can be adjudicated deterministically | Verification receipts (what a verifier checked at time T) and witness attestations over a record + receipt | `verification-receipts`, `witness` | 303 | **shipped** |
| **Cost** per act | Every op reports its bill; a run's reads are memoised and broken down by record type | `demo-a2a` DO accounting | 396 | **live** |

**What is not here:** the PROV projector is not yet wired into every conversational run · the
on-chain receipt-anchor registry is specified, not deployed · "receipts travel with the agent" is
true as a vault record the owner can carry; carrying it to another Home has not been demonstrated.

---

## 3. Know what it may do — and bind that to one act

*"Fewer than half of CISOs can centrally control what agents can access (46%) or authorize what
individual agents can do (45%)." — Okta, 2026. "53% have had an agent exceed its intended
permissions." — DigiCert.*

| What is asked for | The mechanism here | Enforced by | Spec | Status |
| --- | --- | --- | --- | --- |
| Authority that is **per agent**, not a shared service account | Every agent is its own smart account; every grant names the delegate's account; a service's KMS key is a *delegate*, never the identity | `agent-account`, `delegation`, `delegated-signer` | 212, 329 | **live** |
| Authority that is **scoped**: targets, methods, time, value | Caveats, each an on-chain enforcer: `AllowedTargets`, `AllowedMethods`, `Timestamp`, `Value`, `CallDataHash`, `Quorum` | contracts + `delegation` encoders | 202 | **shipped** |
| Authority that can only ever **narrow** | Re-delegation adds caveats; no link can widen the previous link; the chain is verified whole | `delegation`; ERC-1271 per hop | 383 | **live** |
| Authority bound to **one intent** | A mandate: intent digest + single-use nonce (+ payee + ceiling for payments). Hashed from the typed intent, not the sentence | `DigestBindingEnforcer`, `PaymentEnforcer` | 336 §8.3, 350 §3.6 | **live** (estate chain) |
| Authority for **data**: field-level, purpose-bound | Entitlements (durable, VC-shaped) ∩ delegation data-scope caveats; a one-time `DecryptGrant` gates the actual decryption; an audit event is required | `entitlements`, `key-authorization`, `vault` | 277, 291 | **shipped** |
| A **role is not a permission** | A workspace `RoleAssignment` names responsibility; the gate still checks a live delegation; an active assignment whose materializing wire is gone is denied | `organization`, `vault-authority` | 343, 344 | **shipped** |
| **Membership is not authorization** | A participant in a workspace — human or ACP runtime — is not thereby authorized; the effect must be within the acting principal's current, scoped delegation | the harness; `a2a` session-bearer mode | 372, 398 §2.3, 400 §0 | **live** |
| The **plan cannot lower the risk** | Risk floor and requirement type are declared by the tool's playbook contract; the planner is never consulted about whether | `tool-policy`, `capability-claims` harness contract | 354, 361, 367 | **live** |
| Money moves **between treasuries, never onto a person** | A domain invariant in the ontology and a fail-closed gate at the act | `ontology` (`charteredUnder`), the harness | 373 | **live** |
| Authority checked **on every hop**, including A2A → MCP | Web3 is the authority; MCP OAuth is an ingress envelope; a bearer is never reused for the next hop | `mcp-oauth`, `mcp-runtime`, `agentic-authorization` | ADR-0041 | **shipped** |
| A **certificate is never authority** | HTTPS required, mTLS optional and additive on its own hostname; admission always; SPIFFE names a workload, never an agent | `admission`, `edge-runtime` | ADR-0057, 339 | **live** |

---

## 4. Know where the agents are, and who answers for them

*"Fewer than half of CISOs are confident they can identify all AI agents in their environment
(47%)… only 7.2% have a named individual with formal accountability." — Okta / CSA, 2026.*

| What is asked for | The mechanism here | Enforced by | Spec | Status |
| --- | --- | --- | --- | --- |
| An **inventory** of agents | Every agent is an on-chain account with an `agentKind` and a typed name whose suffix is checked against it; the public knowledge base projects them from chain state | `agent-naming`, `agent-relationships`; the discovery indexer | 346, 357, ADR-0040 | **live** |
| An inventory of **what each has been granted** | One grants screen: every grant an agent issued that its object can enumerate — app read grants, members' access delegations, contacts, runtimes' standing grants — each with holder, what, digest, and the chain's word | `access.grants.audit`, `access.grant.revoke` | 400 W2 (B4) | **live** |
| **Accountability has a shape** | Every agent is exactly one of Person, Organization, SoftwareAgent; a service acts only under delegation from a person or org; a treasury is a service chartered under its principal | `ontology` (PROV-O trichotomy), the typed roots on chain | ADR-0046, ADR-0061, 368 | **live** |
| Every identity **names its custodian** | A doctor rule over the estate fails when an identity has no custodian | `devkit` (`custodian-coverage`) | 399 §2.3 | **shipped** |
| A person and their organization are **never the same address** | A build check on the estate data | `devkit` (`demo-person-org-distinct`) | ADR-0046 | **shipped** |
| Agents you did not list can still be **reached, by grant** | Private and pairwise resolution grants answer "may this party discover how to reach me" and nothing else | `agent-resolution` | 338, ADR-0056 | **live** |
| An outside runtime is **admitted as a member**, visibly | An ACP runtime joins as a `.svc` member with its steward link and playbook; it appears on the roster with playbook · version · state | `runtime-member`; the Home roster | 400 W1, 398 §4.5 | **partial** |

---

## 5. Human oversight that binds

*"Human in the loop" appears in every governance framework. The question is whether the action can
proceed without the human.*

| What is asked for | The mechanism here | Enforced by | Spec | Status |
| --- | --- | --- | --- | --- |
| An approval the action **cannot proceed without** | For acts of mandate-level risk the person's "yes" is a passkey signature over the mandate; the payment cannot commit without it | `harness`, the Home's Ask; `DigestBindingEnforcer` | 352, 353 | **live** |
| An approval bound to **what was shown** | The signature is over the intent digest of the previewed act; a different act after approval fails `intent-mismatch` | `DigestBindingEnforcer` | 350 §3.6 | **live** |
| A **second party's** approval where the risk ladder demands it | The ladder's second-party approval is asked for in the conversation; same digest, same ERC-1271 check, declared approvers | `harness` (`ApprovalOutcome.pending`); decisions by declared approvers | 350, 393 | **live** |
| Oversight that **survives a pause** | The run parks in the asked agent's own durable object; resume re-verifies; a run may only be resumed by the person who started it | `A2aTaskDO` checkpoints; `harness` | 350 W3, 362 | **live** |
| A confirmed choice is **not a standing permission** | Scoped confirmation memory and standing instructions are evidence about a choice or a default, scoped by the room, never permission | `context` | 385, 394 | **live** |
| A run nobody asked for **still presents no mandate** | Triggers (schedule, event, webhook, message, reaction, commitment) carry budgets; an authority-bearing step parks for its mandate — the pause *is* the signature | `harness` triggers | 375 | **live** |

---

## 6. Data the agent touches

*Data protection regimes and the EU AI Act's high-risk obligations turn on where data lives and who
can release it.*

| What is asked for | The mechanism here | Enforced by | Spec | Status |
| --- | --- | --- | --- | --- |
| Records live with the **owner**, not the platform | The vault is the record; every app store is a rebuildable cache. The test: *rebuild or bereavement?* | `vault`, `interactions`; ADR-0055 | 277, 356 | **live** |
| A generated query is **never the reason** something is disclosed | Two tiers that never meet in an engine: the public KB holds only chain-reproducible facts; a vault question compiles to a selector inside the store under the asker's grant | `context`; the indexer; the vault | 356, 357, 358, ADR-0040 | **live** |
| **Per-record** release, gated | Per-record scope on the delegation; a one-time decrypt grant; keys released only to the vault worker | `key-authorization`, `vault` | 277 | **shipped** |
| Cloud-managed stores hold **references, never content** | Workflow history, queue messages and scheduled payloads carry a run id, a record ref, a digest — never a body, a grant, a session, a wire | a Ring-0 test (`check:workflow-params-are-refs`) | 362 | **shipped** |
| Key custody is **separate again** | Per-person key-encryption keys in an HSM-rooted custody service; per-record data keys never reach the agent worker | `key-custody`, `ap-kms` | AKCS notes | **shipped** |

---

## 7. Behaviour that is governed, not just prompted

*The Hugging Face agents did what their evaluation, with refusals dialled down, let them do.*

| What is asked for | The mechanism here | Enforced by | Spec | Status |
| --- | --- | --- | --- | --- |
| What an agent **knows how to do** is a versioned, verifiable artifact | Playbooks with a canonical id, a content commitment and a leaf in an append-only Merkle log; an independent validator | the skills corpus | 354, skills corpus | **live** |
| Behaviour is **assigned**, with a diff, never auto-applied | Archetype assignment is a ceremony; a new corpus version is an attention item, never applied silently | `ArchetypeAssignmentV1`; the Home | 354 K3, 398 §8.2 | **live** (K3 on org/service/person pages) |
| A playbook **grants nothing** | The verifier reads the grant, the caveats, the chain — never the playbook. A generated surface is consulted by no verifier | the harness | 354 §1, 361 §1 | **live** |
| Domain facts live in the **ontology**, not a prompt | Code binds to T-box terms by IRI; a build gate fails on an undeclared term | `ontology`; `check:ontology-bindings` | 355 | **shipped** |
| The **model can be swapped** without the authority moving | Planner behind a port; a second provider offered by the deployment, picked by the person, routed by budget; authority is never in the adapter | `orchestration-*`, `harness` | 377, 388 | **live** |
| The **truthfulness** of answers is evaluated nightly | Cases seeded from live incidents, ground-truth probes, checks over the prose and the evidence | `evaluation` | 358 W2 | **live** |

---

## 8. The rows that are honest gaps

Kept here so the table above cannot be read as complete:

| Asked for | Where it stands |
| --- | --- |
| Push revocation to peers holding live grants | Planned; will be consumed as a reason to re-verify, never as a verdict |
| Published propagation and per-step latency | Goals written; status *unmeasured* |
| Obligation and depth enforcers ("must produce a receipt", "may not re-delegate more than once") | Specified, not deployed |
| Effects routed around the chain — a raw SaaS token in an agent's environment | Connectors under the delegation model close this route by route; GitHub first; not general |
| PROV projector on every conversational run; on-chain receipt anchor registry | Partial; specified |
| A portable "take my vault to another Home" ceremony | Promised by the design, not yet demonstrated |
| Requester unlinkability toward a resolver | Not addressed |
| Decentralized transport peer identity (channel binding) | Not closed; app-layer signatures are not channel binding |
| Production readiness | Pilot ≠ production: external contracts audit, governance key rotation, and open findings are public gates |

When a row moves, it moves here and in [products.md](./products.md) in the same change.
