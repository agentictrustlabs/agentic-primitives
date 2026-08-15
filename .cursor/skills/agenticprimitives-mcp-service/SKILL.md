---
name: agenticprimitives-mcp-service
description: Expose MCP resources and tools through Agentic Primitives admission, delegation, tool policy, replay protection, and audit. Use when building a protected MCP server, vault adapter, or A2A-to-MCP bridge.
metadata:
  version: "0.1.0"
  kind: developer
  status: pilot
---


# Build a protected MCP service

1. Classify every resource and tool by sensitivity, mutation risk, subject, and required authority.
2. Publish conformant schemas and stable logical tool names.
3. Authenticate/admit the caller and bind the invocation to canonical subject, audience, route, tool, arguments, expiry, and nonce/JTI.
4. Enforce delegation and tool policy at the server boundary before touching protected data or side effects.
5. Separate read and write tools when their risk differs.
6. Redact protected values from logs while retaining audit evidence.
7. Return structured authorization, validation, and tool errors.
8. Test missing tool, invalid schema, unauthorized subject, over-broad arguments, replay, revoked/expired grant, and partial backend failure.

Never teach a coding/runtime agent to reconstruct service MACs, call private HTTP routes, or paste delegation/vault credentials into chat.
