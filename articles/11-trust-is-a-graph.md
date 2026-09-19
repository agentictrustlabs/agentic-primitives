![Cover](images/day-11-trust-graph.png)

# Trust is a graph, not a score

*Day 11 of 21 · The missing layer · Week 3: Trust, discovery, privacy*

A "4.8" at the index is a number from nobody's point of view. Whether *you* should trust an agent for *this* is not a property of the agent.

Every agent registry proposal eventually arrives at a number. NANDA's AgentFacts carries `performanceScore` and a `certification.level`; its papers describe Trust Reputation Scores that clients should "recompute on each new session." ERC-8004 has a Reputation Registry. The *Upgrade or Switch* paper's RDAP extension carries "trust-score URIs" and its capability index returns a "ranked list." The instinct is understandable: a client faces an unknown agent and wants one input to a decision.

We refuse the number. I want to explain why the refusal is structural rather than fastidious — and what we build instead.

## Trust has two subjects

Whether Calvary Church should let an unknown treasury agent pay its members is **not a property of that agent**. It is a property of the *pair* — (Calvary, that agent) — read in the context of *this* intent (pay members) and *this* desired outcome (funds arrive, nothing else moves). A different org, a different intent, and the same agent is a different question.

A scalar at the index flattens that relation into a number from nobody's vantage point. Worse, it blends two things that must stay separate: **reputation** (what others say happened) and **authority** (what this party may do). A registry that publishes a blended number has made itself a gatekeeper — the exact walled-garden failure the same papers warn against.

## What a verifier can actually check

Instead of a score, we model a **trust graph**: edges between parties, each of which a verifier can check independently.

- **Relationships** — signed, bilateral: member-of, steward-of, chartered-under, invited-by.
- **Attestations** — a third party's signed statement about the subject, verifiable against the subject's account.
- **Capability claims** — private verifiable credentials presented in an engagement, not published in a directory.
- **Verification receipts** — a prior verifier's signed record of what it checked and found.
- **Interaction receipts** — what this pair has actually done together, with mandates and transactions named.
- **Registry admission receipts** — the fact that a registry with known admission rules listed the agent.
- **External reputation** — ERC-8004 reputation, NANDA evaluations, review sites — projected in as *one edge among these*, never as the answer.

Every one of those edges is a **class in the ontology** — PROV-O underneath, our extensions above — with a definition that says what it means *and what it does not*. `charteredUnder` says "never authority." A relationship edge says "a resolver may follow this; a verifier may not read it as permission." That is what makes the graph a graph rather than a pile of JSON: a machine at any vantage point reads the same edge with the same meaning, and no reader can quietly promote "steward-of" into "may spend."

The composed resolver returns these as **separate signals**: subject, context, relationship, bindings, authority, evidence. Search ranks by *relevance only*. Nothing in the substrate may collapse the signals into a verdict on another party's behalf. The asking party — or its agent, under its own playbook — reads the graph and decides.

## Two halves, one vantage point

The graph has a public half and a private half, and the line between them is a security boundary.

**Public edges** are facts anyone could reproduce from chain state: names, types, capability ids, registry admissions, custodian membership, anchored attestations. They live in a world-readable knowledge base that is a pure projection of the chain — reading all of it reveals nothing reading the chain would not.

**Private edges** — who knows whom, who invited whom, what this pair did last month — are vault credentials, held by each party and read only from *that party's* vantage point under per-record delegation. "Alice" resolves among the people *you* know, or not at all.

The two halves are never joined inside an engine (Day 14). That is what lets the public half be freely queryable while the private half is read only by compiled selectors inside the store.

## Where the graph is read

Not at the registry. In the **engagement flow**: an intent is projected, candidates are probed, offers come back, and *there* the asking party reads the graph — "given what I want and who I am, what do I know about you, and what can you prove?" — before a mandate is issued. Discovery finds candidates. The graph informs a decision. The mandate is the decision. Three acts; only the last grants anything.

The reason the question can be asked at all is that **intent, outcome, capability and party are typed in the same ontology as the edges**. "Pay members" is an intent class with a stated outcome; "treasury payment" is a capability definition; Calvary is an organization with a treasury chartered under it. Trust-for-an-outcome is a query over one vocabulary, not a join across five schemas — which is also why it can be compiled for a machine to run rather than left to a prompt.

## The evidence-only registry

The most encouraging thing in NANDA's shipped code arrives at this from the other side. Their Town 2 registry describes itself as "records of observation, not ratings … the registry computes no scores and assigns no verification labels." One observer, one subject, one time; a listing cannot write evidence about itself. That is precisely the *evidence* edge of a trust graph, published honestly. Their papers, with their embedded scores, have not yet caught up with their code.

## What this costs, and what we owe

A graph is harder to consume than a number. Today the edges exist and are verifiable, but the *relational query* — "trust between A and B for outcome X," composed from intent and party context — is not yet a first-class operation, and there is no view of it in our Home. Until it ships, the honest description is: we have refused the score and not yet finished the replacement.

We also owe an answer to the scale objection: a client meeting a thousand unknown agents cannot read a thousand graphs. Our position is that it should not have to — engagement narrows candidates by relevance and capability before any trust question is asked, and most interactions are with parties one already has edges to. Whether that holds at internet scale is an empirical question we have not tested.

## The principle

Reputation is what others say happened. Authority is what a principal permitted. Evidence is what a verifier can check. A registry may hold the first and publish the third. It may never issue the second, and it should never blend the three into a number a client is asked to trust from nobody's point of view.

**The line:** publish the evidence; let the reader compute.

Tomorrow: what a registry *is* for — and why we build the kit rather than the registry.

---

**Question for the community:** If you operate or design a registry with a reputation component — what would you lose by publishing the *evidence* and letting the reader compute?

`#AgenticWeb #TrustGraph #AIAgents #DecentralizedIdentity #ERC8004`

Previously: [Day 10 — The key is a delegate](10-the-key-is-a-delegate.md). Next: [Day 12 — What registries are built from](12-what-registries-are-built-from.md).

---

*Published on [LinkedIn](https://www.linkedin.com/in/richardpedersen1) as part of **The missing layer**, a 21-part series. The code behind it: [agentic-primitives](https://github.com/agentictrustlabs/agentic-primitives) — the developer kit — and the [source monorepo](https://github.com/agentictrustlabs/agenticprimitives).*
