![Cover](images/day-15-vault-is-the-record.png)

# The vault is the record; everything else is a cache

One test for every new table, store or durable object: if this were wiped, is the loss a rebuild or a bereavement?

Day 15 of 21 · The missing layer

A rebuild is fine. Indexes, cursors, request-id ledgers, projections, queue backlogs — derived, rebuildable, needed at request latency. Put them wherever is fast.

A bereavement means it belonged in the **vault**: the owner's encrypted, per-record-scoped store, released only under a delegation the owner signed. Messages, grants, relationships, reports, memberships, receipts, agent memory — self-sovereign data a person could carry to another Home. Durable domain truth lives there, or on chain, and nowhere else.

The drift this rule refuses always arrives as a performance argument. "The durable object already has the message body — why round-trip to the vault?" Do that and you have a second store of record, a second enforcement point, a second authority model, and records nobody can carry anywhere. We wrote the rule down because a serving-plane component of ours shipped with its own internal vault by constructor default; the fix was to *inject* the real one rather than inherit the convenient one.

Four practices follow:

— **Vault records are ontology-shaped.** Every record key is bound to a class in the ontology by IRI — a membership is a relationship, an invitation is a *pending* situation whose acceptance writes the relationship, a report is a PROV activity. Not one-off columns. This is what makes "carry it to another Home" more than a slogan: the receiving Home already knows what each record *is*.
— **The smart-account address is the only canonical identity.** Emails, handles, display names, registry ids are facets for lookup and contact — never the key a membership hangs on.
— **Cloud-managed stores hold references, never content.** Workflow history, queue messages, email transit, scheduled-job payloads carry a run id, a record ref, a digest. Never a message body, a grant, a session, a wire. We found and fixed one of these in our own durable-workflow parameters — sensitive inputs persisted in the engine's history instead of loaded by reference at each step.
— **Key custody is separate again.** Per-person key-encryption keys live in an HSM-rooted custody service on confidential VMs; per-record data keys are released only to the vault worker under a decrypt grant and never reach the agent worker.

**The line:** most platforms make their database the record and offer the user an export. We make the owner's vault the record and offer the platform a cache.

Honest limit: vault-backed records and per-record delegation are live. A portable "take my vault to another Home" ceremony is the property this design promises and we have not yet demonstrated end to end.

**Question:** Which of your agent's records could a user actually take with them — and what would be left behind that still says something about them?

`#DataSovereignty #Privacy #AIAgents #ZeroTrust #AgenticWeb`

Previously: [Day 14 — Two tiers that never meet](14-two-tiers.md). Next: [Day 16 — Propose, authorize, act, prove (article)](16-planner-mandate-executor-receipt.md).

---

*Published on [LinkedIn](https://www.linkedin.com/in/richardpedersen1) as part of **The missing layer**, a 21-part series. The code behind it: [agentic-primitives](https://github.com/agentictrustlabs/agentic-primitives) — the developer kit — and the [source monorepo](https://github.com/agentictrustlabs/agenticprimitives).*
