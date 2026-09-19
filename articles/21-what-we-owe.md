![Cover](images/day-21-what-we-owe.png)

# What we got wrong, and the numbers we owe

Twenty days of principles. This one is the bill: where the field is ahead of us, the mistakes we already shipped, and the numbers we will not pretend to have.

Day 21 of 21 · The missing layer

**Where peers are ahead, by name.**

— **NANDA** — rotating endpoint pools, geo-aware adaptive resolvers, TTL tiers by volatility, requester unlinkability, an explicit write budget per index shard, and an evidence-only registry (observations, not ratings). Their papers still put scores in the facts document; their shipped registry does not. We would take the routing and the privacy path first.
— **LangGraph / LangSmith** — durable execution, time-travel, operator traces. Best observability in the field.
— **Microsoft Agent Framework** — middleware composition, context providers, production durable-task.
— **Dapr Agents** — durable approvals with timeout auto-deny, a clean hook decision set. We copied the discipline.
— **ERC-8004 / ANS** — a shared vocabulary at the registry layer and working adapters we have not finished. The largest hole in our external footprint.
— **MetaMask DTK, Smart Sessions, Lit Vincent** — the 7710 object model and session UX, in more wallets than we reach.

**What we already got wrong, in production.**

— A string-similarity heuristic standing in for "whose treasury is this." Alice's was not called `alice.treasury`. Domain relationships belong in the ontology.
— A playbook that promised "every payment leaves a receipt" into a field nothing read. Behaviour is not evidence.
— A demo person and their organization pointing at the same address. Two classes, one key; every custody gate went green for the wrong reason.
— A service whose KMS key *was* the identity. "No raw key" passed; "not the custodian" failed.
— Durable-workflow parameters persisting grants and session material in the engine's history. Cloud stores hold references.
— The knowledge plane telling plausible falsehoods — "no organizations" of 37; one person's records as another's — while the authority plane held. Every recent incident was a knowledge lie, not an authority leak.

**The numbers we publish, and will not decorate.**

— Chain event → fact in the read tier: goal p95 < 5 s. Status: unmeasured.
— Capability search: goal p50 < 100 ms, p99 < 500 ms. Status: unmeasured.
— Revoke → next step refused: ≤ 1 block + 1 read. Status: that is the bound; block time not yet published beside it.
— Per-step verify: goal < 250 ms internal. Status: unmeasured.
— Protected steps with a receipt: goal 100 %, gated. Status: partial wiring.
— Requester unlinkability: no PIR, no mix-net. Status: we do not have this.

We will not claim sub-second global propagation. We will not claim millisecond revocation. Pull at block time is the property we have; push notification of revocation is planned and will be consumed as a reason to re-verify, never as a verdict.

**The line:** the unit is an **anchor** — a smart account that signs its own publication, issues its own grants, enforces its own caveats — with every name, card, registry entry and DID method a **projection** of it. A person or organization authorizes; its **treasury service** transacts. Trust is a graph a party reads between itself and a counterparty for an outcome. And underneath all of it, one **ontology** says how the world is shaped — so that intent, outcome, capability, playbook, relationship, receipt and trust edge each mean exactly one thing, from the utterance to the audit. Intelligence proposes; it does not authorize.

If you build registries, wallets, frameworks or identity systems and you think a layer I described already exists, should not, or is stated more strongly than the code warrants — I would like the specific correction.

**Question:** Which claim in this series would you most want a working counter-example to?

`#AgenticWeb #AIAgents #InternetOfAgents #Accountability #Web3`

Previously: [Day 20 — Admission, always](20-https-mtls-admission.md). Start of the series: [Day 1 — The agentic web has a missing layer](01-the-missing-layer.md).

---

*Published on [LinkedIn](https://www.linkedin.com/in/richardpedersen1) as part of **The missing layer**, a 21-part series. The code behind it: [agentic-primitives](https://github.com/agentictrustlabs/agentic-primitives) — the developer kit — and the [source monorepo](https://github.com/agentictrustlabs/agenticprimitives).*
