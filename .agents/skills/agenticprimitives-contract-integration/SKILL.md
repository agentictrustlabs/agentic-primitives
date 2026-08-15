---
name: agenticprimitives-contract-integration
description: Integrate an application with released Agentic Primitives Ethereum contracts using versioned deployment manifests, ABIs, typed clients, simulation, and code-hash verification. Use for contract reads, writes, events, EIP-712 data, or chain-specific configuration.
metadata:
  version: "0.1.0"
  kind: developer
  status: pilot
---


# Integrate released contracts

1. Read `release-manifest.json` (or the app's `agentic.lock.json` when present) and assert the connected chain ID.
2. Resolve the contract by logical name, chain, version/status filter, and deployment release.
3. Refuse an address supplied only in prose or copied source code.
4. Load ABI and EIP-712 definitions from the matching contract-artifact release.
5. For security-critical flows, fetch runtime code and compare its hash. Resolve and verify proxy implementation when present.
6. Construct a typed Viem contract/client from the resolved address and ABI.
7. For writes, simulate first and display the target, method, value, authority, and expected effects.
8. Submit through the intended wallet, Smart Agent, or user-operation path—not a raw private key.
9. Decode custom errors and events into audit evidence.
10. Add success, revert, wrong-chain, stale/deprecated deployment, and missing-authority tests.

## Never

- hardcode a live address;
- mix an ABI from one release with an address from another;
- disable chain checks to make a demo work;
- request a private key in chat or source;
- treat a successful transaction as proof that the intended authority model was correct.

See `references/verification-checklist.md`.
