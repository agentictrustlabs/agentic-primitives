---
name: agenticprimitives-a2a-service
description: Build an admission-controlled A2A service agent using Agentic Primitives identity, delegation, policy, skills, and audit. Use when exposing agent cards, skills, tasks, messages, or orchestration through an A2A endpoint.
metadata:
  version: "0.1.0"
  kind: developer
  status: pilot
---


# Build an A2A service

1. Define the service agent identity, owner/custodian, endpoint, public capabilities, and deployment environment.
2. Use the public A2A package and released identity/delegation/audit packages.
3. Keep Agent Card skills descriptive; map them to internal handlers and required authority.
4. Route every protected task through admission, canonical identity resolution, relationship/delegation validation, policy, replay defense, handler execution, and audit.
5. Keep orchestration app-local or domain-local; do not push product behavior into the primitive package.
6. Use runtime skills only when the required tools are exposed through the trusted handler path.
7. Return structured task status, artifacts, provenance, and errors.
8. Test unknown agent, invalid delegation, wrong audience, replay, unavailable skill, handler failure, and partial-result behavior.

Do not allow an LLM or `SKILL.md` to call private MCP/tool routes directly around the A2A authority path.
