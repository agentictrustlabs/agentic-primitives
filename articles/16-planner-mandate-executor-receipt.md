![Cover](images/day-16-propose-authorize-act-prove.png)

# Planner proposes, mandate authorizes, executor acts, receipt proves

*Day 16 of 21 · The missing layer · Week 4: Acting*

Intelligence may be probabilistic. Authority must not be. Everything in this article is a consequence of taking that sentence literally.

Three weeks in, the substrate has an identity that can sign, grants that are checked per step, and a trust graph instead of a score. This week is about the part people actually see: an agent *doing something*. I want to describe the harness we run, compare it honestly to LangGraph, Microsoft Agent Framework, Dapr Agents and the OpenAI Agents SDK, and be precise about where each is ahead.

## The one-turn sequence

A request arrives — from a person in their Home, or from another agent over A2A.

1. **Scope.** The app says where you are standing: which agent context is selected, what this app offers, what standing the connected user has. This narrows what the conversation *offers*. It is never a parameter of any permission check — scope is honesty; the mandate is authority.
2. **Classify.** The request becomes a typed **intent** with a stated **outcome**, and maps to a capability from the agent's *behaviour definition* — a compiled set of playbooks (Day 18). Intent, outcome and capability are all ontology terms; the tool set the planner sees is generated from that definition, not hand-written.
3. **Resolve.** Parties are resolved in the asker's private tier (Day 9). Domain relationships — whose treasury, which congregation, who is a member of what — are followed in the ontology, never guessed from names.
4. **Plan.** A planner — an LLM behind a port, currently Anthropic — proposes steps. Each step names a tool. Each tool carries a *declared* risk floor and requirement type. The plan cannot lower a tool's risk.
5. **Verify, per step.** Does a live grant cover this tool, resource and arguments? Signature against the principal's account; revocation on chain; caveats against the actual call. If the step needs a mandate that does not exist yet, the run pauses with an `input-required` that says *exactly which signature is needed*.
6. **Approve → re-verify.** A human signs (Day 9). The run resumes by verifying again. A checkpointed approval is never sufficient on its own (Day 7).
7. **Execute.** The invoker for that capability runs — a message, a vault write, an A2A call to another agent, or a request to the principal's **treasury service** to pay. The person's or org's own agent never moves money; the treasury does, under the mandate, and the on-chain enforcers run again at commit.
8. **Receipt.** Tool, risk, capability, mandate ref, verifier decision, approvals, idempotency key, input digest, transaction hash, and the digest of the playbook that admitted the run — into the owner's vault, a hash-chained audit sink, and a PROV-O graph (Day 19).
9. **Reply.** The conversational close names what happened, carries the acted capability's binding so the Home can show the right result surface, and both parties are told.

Fan-out shapes — "message everyone on the team," "pay each member" — are compiled from the ontology into plans that **re-verify per item**. A branch is N mandates, not one.

## The ontology is doing more than resolving names

It is worth pausing on how much of that sequence is the ontology at work. The **intent** and its **outcome** are classes. The **capability** the planner is offered is a definition with an id that means the same thing on the A2A card, in the registry and on chain. The **plan shape** for "everyone on the team" is compiled from *a team has members; a member has an inbox* — modelled relationships, not a loop someone wrote. The **resource** a caveat is checked against is typed. The **receipt** is PROV-O. And the **trust graph** a counterparty reads (Day 11) is made of the same terms. One vocabulary from utterance to receipt is what makes the harness generatable (Day 18) and auditable (Day 19) at the same time. Frameworks give you a graph of nodes; they leave the meaning of the nodes to the prompt.

## The invariant

Every box in that sequence is a named symbol in our code, and the sentence they implement is the one at the top. The planner can be wrong, hijacked or creative. Steps 5–7 do not care. Nothing in the harness consults the planner's opinion about whether a step is allowed.

## Against the frameworks — where each is ahead

"We're different" is cheap, so let me be precise.

**LangGraph** is ahead on durable execution: checkpoint every node, resume from any point, time-travel, human-in-the-loop via `interrupt`, and LangSmith's tracing is the best observability in the field. Where we differ: their checkpoint *is* the truth on resume; ours is an input to re-verification. Their interrupt resumes on a click; ours resumes on a signature over a digest. Their trace is the vendor's; our receipt is the owner's.

**Microsoft Agent Framework** is ahead on middleware composition, context providers, and a durable-task extension that is genuinely production-grade. Their approval middleware is the right shape and the wrong material — an approval object, not a grant. In MAF a step's authority is a policy decision the middleware *makes*; in ours it is an on-chain artefact the middleware *reads*.

**Dapr Agents** is ahead on durable approvals with timeout auto-deny, resume-after-failure, and pre-invocation hooks with a clean decision set (proceed / mutate / deny / require-approval). We copied that discipline into our durable-step contract. Where we differ: a Dapr hook's "deny" is a hook's opinion; ours is a terminal denial because a grant is gone, and no retry can change it.

**OpenAI Agents SDK** is ahead on developer experience, handoffs and guardrails as first-class primitives. Where we differ: a handoff there is orchestration inside one runtime; for us it is *coordination* between principals (Day 17) and crosses an authority boundary with its own mandate.

Across all four: **identity survives the runtime, attenuation is an on-chain chain, revocation is checked per step, the intent digest binds the act, and the nonce is single-use.** Those five properties are contract-enforced here and policy code everywhere else. That is the whole differentiation — and the whole cost.

## Where we are behind

The frameworks are ahead of us on **recovering, observing and scaling the run**:

- Our durable executor is young: per-step checkpointing behind a port, Cloudflare Workflows as the first adapter, the reconcile-verify-act rule written down — but most long-running shapes still run on hand-built state machines we are retiring.
- The PROV-O projector exists and is not yet wired into every conversational run; OTel GenAI span export is planned.
- We have two orchestration loops (one for tasks, one for the Ask) that should be one.
- Memory breadth — episodic summaries, preferences, "remember that" — is thin.
- We publish no latency numbers yet.

Each catch-up wave carries the authority twist: resume re-verifies; a branch is N mandates; a trace cites a transaction. That twist is what stops us adopting a framework wholesale — and it is a real cost, not a virtue.

## What the harness is not

It is not a framework you install. It is a set of ports — planner, tool invoker, approval, durable step, memory — with an authority-aware loop in the middle and Ring-1 adapters at the edges. Our apps wire model credentials and tool implementations; they do not re-implement the loop. Whether that is the right packaging is a question I would genuinely like the framework authors' view on.

**The line:** the planner may be wrong about *how*. It is never consulted about *whether*.

Tomorrow: why "handoff" is a coordination word, not an orchestration one.

---

**Question for the community:** For those running agents in production on LangGraph, MAF or Dapr — when a permission is revoked mid-run, what does your runtime do with the checkpointed approval?

`#AIAgents #LangGraph #AgentFramework #DurableExecution #AgenticWeb`

Previously: [Day 15 — The vault is the record](15-vault-is-the-record.md). Next: [Day 17 — Coordination is not orchestration](17-coordination-vs-orchestration.md).

---

*Published on [LinkedIn](https://www.linkedin.com/in/richardpedersen1) as part of **The missing layer**, a 21-part series. The code behind it: [agentic-primitives](https://github.com/agentictrustlabs/agentic-primitives) — the developer kit — and the [source monorepo](https://github.com/agentictrustlabs/agenticprimitives).*
