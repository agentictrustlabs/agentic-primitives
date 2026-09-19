![Cover](images/day-19-receipts-that-travel.png)

# Receipts that travel with the agent

If your vendor's tracing product disappeared tomorrow, what could a counterparty still prove about what your agent did last week?

Day 19 of 21 · The missing layer

Most agent traces answer "what did the runtime do?" Ours are built to answer "what did *this principal* do, under *this grant* — and can anyone show it without the runtime's cooperation?"

Every protected step produces a **step receipt**:

— the tool, its declared risk, the capability;
— the mandate reference and the verifier's decision;
— approvals — who signed, over which digest;
— an idempotency key and an input digest;
— the transaction hash, if value moved;
— the digest of the playbook that admitted the run.

Receipts go to two places the runtime does not own.

**A hash-chained audit sink.** Each row commits to the previous; tampering with the middle is visible. This is the tamper-evident execution log the NANDA papers call for — except it is not a platform log. It is a chain the owner holds.

**A PROV-O / P-Plan graph in the owner's vault.** Who, what, under which plan step, derived from which intent, associated with which agent — the same vocabulary for single runs, fabric exchanges and multi-party Endeavors. And the same ontology that classified the agent as a person, organization or service (Day 5) and typed the intent it acted on (Day 8) now describes what it did. Provenance is not a schema bolted on after the fact; it is the same T-box, read backwards. The public knowledge base never sees it: provenance of private acts is private.

Beside them, **verification receipts** — a verifier's signed record of what it checked and found — so evidence is disputable *deterministically* before anyone adjudicates.

What we refuse to prove: **code integrity as identity.** A TEE attestation or an SBOM answers "is this the binary?" It cannot answer "may this binary act as Alice?" Conflating the two is how a compromised attester becomes everyone. What we *do* attest is the *behaviour definition*: the compiled playbook digest, verified at load, stamped on every receipt. A counterparty can know which playbook produced an act without any claim about the binary that ran it.

**The line:** a receipt is a worse observability product and a better evidence product.

Where the frameworks are ahead: LangSmith's and MAF's traces are richer, faster to query, and already have the dashboards operators want. We have not closed that gap with an operator view. We have refused to let the operator view become the evidence.

Honest limit: receipts and the hash-chained sink are live. The PROV projector exists and is not yet wired into every conversational run; the on-chain receipt-anchor registry is specified, not deployed. "Travels with the agent" is true as a vault record the owner *can* carry — we have not yet demonstrated carrying it to another Home.

**Question:** If your vendor's tracing product disappeared tomorrow, what could a counterparty still prove about what your agent did last week?

`#Provenance #PROVO #AIAgents #Audit #AgenticWeb`

Previously: [Day 18 — Behaviour is generated](18-behaviour-generated-authority-never.md). Next: [Day 20 — Admission, always](20-https-mtls-admission.md).

---

*Published on [LinkedIn](https://www.linkedin.com/in/richardpedersen1) as part of **The missing layer**, a 21-part series. The code behind it: [agentic-primitives](https://github.com/agentictrustlabs/agentic-primitives) — the developer kit — and the [source monorepo](https://github.com/agentictrustlabs/agenticprimitives).*
