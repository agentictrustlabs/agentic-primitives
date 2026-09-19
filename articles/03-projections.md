![Cover](images/day-03-projections.png)

# Names, cards, registry entries: all projections

Delete your agent's registry entry, its ENS name and its DID document. Did it lose a single permission? If yes, those were never projections. They were the identity, and you had it in three places.

Day 3 of 21 · The missing layer

Yesterday: the agent is an account — the **anchor**. Today: everything else is a **projection** of it — a deterministic, pure rendering of selected canonical facts for one external target, carrying a proof the anchor signed.

One agent, many projections:

— **A2A Agent Card** — how to interact: capabilities, endpoints; JWS-signed, bound to the account by an EIP-712 proof.
— **Typed name** (`alice.me`, `outreach.team`, `outreach.treasury`) — a forced-unique human name → anchor. The suffix names the agent *type* — a class in our ontology — and is checked against the on-chain type record.
— **DNS host** `<label>-<type>.<zone>` — the same name for legacy resolvers; reversible.
— **Registry entry** (our kit, ERC-8004, ANS, HCS) — a listing plus an admission receipt.
— **ARD / ACP records** — aggregate registry-hosted views.
— **`did:web`** — where the anchor is *served* today. A protocol projection, never the identity.
— **ENS** — a name in another namespace → anchor.

Three properties follow.

**One writer.** The card's `skills[]`, the registry's `capabilities[]` and the on-chain capability ids are all projected from one `profile.capabilities[]` by one projector — and each capability id names a definition in the ontology, so the same id means the same thing on every surface. The card never carries a fact the profile does not. NANDA's papers call AgentFacts "a superset of the Agent Card"; we run the arrow the other way — the card is a *loss-reported projection* of the profile.

**Every projection is disposable.** Remove the ERC-8004 entry, the ENS name, the `did:web` document — the agent still signs, delegates and revokes, and every grant it issued is still valid. You lost a listing, not an identity.

**Separated roles.** In our Home control plane a card is *edited* by one role, *approved* by another, *signed* by the anchor's custodian and *published* by a fourth. A projection is a release, not a form.

**The line:** the thing that lists you should never be the root of trust for who you are. ERC-8004 anchors reputation and validation at the NFT — at a projection. NANDA's index signs the `AgentAddr` — the registry authenticates the agent's own address record. We think the agent signs that record, and a registry's signature binds only the fact that it lists you.

Honest limit: the A2A card, typed name, DNS and registry-kit projections are live. The `did:web`, ENS and ERC-8004 projectors belong in a sibling integration repo and are not all shipped.

**Question:** Which of your agent's external records could you delete today without the agent losing a permission?

`#AgenticWeb #A2A #AgentIdentity #Interoperability #ERC8004`

Previously: [Day 2 — Identity that signs](02-identity-that-signs.md). Next: [Day 4 — Credentials rotate; identity doesn't](04-credentials-rotate.md).

---

*Published on [LinkedIn](https://www.linkedin.com/in/richardpedersen1) as part of **The missing layer**, a 21-part series. The code behind it: [agentic-primitives](https://github.com/agentictrustlabs/agentic-primitives) — the developer kit — and the [source monorepo](https://github.com/agentictrustlabs/agenticprimitives).*
