![Cover](images/day-01-missing-layer.png)


# The agentic web has a missing layer — and it isn't discovery

Everyone building for the "Internet of AI agents" is solving the same three problems, in the same order: how agents find each other, how they talk, and how they are trusted. A2A gives us cards and tasks. MCP gives us tools. NANDA, ERC-8004, ANS and a dozen registries give us discovery. The protocol layer is crowded and getting better every month.

I want to argue that the layer underneath it is nearly empty, and that the emptiness is why "trust" keeps getting bolted on as a score.

## The three questions a counterparty actually asks

When an agent I do not control asks mine to do something, three questions decide what happens next. None of them is "where did you find me?"

1. **Who is acting?** Not which endpoint, which name, which registry entry — which *principal*, in a way I can verify without trusting the platform that hosted the request.
2. **May they do this?** Not "are they authenticated" — are they *authorized*, for this specific act, by someone who had the right to authorize it, and is that authorization still live right now?
3. **What did they do?** Afterwards, can anyone show — without the runtime's cooperation — what was requested, what was permitted, what ran, and what changed?

Identity. Authority. Evidence. Every framework has an answer to each, and almost every answer is *policy code* running inside the framework: an ACL, a token scope, a log file. All three evaporate the moment the agent leaves the runtime that issued them.

## Why the runtime is the wrong place

Consider what happens when an agent moves. It changes host, changes vendor, gets rebuilt on a new framework. In today's stacks its identity is a key the old runtime held, its permissions are scopes the old issuer minted, its history is a trace in the old vendor's observability product. The agent that arrives on the new host is, in every verifiable sense, a new agent.

Now consider what happens when an agent is compromised. Prompt injection turns the planner; the planner calls a tool it should not. If the permission check is inside the same process as the planner, the check is compromised with it. "Human in the loop" becomes a click in a UI the attacker controls.

And consider revocation. A person delegates to a helper; the helper misbehaves; the person wants it stopped *now*. OAuth says: wait for the token to expire. X.509 says: wait for the CRL to propagate. Both mean the same thing — a cached verdict is still authorizing acts after the authority behind it is gone.

These are not protocol problems. You cannot fix them with a better card format or a faster index. They are *substrate* problems: where identity lives, what a grant is made of, and who holds the evidence.

## What a substrate looks like

Here is the shape we have been building, and the sequence this series will walk through.

**The agent is an account.** Every agent — person, organization, service — *is* an ERC-4337 smart account on chain. Its canonical identifier is the DID that names that account. Not a name, not a token, not a JSON document: a contract that can verify signatures (ERC-1271), hold value, and execute logic. We call it the **anchor**, because everything else — names, cards, registry entries, DID documents, DNS hosts — is a **projection** of it, carrying a proof the anchor signed. Delete a projection and you have lost a listing, not an identity.

**Authority is a grant, not a token.** Permission to act is an on-chain delegation (ERC-7710) the principal's custodian signs, narrowed by *caveats* — a payee, a ceiling, a single intent, a time window — and revocable by one transaction. The agent's runtime verifies it before every step, re-verifies after every human approval, and the chain's enforcers verify it *again* when value actually moves. There is no token lifetime to wait out, because no verdict is ever cached.

**Intelligence proposes; it never authorizes.** The planner — an LLM, a workflow graph, whatever — can propose any step it likes. Each step names a tool with a declared risk; the step runs only if a live grant covers it. A hijacked planner can be creative; it cannot exceed the caveats. This is the sentence the whole design rests on: *intelligence may be probabilistic; authority must not be.*

**Evidence is the agent's, not the platform's.** Every protected step leaves a receipt — which grant, which decision, which transaction, which playbook produced it — into a hash-chained log and a W3C PROV-O graph held in the *owner's* vault, not in a vendor's trace store. A receipt travels because the owner carries it.

**Trust is relational.** There is no reputation number at the index. Whether *you* should let *this* agent do *that* is a property of the pair of you and the intent — read from attestations, relationships, prior receipts and claims you can verify — never a scalar someone else computed from nobody's vantage point.

## What this is not

It is not a framework. LangGraph, Microsoft Agent Framework, Dapr Agents and their peers are ahead of us on durable execution, observability and developer experience, and we say so in our own comparisons. The substrate is the layer they could stand on: identity that survives the runtime, authority the runtime cannot forge, evidence the runtime does not own.

It is not a registry. We agree with NANDA and ERC-8004 that the agentic web needs many registries. We disagree about where the agent lives: in their designs the registry signs the agent's record and points at an identifier; in ours the agent signs its own record and the registry can only say it listed it. That inversion is the subject of Week 3.

It is not finished. Revocation propagates at block time, not in milliseconds. We publish no latency SLOs yet. Our routing layer is far behind NANDA's. Week 4 ends with the list of what we owe.

## The series

Over the next three weeks I will take these one idea a day: the anchor and its projections; delegation, caveats, mandates and revocation; trust graphs, registries and the two tiers of knowledge; and finally the harness — how an agent actually acts under all of this — and how it compares to the frameworks you already use.

I am posting this to be argued with. If you build registries, wallets, agent frameworks or identity systems and you think the layer I am describing already exists, or should not, I would like to hear exactly where.

---

**Question for the community:** When your agent moves from one runtime to another today, what — if anything — travels with it that a counterparty can verify?

`#AgenticWeb #AIAgents #AgentIdentity #ERC4337 #Delegation`

---

*Published on [LinkedIn](https://www.linkedin.com/in/richardpedersen1) as part of **The missing layer**, a 21-part series. The code behind it: [agentic-primitives](https://github.com/agentictrustlabs/agentic-primitives) — the developer kit — and the [source monorepo](https://github.com/agentictrustlabs/agenticprimitives).*
