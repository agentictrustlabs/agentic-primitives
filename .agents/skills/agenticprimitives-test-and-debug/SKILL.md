---
name: agenticprimitives-test-and-debug
description: Test and debug Agentic Primitives packages, live contract integrations, A2A/MCP services, and ontology profiles. Use when an integration fails, a starter is incomplete, or evidence is needed that a solution works safely.
metadata:
  version: "0.1.0"
  kind: developer
  status: pilot
---


# Test and debug

1. Record exact package, contract deployment, chain, ontology, skill, runtime, and tool versions.
2. Reproduce with the smallest example and synthetic data.
3. Run `doctor` and preserve redacted structured output.
4. Distinguish package/API, RPC/chain, deployment, signer/custody, delegation/policy, A2A/MCP, ontology/validation, and app-state failures.
5. Decode contract custom errors and service authorization errors before changing code.
6. Add a failing regression test before the fix when practical.
7. Include negative tests for wrong chain, wrong audience, expired/revoked/replayed authority, invalid graph, and unavailable tool.
8. Test packed packages and generated starters in a clean directory.
9. Report root cause, fix, evidence, and remaining risks.

Never bypass a security check merely to isolate a failure without clearly restoring and retesting it.
