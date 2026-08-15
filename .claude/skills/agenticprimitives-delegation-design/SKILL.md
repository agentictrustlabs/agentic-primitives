---
name: agenticprimitives-delegation-design
description: Design and implement scoped, revocable Agentic Primitives authority. Use when granting a web app, service agent, A2A peer, MCP invocation, or on-chain operation limited power on behalf of a person or organization.
metadata:
  version: "0.1.0"
  kind: developer
  status: pilot
---


# Design a delegation

1. Identify delegator, delegate, canonical subject, audience, target resources, methods/tools, value, time, chain, and purpose.
2. Select the smallest caveat/enforcer set that expresses the intended authority.
3. Bind off-chain invocation proofs to route, audience, nonce/JTI, expiry, and the same canonical subject.
4. Ensure redelegation is explicitly allowed or denied and cumulative restrictions cannot be widened.
5. Define revocation, expiration, and emergency pause behavior.
6. Keep custody/recovery authority outside operational delegation.
7. Generate human-readable review text and machine-readable typed data from the same model.
8. Add over-broad method, excess value, expired, replayed, wrong audience, wrong chain, revoked, and redelegation tests.
9. Emit issuance, use, failure, and revocation evidence.

Never create unrestricted or indefinite authority merely to simplify a demo.
