![Cover](images/day-10-key-is-delegate.png)

# The service that acts as an agent must never *be* that agent

A service signs as an agent. No private key on disk; everything goes through a cloud KMS. The security review passes. And whoever holds the service-account credential can sign anything as that agent, forever, with nothing to revoke.

Day 10 of 21 · The missing layer

The KMS key **is** the identity's key. That is the failure — and it passes every "don't hold raw keys" check.

"No held key" is not the property. **"Not the custodian"** is the property. They are different sentences, and only the first one usually gets written down.

Our rule: a relying service never custodies the identity it acts as. Instead —

1. **The identity is custodied outside the service.** `outreach.svc` is a smart account whose custodian is a person or org, reachable through a Home ceremony.

2. **A ceremony mints a narrow wire.** The custodian signs a delegation: *identity account → the service's KMS session key*. Allowed methods: **exactly one** capability selector. Targets pinned. Time-bounded. The service stores the wire; it is a credential, not a secret.

3. **The service signs with the session key and wraps.** Each message carries the session-key signature *and* the wire. The KMS key signs digests on demand; no raw key at rest.

4. **The gate verifies per message, fail-closed.** Delegator equals the claimed signer; wire live and unrevoked on chain; one selector matching the requested capability; signature recovers to the wire's delegate; wire valid against the delegator by ERC-1271.

What changes, stated as the difference:

— Compromise. Key *is* the identity: you are that agent, for anything, forever. Key is a *delegate*: you are a delegate, only where a wire says so.
— Revocation. Key *is* the identity: re-mint the identity and every grant naming it. Key is a *delegate*: the custodian revokes one wire.
— Audit. Key *is* the identity: "the service signed." Key is a *delegate*: "this session key signed under this wire."

What it does *not* do — say it out loud: the cloud service-account secret does not disappear. It still exists. What changes is what it *controls*: a revocable delegate instead of an identity. Anyone who expects this pattern to remove the secret has misread it and will "fix" it back the wrong way.

**The line:** the check is not "is there a key file?" It is "if this service's credentials leaked, could the attacker do anything the custodian did not delegate?"

We have built this twice — once for a content-signing service, once for an org's A2A worker — and both times the wrong architecture had shipped first, with passing tests.

**Question:** For the services in your stack that sign as an agent — who is the custodian of that agent, and how do they revoke the service without re-minting the agent?

`#KeyManagement #ZeroTrust #AgentIdentity #A2A #AgenticWeb`

Previously: [Day 9 — "Yes" is a signature](09-confirmation-is-a-signature.md). Next: [Day 11 — Trust is a graph (article)](11-trust-is-a-graph.md).

---

*Published on [LinkedIn](https://www.linkedin.com/in/richardpedersen1) as part of **The missing layer**, a 21-part series. The code behind it: [agentic-primitives](https://github.com/agentictrustlabs/agentic-primitives) — the developer kit — and the [source monorepo](https://github.com/agentictrustlabs/agenticprimitives).*
