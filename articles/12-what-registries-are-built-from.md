![Cover](images/day-12-registry-kit.png)

# Be what registries are built from

There will be hundreds of agent registries, most of them vertical, and no horizontal winner. So we do not build a registry. We build the kit registries are built from.

Day 12 of 21 · The missing layer

Healthcare will not list its agents where DeFi lists theirs. A denomination will not use a logistics consortium's admission rules. Every attempt to be *the* registry is an attempt to be the root — and Week 1 argued the root is the agent's own account.

What the kit is:

— **Anchor-bound registry contracts.** A registry is itself a smart agent — a service, `.registry` — so it can sign admission receipts, be delegated to, and be held accountable like any other party.
— **Pluggable admission.** Membership and validation hooks are the operator's policy: a fee, a credential, a steward's signature, a vote. The kit does not choose.
— **Admission receipts and a lifecycle log.** Listing is a signed, timestamped event; so is delisting. A receipt is one edge in a trust graph (Day 11), never a verdict.
— **Signed cards and binding proofs.** An entry points at an anchor and carries the anchor's proof that the entry represents it (Day 3).
— **A discovery read tier.** A knowledge graph projected from chain — capability matching, typed names, relationships — served by the registry's own agent, in the substrate's ontology. A registry built from the kit publishes the same admission-receipt class and the same capability definitions as every other one, so a client reading two registries reads one vocabulary.

What the kit refuses to be:

— **A root.** No quilt index above the registries. NANDA puts one lean index in front of every registry and has the index sign the address record. Ours has no such layer; a client that wants to search across registries queries several, or uses an aggregator that is itself just another projection.
— **A revoker.** A registry can delist. It cannot revoke a grant, because it never issued one. A "kill-switch at the registry layer" gives an operator a veto over agents it never authorized.
— **A conformance target.** ERC-8004, ANS, HCS-10 and OASF are *design inputs* and *projection targets*. We learn signed cards, transparency logs and validation hooks from them, and route the code that speaks their protocols into sibling adapter repos. The primitives stay generic.

**The line:** anchor the registry to the agent, never the agent to the registry. An ERC-8004 identity is an NFT in a registry — move registries and you are a new identity. Here the entry is disposable; delete it and you lost a listing.

Honest limit: the kit, its contracts, typed names and the discovery read tier are live. The ERC-8004 and ANS adapters are the largest unbuilt piece of our external footprint, and we run exactly one aggregate registry serving ARD/ACP today.

**Question:** If you run or plan a vertical agent registry — what admission rule would you need that a generic kit could not express?

`#AgenticWeb #AgentDiscovery #ERC8004 #Registries #Interoperability`

Previously: [Day 11 — Trust is a graph](11-trust-is-a-graph.md). Next: [Day 13 — Resolution is not authority](13-resolution-is-not-authority.md).

---

*Published on [LinkedIn](https://www.linkedin.com/in/richardpedersen1) as part of **The missing layer**, a 21-part series. The code behind it: [agentic-primitives](https://github.com/agentictrustlabs/agentic-primitives) — the developer kit — and the [source monorepo](https://github.com/agentictrustlabs/agenticprimitives).*
