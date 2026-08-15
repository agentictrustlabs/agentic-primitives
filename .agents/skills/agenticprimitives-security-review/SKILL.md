---
name: agenticprimitives-security-review
description: Perform a security review of an Agentic Primitives integration. Use for custody, account abstraction, delegation, A2A/MCP admission, signing, protected data, live contract use, or production-readiness review.
metadata:
  version: "0.1.0"
  kind: developer
  status: pilot
---


# Review security and authority

Trace each operation from human/organization intent to credential, canonical subject, session, delegation, admission, policy, contract/tool execution, and audit evidence.

Check:

- canonical identity binding;
- custody versus operational authority;
- signer/KMS boundaries;
- chain, audience, route, subject, and method binding;
- caveats, value/time limits, redelegation, revocation, pause;
- nonce/JTI and transaction replay protection;
- counterfactual account and initializer safety;
- proxy/admin/upgrade authority;
- deployment/ABI/code-hash compatibility;
- MCP/A2A protected-data path;
- secret handling and logging;
- ontology facts used as evidence rather than authorization;
- local/testnet/mainnet boundaries;
- positive and adversarial tests;
- audit/provenance completeness.

Produce findings with severity, evidence, exploit/precondition, remediation, regression test, and release impact. Do not mark a finding closed without a source/test anchor.
