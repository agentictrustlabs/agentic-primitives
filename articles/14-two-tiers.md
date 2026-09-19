![Cover](images/day-14-two-tiers.png)

# Two tiers of knowledge that never meet

We let a language model write SPARQL against one of our databases and forbid it from touching the other. The rule that decides which is the most important privacy decision in the substrate.

Day 14 of 21 · The missing layer

An agent that answers questions needs data. Ours reads from exactly two places.

**Tier 1 — the public knowledge base.** An RDF graph projected from the chain by one indexer, under the same ontology the rest of the substrate binds to: names, agent types, capability definitions, anchored relationships, registry admissions, custodian membership from public events. The invariant: **it holds only facts any party could reproduce from on-chain state.** No per-viewer state, no session data, no vault contents, no PII — not hashed, not temporarily, not to make a check faster. Reading the whole KB reveals nothing reading the chain would not. Because that is true by construction, a generated query is safe here: a wrong query costs a bad answer, never a disclosure. "Public" is a property of the *class* in the ontology, not a per-row flag someone has to remember to set — and the ontology is also what the model writes SPARQL *against*, so a question about "organizations Nathan stewards" is a query over defined terms, not over column names it guessed.

**Tier 2 — the private vault.** Each person's and org's records — inbox, relationships, who-knows-whom, reports, memory — are encrypted envelopes with per-record scope, released only under a delegation the owner signed. Every record key is bound to an ontology class by IRI, so the record is the same *kind of thing* in every Home. But a question of the vault does *not* become SPARQL. It compiles to a **selector** evaluated *inside* the store, under the asker's grant. Running a query engine over vault data would first require materialising a decrypted copy of someone's vault into that engine — which is the leak.

**The rule: the two tiers are never joined inside an engine.** Each tier answers on its own terms; the agent composes the answers, under the asker's authority, afterwards.

**The line:** a generated query is never the reason something is disclosed.

This is what makes "resolve Alice in the asker's private tier, or refuse" (Day 9) safe, and what lets the trust graph's public and private halves (Day 11) be read without leaking either.

What it costs: two query paths, two data models, and a composer that must be honest about what each tier said. We learned the last part the hard way. Every defect in our conversational surface over recent months was the *knowledge* plane telling a plausible falsehood — "no organizations" when there were 37; one person's records shown as another's — never the authority plane letting something through. So the composer's claims are now bounded by its evidence, and a growing truth set gates the build.

Where the field is: most agent memory products are one vector store with row-level ACLs, queried by the model. That is one tier with a permission table, and the model is inside it.

Honest limit: both tiers are live. Vault-resident agent memory is newer, and the tier boundary is enforced by review and a growing set of checks rather than by a type system yet.

**Question:** In your RAG or memory layer, what stops a generated query from being the reason a record was disclosed?

`#Privacy #AIAgents #KnowledgeGraph #DataSovereignty #AgenticWeb`

Previously: [Day 13 — Resolution is not authority](13-resolution-is-not-authority.md). Next: [Day 15 — The vault is the record](15-vault-is-the-record.md).

---

*Published on [LinkedIn](https://www.linkedin.com/in/richardpedersen1) as part of **The missing layer**, a 21-part series. The code behind it: [agentic-primitives](https://github.com/agentictrustlabs/agentic-primitives) — the developer kit — and the [source monorepo](https://github.com/agentictrustlabs/agenticprimitives).*
