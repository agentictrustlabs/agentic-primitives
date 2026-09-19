![Cover](images/day-20-admission-always.png)

# HTTPS required, mTLS optional, admission always

A valid client certificate should never let a request skip a single authorization check — not "just this once," not on an internal hostname. The edge is where agent-identity designs most often cheat.

Day 20 of 21 · The missing layer

The normative public surface for an agent is **A2A over HTTPS**. A TLS certificate is **transport evidence**. It never establishes the owning person, the organization, the canonical agent, a relationship, a delegation, a purpose, a capability, consent or a policy.

**mTLS is optional and additive**, on a *separate hostname* (`mtls.<host>`). SPIFFE names a *workload*, never an agent. Which agent a workload may act as is a signed workload-identity binding issued by the agent's custodian and revocable like any grant. A certificate plus a SPIFFE path is how several "agent identity" designs try to finish the job in one hop. That hop answers the wrong question.

The order that must never invert:

> certificate → transport evidence → optional workload binding → application authentication → canonical resolution → **admission**

Admission is always required. It is where a crossing is observed: the edge mints the correlation id every downstream audit row carries. Application authentication is the caller's own credentials — a signature against an account, a presented grant — never the certificate.

**MCP is a private capability interface**, never a peer public surface. It sits behind an admitted runtime; Agent Cards do not advertise it. First-party UIs express *intents* to an A2A agent; they do not drive MCP directly. Web → MCP is RPC with extra steps. (A public `/mcp` we still run is labelled as a deliberately non-conformant interop demo for *external* clients — not a product model.)

On the A2A → MCP hop the same rule holds in the other direction: **Web3 is the authority; MCP OAuth is the ingress envelope.** The bearer carries a pointer to a grant, never the grant. Scopes are never field-level authority. An inbound token is never reused for the next hop. The Web3 gates — delegation, signature, entitlement, tool policy — are never skipped because "OAuth already authenticated the caller."

**The line:** a certificate tells you which pipe a request came down. It never tells you who may act.

Honest limit: HTTPS, optional mTLS, admission and the A2A-first rule are live. Web Bot Auth (RFC 9421) as additional transport evidence is designed and not yet on the edge. The labelled public MCP ingress still exists and is easy to mistake for the product.

**Question:** In your agent edge, can a valid client certificate cause any authorization check to be skipped — even "just this once," even on an internal hostname?

`#ZeroTrust #A2A #MCP #mTLS #AgenticWeb`

Previously: [Day 19 — Receipts that travel](19-receipts-that-travel.md). Next: [Day 21 — What we owe](21-what-we-owe.md).

---

*Published on [LinkedIn](https://www.linkedin.com/in/richardpedersen1) as part of **The missing layer**, a 21-part series. The code behind it: [agentic-primitives](https://github.com/agentictrustlabs/agentic-primitives) — the developer kit — and the [source monorepo](https://github.com/agentictrustlabs/agenticprimitives).*
