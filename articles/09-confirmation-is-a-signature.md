![Cover](images/day-09-confirmation-signature.png)

# "Send Alice 10 dollars" — confirmation is a signature

In most assistants, the user's "yes" is a chat message. The app could have run the action without it. Here, the payment cannot commit without it — because the "yes" *is* the signature.

Day 9 of 21 · The missing layer

The flow we build everything toward. Nathan is in his Home, on his own agent, and types:

> send alice 10 dollars

What happens — and what does not:

**Classify.** The Ask recognises a payment intent — a typed object in the ontology, with parties, a resource and an *outcome* (funds arrive at Alice's treasury; nothing else moves) — and the capability it maps to. That mapping comes from the same model that generates the UI, not from a prompt someone wrote (Day 18).

**Resolve — in Nathan's private tier, or refuse.** "Alice" is looked up among the people Nathan actually knows: his relationships, his org rosters, his vault. A public directory hit is *not* evidence he means that Alice. Two Alices: the Ask asks. None: it says so. It does not go searching the world — that is a different ask.

**Plan and preview.** Nathan's person agent does not hold money. Which **treasury** pays — the one chartered under him, or one under an org he stewards? The treasury is found by following `charteredUnder` in the ontology, not by guessing it is called `nathan.treasury`. We made exactly that string-matching mistake once; it dead-ended a real payment because his treasury was called something else. The relationship was in the ontology the whole time. The resolver just wasn't reading it.

**Confirm — this is the point.** The reply: "Sending Alice Jones 10 USDC from your treasury to Alice's. Confirm?" For anything of that risk, Nathan's *yes* is a **passkey signature over the mandate** — the delegation carrying the intent digest, payee, ceiling and nonce (Day 8). A chat "yes" authorizes nothing. The confirmation *is* the mandate.

**Execute under the mandate.** The harness verifies it; the treasury service pays; the on-chain enforcer checks payee, ceiling and nonce again at commit.

**Receipt.** "Sent. Receipt `0x…`." A step receipt names the mandate, the decision, the transaction and the digest of the playbook that ran — into Nathan's vault and hash-chained log. Alice's agent is told too. A payment that leaves no trace for either party is a defect we have shipped and fixed.

**The line:** the click cannot be skipped because the payment cannot commit without the signature. In the framework pattern — model proposes, UI shows "Approve?", user clicks, call runs with the *app's* credentials — the click authorizes nothing verifiable.

The same shape covers "had a baptism today": classify, resolve *which* congregation Nathan stewards (again a relationship in the ontology, not a name match), preview "add to Calvary's count?", confirm (lower risk: a signed vault write), receipt.

Honest limit: live for person-to-person payments and messages. Fan-out shapes ("pay everyone on the team") are compiled from the ontology and re-verify per item, but are newer and less exercised.

**Question:** In your assistant, what does a user's "yes" actually *produce* — and could the action have run without it?

`#AIAgents #Payments #Passkeys #Delegation #AgenticWeb`

Previously: [Day 8 — One intent, one mandate](08-the-mandate.md). Next: [Day 10 — The key is a delegate](10-the-key-is-a-delegate.md).

---

*Published on [LinkedIn](https://www.linkedin.com/in/richardpedersen1) as part of **The missing layer**, a 21-part series. The code behind it: [agentic-primitives](https://github.com/agentictrustlabs/agentic-primitives) — the developer kit — and the [source monorepo](https://github.com/agentictrustlabs/agenticprimitives).*
