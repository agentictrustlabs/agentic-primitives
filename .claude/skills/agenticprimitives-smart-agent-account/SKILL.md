---
name: agenticprimitives-smart-agent-account
description: Implement an Agentic Primitives Smart Agent account flow using released account/custody packages and contracts. Use for canonical account creation, counterfactual addressing, ERC-4337 operations, ERC-7579 modules, signer setup, recovery, or paymaster integration.
metadata:
  version: "0.1.0"
  kind: developer
  status: pilot
---


# Build a Smart Agent account flow

1. Identify the canonical subject: person, organization, service agent, or treasury.
2. Select account, custody, key-custody, connect/auth, and contract packages from one compatible release.
3. Derive or resolve the counterfactual Smart Agent address deterministically.
4. Keep credentials/signers replaceable facets; do not make a login identifier the canonical identity.
5. Configure custody-policy modules separately from operational delegation.
6. Use a bundler/paymaster only through explicit adapters and environment configuration.
7. Bind user operations to the expected chain, entry point, account, nonce, call data, and sponsorship policy.
8. Add deployment, signature validation, module, recovery, replay, and wrong-chain tests.
9. Record account creation and custody changes as evidence.

Never export a raw signing key or use a custody administrator as an unrestricted application delegate.
