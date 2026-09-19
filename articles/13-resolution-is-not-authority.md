![Cover](images/day-13-resolution-not-authority.png)

# Resolution is not authority

"Where is this agent right now?" and "may I use it?" are different questions. Most designs answer them in the same hop — and that hop is where a compromised resolver becomes an authority.

Day 13 of 21 · The missing layer

We treat four concerns as independent: **naming** (does it have a human name?), **listing** (does a registry carry it?), **resolution** (can I learn how to reach it?), **inbound admission** (will it accept my request?). Any combination is legal. A nameless agent can be resolvable. A named agent can be unreachable. None of the four is authority.

The ontology keeps them apart on purpose. Agent resolution — *where* — has its own namespace, separate from intent resolution — *which agent satisfies this ask*. Two different classes for two different questions, so a design cannot drift into treating "I found it" as "it fits" or "I may."

**Resolution** is answered by a signed service publication: the agent's own statement of where it is served — surfaces (protocol, URI, exposure, audience, region, priority), transport-key bindings, endpoint-control proofs — with three properties that matter:

— **Sequenced and hash-chained.** Monotonic sequence plus the previous publication's digest: the anti-rollback axis. A resolver *selects* a publication for its audience; it never edits one. A compromised resolver can serve only a stale or wrong-audience record, and both fail the checks.
— **Expiring.** An expiry is required. An unexpiring publication cannot be shown to be current. (NANDA's TTL — signed by the agent rather than the index.)
— **Per-audience channels.** Public, private-with-audience, or pairwise. Pairwise channels carry their own sequence numbers, so two counterparties cannot correlate that they talk to the same infrastructure.

**Private resolution** for unlisted agents uses opaque, recipient-bound grants the agent issues — not salted names. Such a grant answers "may this party *discover* how to reach me?" and nothing else.

Now the rule the field keeps violating: **a resolver never mints authority.** NANDA's adaptive resolver may "issue temporary credentials or endpoint tokens," and its blueprint makes the resolver "itself a registered and trusted agent." That puts an authority in the call path every client must trust. In our model whatever a resolver returns is an *address*. Admission happens at the edge against the caller's own credentials and mandate. Nothing the resolver says can widen what the callee accepts.

**The line:** a resolver returns addresses, never credentials.

Where NANDA is ahead: routing agility — rotating endpoint pools, geo-aware dispatch, TTL tiers by volatility. Our publication has the fields (`priority`, `region`, tenant routing hint) and no engine behind them yet. That is the part of their design we would adopt first, as a projection target, with the invariant above intact.

Honest limit: publications, private grants and the Reachability surface in Home are live. There is no rotating pool, no adaptive dispatcher, and requester anonymity toward the resolver operator is not addressed.

**Question:** In your stack, can a compromised resolver widen what a callee will accept? How would you know?

`#AgenticWeb #AgentDiscovery #ZeroTrust #A2A #Privacy`

Previously: [Day 12 — What registries are built from](12-what-registries-are-built-from.md). Next: [Day 14 — Two tiers that never meet](14-two-tiers.md).

---

*Published on [LinkedIn](https://www.linkedin.com/in/richardpedersen1) as part of **The missing layer**, a 21-part series. The code behind it: [agentic-primitives](https://github.com/agentictrustlabs/agentic-primitives) — the developer kit — and the [source monorepo](https://github.com/agentictrustlabs/agenticprimitives).*
