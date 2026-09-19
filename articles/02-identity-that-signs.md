![Cover](images/day-02-identity-signs.png)

# Your agent's identity should be able to sign

Ask an agent's identity to sign something. If it can't, it isn't an identity. It's a pointer.

Day 2 of 21 · The missing layer

Most agent identity proposals hand you a pointer: a name, a registry id, a DID document, an NFT. Every one of them points *at* the agent. None of them can act *as* it. So something else signs on the agent's behalf — a platform key, a service account — and that something is the real identity, unnamed and unrevocable.

The test we apply: an agent's canonical identifier should name a thing that can **sign, verify, hold value and execute logic** — because those are the acts identity is for.

So every agent in our substrate — person, organization, service — *is* an ERC-4337 smart account. Its canonical identifier is the DID that names that account (`did:ethr`; the same subject in CAIP-10 / `did:pkh` form). We call it the **anchor**.

What the anchor does that a pointer cannot:

— Verify a signature about itself (ERC-1271): a counterparty checks against the account, not against a platform.
— Issue and revoke delegations: the account is the principal that grants; revocation is its own transaction.
— Enforce at the moment of commit: caveat enforcers run in the call path when value moves, not in a registry nobody calls.
— Be recovered without becoming someone else: guardians rotate the *credentials* under a custody policy; the address never changes (Day 4).
— Authorize money without holding it: a person or organization anchor does not carry the funds. An associated **treasury service agent** — its own account, chartered under the person or org — transacts, and only under a mandate the principal signed (Day 8). The ontology says which is which, and a verifier can tell them apart.

Run the alternatives through the same test. A DNS name proves control of a domain. An NFT (ERC-8004's identity registry) proves someone owns a token that carries a URI. A signed JSON document proves an issuer signed it. None can delegate a subset of itself, none can enforce a spending ceiling, none can be recovered by a quorum. Attach trust to any of them and you have attached trust to a pointer.

**The line:** the choice of *which* DID matters more than the choice *of* a DID. A `did:ethr` whose controller is a smart contract is globally unique without a method registry, resolvable against the chain, and — this is the point — executable.

Honest limit: the account, ERC-1271 verification and the delegation surface are live in a running estate. The DID-document projection and public resolvers for the anchor are work in progress.

**Question:** If your identity layer cannot sign, what *does* sign on the agent's behalf — and who can revoke that key?

`#AgentIdentity #DecentralizedIdentity #ERC4337 #AccountAbstraction #AgenticWeb`

Previously: [Day 1 — The agentic web has a missing layer](01-the-missing-layer.md). Next: [Day 3 — Everything else is a projection](03-projections.md).

---

*Published on [LinkedIn](https://www.linkedin.com/in/richardpedersen1) as part of **The missing layer**, a 21-part series. The code behind it: [agentic-primitives](https://github.com/agentictrustlabs/agentic-primitives) — the developer kit — and the [source monorepo](https://github.com/agentictrustlabs/agenticprimitives).*
