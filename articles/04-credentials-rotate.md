![Cover](images/day-04-credentials-rotate.png)

# Credentials rotate. Identity doesn't.

Every agent-infrastructure paper lists "key rotation" beside "revocation" as a thing that must happen in under a second. The faster fix is to make rotation not matter.

Day 4 of 21 · The missing layer

In most designs the agent's identity *is* a key. Rotate the key and every credential, grant and registry entry that named it must be re-issued. That is why rotation is slow, and why it is dangerous: the re-issue window is where impersonation lives.

In our substrate a key is a **control credential** beneath the anchor. Passkeys, hardware wallets, SIWE EOAs, KMS session keys — all are *facets* that may sign for the account. They are added, replaced and removed under the account's **custody policy**: a trustee quorum, a guardian quorum, multi-credential self-recovery, or a multi-sig. The account address — the identity — never changes.

Three consequences:

1. **Delegations survive rotation.** A grant is issued *by the account*, not by a key. Lose your passkey, recover with guardians, and every delegation you issued last month is still valid — and still revocable by you.

2. **Recovery is governance, not delegation.** Adding or replacing a credential is a custody-policy operation with its own quorum. It is never expressed as "delegate to the new key," because that would let a delegation change who the principal *is*.

3. **A compromised key is not a compromised agent.** Revoke the credential under custody policy. The anchor, its names, its grants and its history are untouched.

The service-agent case is stricter still (Day 10): a relying service *never* holds a credential of the identity it acts as — only a narrow, revocable delegation to its own session key.

Where this sits against the field: OAuth rotates by re-issuing tokens; X.509 by re-issuing certificates; NANDA by re-issuing short-lived credentials. All three re-issue because the credential *is* the identity.

**The line:** nothing in the system names the key, so nothing has to be re-signed when the key changes.

Honest limit: custody policies, guardian recovery and credential replacement are live. A public runbook of recovery drills with timings is something we still owe.

**Question:** In your stack, what breaks when you rotate an agent's signing key — and who has to re-sign?

`#AgentIdentity #AccountAbstraction #KeyManagement #ZeroTrust #AgenticWeb`

Previously: [Day 3 — Everything else is a projection](03-projections.md). Next: [Day 5 — Person, organization, service](05-person-org-service.md).

---

*Published on [LinkedIn](https://www.linkedin.com/in/richardpedersen1) as part of **The missing layer**, a 21-part series. The code behind it: [agentic-primitives](https://github.com/agentictrustlabs/agentic-primitives) — the developer kit — and the [source monorepo](https://github.com/agentictrustlabs/agenticprimitives).*
