![Cover](images/day-05-person-org-service.png)

# Every agent is a person, an organization, or a service

Ten agent platforms will give you ten taxonomies: assistants, tools, treasuries, indexers, copilots. Ask the only question a verifier cares about — *who is accountable?* — and there are exactly three answers.

Day 5 of 21 · The missing layer

We took W3C PROV-O's trichotomy as law. Every smart agent is a `prov:Person`, a `prov:Organization`, or a `prov:SoftwareAgent`. Nothing else, ever.

A team is an organization (a derived type: `Team ⊑ Organization`). An indexer is a service. A workspace coordinator is a service. And a **treasury is a service** — its own smart account, chartered under the person or organization whose money it holds. A person's agent never pays. It *authorizes*; the treasury transacts, under a mandate the person signed. Roles live in the profile and the on-chain type record. The *class* never grows.

This is the first place the **ontology** carries weight in this series, and it will carry weight every week after. It is not documentation. It is a T-box the code binds to by IRI, and a build gate fails when code invents a term the T-box does not declare.

Why the discipline pays for itself:

**Accountability has a shape.** A person acts for themselves. An organization acts through people who hold custody of it. A service acts *only* under delegation from a person or organization — it has no standing of its own. Every grant reads against that shape, and a verifier can tell a person's custody from an org's custody from a service's session — including a treasury's.

**Names carry the class, not the capability.** Our typed suffixes — `.me`, `.org`, `.team`, `.svc`, `.treasury`, `.registry` — name the derived agent type and are checked against the on-chain record, failing closed on mismatch. They never encode capability, provider or version; those change without the agent becoming a different agent. ANS's `a2a://name.capability.provider.v1.certified` puts all of that in the name. A name should be stable; everything volatile should be a claim.

**A person is never also their organization.** The shortcut — "the org is just David's account" — collapses two classes onto one address, and every custody, stewardship and treasury gate downstream loses the ability to tell them apart. We enforce the distinction with a build check on our own demo data, because we made the mistake once and everything went green for the wrong reason.

**Relationships say what they are NOT.** A treasury is `charteredUnder` the agent that holds it. The property's own definition says: never authority; the child holds its own custody; a resolver may follow it, a verifier may never read it as permission. That sentence lives in the ontology, not in a prompt or an app table — so every gate reads the same one.

**The line:** three classes is not a limitation of the model. It is the shape accountability actually has — and the ontology is where that shape is written down once.

Honest limit: the trichotomy, typed names and the binding gate are live. The ontology's coverage of *derived* service roles is still growing as new domains arrive.

**Question:** Can your agent model let a verifier distinguish "an organization acted" from "a person acted for an organization" — and where is that distinction written down?

`#AIAgents #Provenance #PROVO #Ontology #AgentIdentity`

Previously: [Day 4 — Credentials rotate](04-credentials-rotate.md). Next: [Day 6 — Delegation is the artefact (article)](06-delegation-is-the-artefact.md).

---

*Published on [LinkedIn](https://www.linkedin.com/in/richardpedersen1) as part of **The missing layer**, a 21-part series. The code behind it: [agentic-primitives](https://github.com/agentictrustlabs/agentic-primitives) — the developer kit — and the [source monorepo](https://github.com/agentictrustlabs/agenticprimitives).*
