![Cover](images/day-17-coordination-vs-orchestration.png)

# Coordination is not orchestration

"Handoff" is the most overloaded word in agent frameworks. Passing a state bag to another graph inside one process is not the same act as two principals agreeing to do something together — and a runtime that cannot tell them apart will eventually enrol people by iterating over them.

Day 17 of 21 · The missing layer

In LangGraph and the OpenAI SDK a handoff means: this run, this process, hand the state to another graph. One executor, one principal. That is **orchestration** — sequencing work *inside* one agent.

When two agents with two custodians agree to do something together — charter a team, then enrol every member of a workspace — that is **coordination**. Different plane, different objects, different authority.

— **Scope.** Coordination: between agents, multi-principal. Orchestration: within one agent, one executor.
— **Plan.** Coordination: a durable, versioned plan adopted by a signed decision. Orchestration: an execution plan for one goal, one run.
— **Actors.** Coordination: found through discovery, at the *capability* level. Orchestration: given — playbooks and injected tools.
— **Binding act.** Coordination: a signed contribution commitment against an exact plan revision. Orchestration: a step correspondence in the run.
— **Outcome.** Coordination: reduces a shared *Endeavor*. Orchestration: a receipt for this run.

The two planes are two **namespaces in the ontology** — coordination terms and execution terms — and a coordination plan is related to the execution plan compiled from it only by provenance (*derived from*, *decomposed as*). They are never subclassed or synonymised. A step's need is stated as a *capability requirement* on the coordination side and satisfied by a *tool* on the orchestration side; the two words never appear in each other's records.

Three rules we treat as load-bearing:

**Name the plane.** Bare "scheduling" is ambiguous. Say *allocation* (between agents) or *step ordering* (within a run). Mixing them is how a planner starts granting things.

**Discovery is coordination-only.** The orchestration core never queries a registry or a name; tools and playbooks arrive through ports. Capability requirements never appear in a tool spec; tool ids never appear in a coordination record.

**Neither plane is authority.** Allocating a step, adopting a plan, activating a playbook — none grants anything. A participant who accepted a plan still presents a mandate when they *act*. Runs never mutate coordination state; they send signed commands into a reducer.

**The line:** the creating agent may *invite*. It may not enrol people by iterating over them.

The failure this prevents: "add everyone on the workspace" compiled as a loop in one agent's run, with one mandate covering the lot. That is orchestration pretending to be coordination. The people being enrolled are principals; their acceptance is an event that reduces an Endeavor.

Where the frameworks are ahead: they have the *word* and a working implementation. We have the split, the objects, and a thinner serving plane. "Create a team and add the workspace" is the scenario we use to keep ourselves honest — and the invite fan-out is newer than the charter step.

**Question:** When your runtime "hands off" to another agent, does that agent have its own principal — and if so, whose grant does the next step present?

`#AIAgents #MultiAgent #Orchestration #A2A #AgenticWeb`

Previously: [Day 16 — Propose, authorize, act, prove](16-planner-mandate-executor-receipt.md). Next: [Day 18 — Behaviour is generated; authority never is](18-behaviour-generated-authority-never.md).

---

*Published on [LinkedIn](https://www.linkedin.com/in/richardpedersen1) as part of **The missing layer**, a 21-part series. The code behind it: [agentic-primitives](https://github.com/agentictrustlabs/agentic-primitives) — the developer kit — and the [source monorepo](https://github.com/agentictrustlabs/agenticprimitives).*
