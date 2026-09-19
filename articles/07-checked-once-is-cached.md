![Cover](images/day-07-checked-once-cached.png)

# A grant that is checked once is a grant that is cached

Every "sub-second revocation" claim I have read is really a claim about expiry. A five-minute credential is a verdict cached for five minutes.

Day 7 of 21 · The missing layer

NANDA reaches its number with credentials that live under five minutes plus a status list. OAuth reaches it with short tokens. OCSP stapling with short-lived responses. In each case the verifier is *allowed* to act on a credential it has not re-checked, as long as it has not expired.

The property we actually want is different: **no protected act is ever taken on a stored verdict.**

That has nothing to do with propagation speed. It has to do with *when* you check. So the harness checks the grant:

— **before every step** — signature, revocation, caveats against this exact step;
— **after every approval** — a pause for a human is a pause during which the world may have changed. A checkpointed "approved" resumes by re-verifying, not by trusting the checkpoint;
— **at redemption** — the on-chain enforcers run in the same transaction as the act.

Nothing is cached between those points except the *inputs* to the check. The check itself always runs.

Two things followed that surprised our own team.

**Durable execution gets harder, not easier.** Workflow engines love to checkpoint a decision and skip it on replay. For authority, that is the bug. Our durable-step contract says: a prior verdict is never sufficient; reconcile-verify-act is one indivisible attempt; a revocation between attempts is a terminal denial, not a retryable error. We wrote that rule down *before* adopting Cloudflare Workflows, because the engine's default was the opposite.

**Propagation speed becomes an optimisation, not a precondition.** We accept block-time, pull-based revocation — one block plus one read — because the property holds regardless of how fast a revocation *reaches* a peer. Faster is better. It is not what makes the system correct.

**The line:** revocation latency is a property of the network. Never acting on a stale verdict is a property of the design. Only one of them is under your control.

Honest limit: a peer holding a verified grant is not notified when it is revoked; it finds out on its next check. Signed revocation notices to peers holding live grants are planned — consumed as a reason to re-verify, never as a verdict themselves.

**Question:** In your agent runtime, what is the longest interval between a permission being revoked and the last act it still authorizes? Do you know the number?

`#ZeroTrust #Delegation #AIAgents #DurableExecution #AgenticWeb`

Previously: [Day 6 — Delegation is the artefact](06-delegation-is-the-artefact.md). Next: [Day 8 — One intent, one mandate](08-the-mandate.md).

---

*Published on [LinkedIn](https://www.linkedin.com/in/richardpedersen1) as part of **The missing layer**, a 21-part series. The code behind it: [agentic-primitives](https://github.com/agentictrustlabs/agentic-primitives) — the developer kit — and the [source monorepo](https://github.com/agentictrustlabs/agenticprimitives).*
