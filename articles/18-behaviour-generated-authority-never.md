![Cover](images/day-18-behaviour-generated.png)

# Behaviour is generated; authority never is

Our most expensive mistake: teaching the conversational Ask how the Home app works, separately from teaching the Home app how the Home app works. Two encodings of one fact. The one the planner read was wrong.

Day 18 of 21 · The missing layer

The evidence: a treasury payment left a receipt in a field nothing read — money moved, neither party was told. A capability table compiled "includes this skill" from a hand-kept list instead of from the contract a domain author wrote. And a resolver looked for a treasury whose *name* resembled its owner's, when the ontology had held the actual relationship all along.

The rule we extracted: **define the capability once; generate every surface from it.**

One model, four artefacts, one compiler:

1. **Ontology** — how the domain is shaped: a treasury is chartered under the agent that holds it; an inbox belongs to a person; a team has members. Code binds to it by IRI, and a build gate fails when code names a term the T-box does not declare. Never written into a prompt.
2. **Capability** — what the agent advertises: a stable id and label.
3. **Playbook contract** — the `SKILL.md` frontmatter: risk, requirement type, which argument is the resource, which is the authority, approvals, evidence, declared effects.
4. **Archetype** — which playbooks a *kind* of agent (person, org, team, treasury) is assigned, by digest.

From that one compilation come the Ask's tool set, the published vocabulary, the A2A card's advertised capabilities, each act's mandate requirement and risk floor, what follows the act, and the Home affordance.

**The line:** if adding a feature means writing an invoker *and* a vocabulary entry *and* a UI handler, the model is not doing its job.

Two firewalls hold it in place:

**A generated surface is consulted by no verifier.** The planner sees tools compiled from the definition. The verifier sees the grant, the caveats, the on-chain check. A playbook that *promises* "every payment leaves a receipt" is not evidence a receipt exists. The receipt is.

**Prompts say how to behave; the ontology says how the world is shaped.** The system prompt is the most tempting place to write a domain rule and the worst: invisible to every gate, applied confidently to cases it was never meant for. If the planner needs a domain fact, it is *rendered from* the ontology binding.

Where this sits against the field: Agent Skill packages (`SKILL.md`) are becoming a standard for procedural knowledge. We consume them as the *behaviour* half and refuse to let them become the *authority* half. OASF taxa classify; A2A `skills[]` advertise; playbooks implement; capability-claim credentials prove. Four layers, one noun: **capability**.

Honest limit: the compiler, digest assignment and harness consumption are live for the archetypes we have authored. Nine Home domains still have artisanal invokers we are retiring against this model, and the gate that fails a missing contract is a coverage check, not yet complete.

**Question:** How many places in your stack encode "what this agent can do" — and which one does the planner actually read?

`#AIAgents #AgentSkills #Ontology #A2A #AgenticWeb`

Previously: [Day 17 — Coordination is not orchestration](17-coordination-vs-orchestration.md). Next: [Day 19 — Receipts that travel](19-receipts-that-travel.md).

---

*Published on [LinkedIn](https://www.linkedin.com/in/richardpedersen1) as part of **The missing layer**, a 21-part series. The code behind it: [agentic-primitives](https://github.com/agentictrustlabs/agentic-primitives) — the developer kit — and the [source monorepo](https://github.com/agentictrustlabs/agenticprimitives).*
