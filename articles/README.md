# The missing layer — a 21-part series

Twenty-one pieces, published on [LinkedIn](https://www.linkedin.com/in/richardpedersen1), that make the argument this kit exists to back up: the agentic web has a missing layer under discovery and protocols, and it is made of three things — an identity that can sign, authority that is checked at act time, and evidence the runtime does not own.

Each piece states a line, says what is live and what is not, and ends with a question. The **articles** (Days 1, 6, 11, 16) carry the week's argument; the **posts** around them take one idea each.

| Week | Theme | The line |
| --- | --- | --- |
| 1 | The anchor | The agent is an account. Everything else is a projection of it. |
| 2 | Authority | A token is a claim that authority existed at issue time. A delegation is the authority itself, still checkable at act time. |
| 3 | Trust, discovery, privacy | Publish the evidence; let the reader compute. |
| 4 | Acting | The planner may be wrong about *how*. It is never consulted about *whether*. |

## Week 1 — The anchor

- **Day 1** — [The agentic web has a missing layer — and it isn't discovery](01-the-missing-layer.md) *(article)*
- **Day 2** — [Your agent's identity should be able to sign](02-identity-that-signs.md)
- **Day 3** — [Names, cards, registry entries: all projections](03-projections.md)
- **Day 4** — [Credentials rotate. Identity doesn't.](04-credentials-rotate.md)
- **Day 5** — [Every agent is a person, an organization, or a service](05-person-org-service.md)

## Week 2 — Authority

- **Day 6** — [Delegation is the artefact, not the token](06-delegation-is-the-artefact.md) *(article)*
- **Day 7** — [A grant that is checked once is a grant that is cached](07-checked-once-is-cached.md)
- **Day 8** — [The mandate: binding authority to one intent](08-the-mandate.md)
- **Day 9** — ["Send Alice 10 dollars" — confirmation is a signature](09-confirmation-is-a-signature.md)
- **Day 10** — [The service that acts as an agent must never *be* that agent](10-the-key-is-a-delegate.md)

## Week 3 — Trust, discovery, privacy

- **Day 11** — [Trust is a graph, not a score](11-trust-is-a-graph.md) *(article)*
- **Day 12** — [Be what registries are built from](12-what-registries-are-built-from.md)
- **Day 13** — [Resolution is not authority](13-resolution-is-not-authority.md)
- **Day 14** — [Two tiers of knowledge that never meet](14-two-tiers.md)
- **Day 15** — [The vault is the record; everything else is a cache](15-vault-is-the-record.md)

## Week 4 — Acting

- **Day 16** — [Planner proposes, mandate authorizes, executor acts, receipt proves](16-planner-mandate-executor-receipt.md) *(article)*
- **Day 17** — [Coordination is not orchestration](17-coordination-vs-orchestration.md)
- **Day 18** — [Behaviour is generated; authority never is](18-behaviour-generated-authority-never.md)
- **Day 19** — [Receipts that travel with the agent](19-receipts-that-travel.md)
- **Day 20** — [HTTPS required, mTLS optional, admission always](20-https-mtls-admission.md)

## Close

- **Day 21** — [What we got wrong, and the numbers we owe](21-what-we-owe.md)

## How the series maps to the kit

| Idea | Where it is in the kit |
| --- | --- |
| The anchor is an ERC-4337 account | `agent-account`, `account-custody`; [contracts.md](../docs/contracts.md) |
| Names, cards, registry entries are projections | `agent-naming` (typed suffixes), `agent-profile`, `registry-kit`, `registry-resolution` |
| Credentials rotate; identity doesn't | `CustodyPolicy` module; [principle 2](../docs/principles.md#2-credentials-rotate-the-identity-does-not) |
| Person, organization, service; a treasury is a service | `ontology` (`charteredUnder`), the typed subregistries on chain |
| Delegation is the artefact | `delegation`, `DelegationManager` + enforcers; [principle 3](../docs/principles.md#3-a-token-says-who-a-delegation-says-what) |
| Checked once is cached | `harness` re-verifies before every step and after every approval |
| The mandate | `DigestBindingEnforcer` + `PaymentEnforcer`; [the mandate shape](../docs/contracts.md#a-mandate-is-a-delegation-with-two-more-caveats) |
| The key is a delegate | `delegated-signer`, `key-custody`; [principle 4](../docs/principles.md#4-your-app-is-a-delegate-never-a-custodian) |
| Trust is a graph | `registry-resolution` returns separate signals, never a score; `attestations`, `verification-receipts` |
| Be what registries are built from | `registry-kit`, `AgentRegistryBase` |
| Resolution is not authority | `agent-resolution`; [principle 8](../docs/principles.md#8-authenticating-as-a-person-is-not-being-them) |
| Two tiers that never meet | `context`; the vault reached only through `interactions-client` |
| The vault is the record | [principle 5](../docs/principles.md#5-records-live-in-the-owners-vault-not-your-database); the *rebuild or bereavement* test in [AGENTS.md](../AGENTS.md) |
| Planner proposes, mandate authorizes, executor acts, receipt proves | `harness`, `orchestration`, `tool-policy`, `audit`, `provenance` |
| Coordination is not orchestration | `coordination` vs `orchestration` — two packages, two namespaces |
| Behaviour is generated; authority never is | `capability-claims` (the `SKILL.md` contract), `surface-catalog` |
| Receipts that travel | `audit`, `provenance`, `verification-receipts`, `witness` |
| HTTPS required, mTLS optional, admission always | `admission`, `edge-runtime`, `mcp-oauth` (an envelope, never the authority) |
| What we owe | [Status](../README.md#status) — the same list, kept honest |

The cover images are in [`images/`](images/). The pieces are reproduced here as published; internal working notes were removed.
