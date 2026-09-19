![Cover](images/day-06-delegation-artefact.png)

# Delegation is the artefact, not the token

*Day 6 of 21 · The missing layer · Week 2: Authority*

Every OAuth deployment picks a number — five minutes, an hour. That number is the size of the window during which a revoked permission still works. This week is about designing so that there is no number to pick.

Week 1 argued that an agent's identity should be an account that can sign. This week is about what that account signs *to let someone else act*: the delegation. The case I want to make is that the delegation itself — not a token derived from it, not a scope that summarizes it — should be the thing that travels, is verified, and is revoked.

## What OAuth got right, and what it fixed in place

OAuth's model: a resource owner authorizes a client; an authorization server issues a token; the resource server trusts the token because it trusts the issuer. It works because the issuer is a fixed, trusted party and the token is short-lived.

Both assumptions fail for agents. There is no fixed issuer — the *principal* is the issuer, and there are as many principals as there are people and organizations with agents. And "short-lived" is a compromise between two bad options: a token that lives long enough to be useful lives long enough to be abused after the authority behind it is withdrawn.

Scopes have a second problem. `payments:write` says nothing about *which* payee, *what* ceiling, *which* intent. Field-level authority does not fit in a scope string, so it ends up in policy code at the resource server — which means every resource server re-implements it, and none of them can prove to a third party what the principal actually permitted.

## The delegation as a first-class object

ERC-7710 defines a delegation as a signed statement: *delegator* grants *delegate* the right to act on the delegator's behalf, subject to *caveats* enforced by on-chain *enforcer* contracts. The delegate redeems it by presenting it with the action; the delegation manager runs every enforcer before the action is allowed.

Adopting that as the unit of authority changes several things at once.

**The principal is the issuer.** A person's smart account signs the delegation. There is no authorization server; the account *is* the authority, and a counterparty verifies the signature against it with ERC-1271. Organizations issue the same way, through whoever holds custody.

**Caveats carry field-level authority.** A caveat is executable: *payee must equal this address*; *amount must not exceed this ceiling*; *redeemable once, with this nonce*; *only before this timestamp*; *only for a request whose digest equals this value*. The authority is in the artefact, not in a resource server's policy table, and anyone can read it.

**Attenuation is a chain.** A delegate can re-delegate a narrower version — the same object with more caveats — and the chain is verifiable end to end. An organization's custodian lets the org's treasury service pay vendors up to 500; the treasury lets a procurement service pay *this* vendor up to 120 for *this* invoice. (The org's own agent never touches the money — the treasury is a separate service agent chartered under it, Day 5.) Every link is signed by the party who had the right to sign it, and no link can widen what the previous link allowed.

**Revocation is a transaction.** The delegator revokes on chain. From that block on, any redemption fails at the manager, and any verifier reading `isRevoked` gets the answer. There is no token to expire, because nothing was minted.

**Redemption enforces, again.** The enforcers run *at the moment of commit*, in the same transaction as the action. This is the property no off-chain verifier can give you: even if a runtime is compromised and skips its own checks, the chain will not move value outside the caveats.

## The three places we verify

In our harness, a step that touches something protected — a treasury payment, a message as someone, a record write — is verified three times:

1. **Before the step.** The harness reads the delegation, checks the signature against the delegator's account, checks revocation on chain, checks that the caveats cover *this* step's tool, resource and arguments. What counts as "the resource" is not a guess: the tool's contract names which argument it is, and the ontology says what kind of thing that is — a treasury, an inbox, a record — so the caveat and the call are compared in the same vocabulary.
2. **After every human approval.** A pause for approval is a pause during which revocation may have happened. Resuming re-verifies; a checkpointed "approved" is never sufficient on its own.
3. **At redemption.** The chain's enforcers run. This is the residue that steps 1 and 2 cannot close: the gap between "verified" and "committed."

A denial at any of the three is terminal, not retryable. A revoked grant is not weather.

## What this costs

Honesty about the bill:

- **Latency.** A revocation check is a chain read. We keep it to one `readContract` per step, cache-first over indexed state, and forbid log scans in any product path — but it is still a network round trip an in-process ACL does not have.
- **Propagation is pull.** A peer holding a verified delegation is not *notified* of revocation; it finds out on its next read. Block time plus one read is the bound. Push notification to peers holding live wires is planned, and will be consumed as evidence to re-verify, never as a verdict.
- **Each caveat is a contract.** Digest-binding and payment enforcers are live; depth-limit and obligation enforcers are specified and not yet deployed.

## Where this stands in the field

MetaMask's Delegation Toolkit ships the ERC-7710 object model and enforcers; Rhinestone's Smart Sessions and Lit's Vincent express similar ideas with different objects. What we add is the *harness discipline* around them — per-step verification, re-verify after approval, intent-digest binding (Day 8), receipts that name the grant (Day 19) — and the refusal to let any off-chain layer stand in for the on-chain check.

NANDA and the registry papers treat delegation as an open question: "can agents authorize credentialing on the fly via smart contracts?" Our answer is that this is the *whole* question, and it cannot be answered at an index. It needs a principal that is an account.

**The line:** a token is a claim that authority existed at issue time. A delegation is the authority itself, still checkable at act time.

Tomorrow: why a grant that is checked once is a grant that is cached.

---

**Question for the community:** For those running ERC-7710 or Smart Sessions in production — what caveat did you find you needed that the toolkits did not have?

`#Delegation #ERC7710 #AccountAbstraction #ZeroTrust #AgenticWeb`

Previously: [Day 5 — Person, organization, service](05-person-org-service.md). Next: [Day 7 — Checked once is cached](07-checked-once-is-cached.md).

---

*Published on [LinkedIn](https://www.linkedin.com/in/richardpedersen1) as part of **The missing layer**, a 21-part series. The code behind it: [agentic-primitives](https://github.com/agentictrustlabs/agentic-primitives) — the developer kit — and the [source monorepo](https://github.com/agentictrustlabs/agenticprimitives).*
