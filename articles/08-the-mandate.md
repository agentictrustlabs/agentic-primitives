![Cover](images/day-08-mandate.png)

# The mandate: binding authority to one intent

"May pay vendors up to 500" permits the wrong payee, the wrong amount and the same payment twice. A delegation says what *kind* of thing an agent may do. A mandate says *this one thing, and nothing adjacent*.

Day 8 of 21 · The missing layer

The failure a mandate exists for: Alice tells her agent "pay the caterer 400." Her agent plans; her **treasury service** — a separate agent chartered under her — is what actually pays (Day 5). Somewhere between her sentence and the treasury call, prompt injection, a bad tool description or an honest planning error changes the payee, or the amount, or runs the payment twice on retry. The delegation permits every one of those outcomes.

A mandate is a delegation with two more caveats:

1. **An intent digest.** Alice's request is first made into a typed **intent** — the ontology's object, with a payee, a resource, an amount and a stated *outcome* ("400 arrives at the caterer, nothing else moves") — then canonicalised and hashed. The caveat says: redeemable only for an action whose digest equals *this* value. The planner may propose anything; only the action that matches what Alice actually asked for can commit. Hashing the typed intent rather than the sentence is what lets two phrasings of one ask bind the same, and two different asks never collide. (ERC-8273 now proposes the same gate as a draft standard — we are glad of the company.)

2. **A single-use nonce derived from the intent.** The same ask cannot pay twice. A retry that re-derives the same nonce is rejected at the enforcer; a *different* ask gets a different nonce.

For payments, the enforcer additionally pins **payee** and **ceiling**. So the mandate for "pay the caterer 400" reads: this payee, at most 400, for this intent, once.

**The line:** a compromised planner cannot exceed the mandate. It can be as creative as it likes about *how*. It cannot change *what*. Intelligence proposes; authority was fixed before the plan existed.

Two choices worth defending:

— **There is no "mandate" type.** A mandate is a delegation plus caveats. A parallel authority object would give verifiers two things to check and attackers two things to forge.
— **Risk is declared by the tool, never by the plan.** Each tool carries its own risk floor and requirement type — none, delegation, mandate, human signature — from the playbook contract that defines the capability (Day 18). A plan cannot mark a treasury payment "low risk" to skip the requirement.

Against the frameworks: LangGraph's `interrupt`, MAF's approval middleware and Dapr's pre-invocation hooks all pause for a human. None binds what *resumes* to what was *asked*. The approval is a click. Here it is a signature over a digest — tomorrow's post.

Honest limit: digest binding and payment enforcement are live on chain. The obligation and depth enforcers that would let a mandate say "and must produce a receipt" or "may not be re-delegated more than once" are specified, not deployed.

**Question:** When your agent retries a failed payment, what prevents the second attempt from succeeding *as well as* the first — and is the thing you hashed the user's words, or the user's intent?

`#Delegation #AIAgents #Payments #ERC7710 #AgenticWeb`

Previously: [Day 7 — Checked once is cached](07-checked-once-is-cached.md). Next: [Day 9 — "Yes" is a signature](09-confirmation-is-a-signature.md).

---

*Published on [LinkedIn](https://www.linkedin.com/in/richardpedersen1) as part of **The missing layer**, a 21-part series. The code behind it: [agentic-primitives](https://github.com/agentictrustlabs/agentic-primitives) — the developer kit — and the [source monorepo](https://github.com/agentictrustlabs/agenticprimitives).*
