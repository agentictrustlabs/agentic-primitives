# Live endpoints

Real deployments on Base Sepolia. Verify with `pnpm check:endpoints` — if it disagrees with this
page, believe the endpoint and fix the page.

```
Home  https://www.impact-agent.me
A2A   https://demo-a2a-production.richardpedersen3.workers.dev
MCP   https://demo-mcp-production.richardpedersen3.workers.dev
Chain Base Sepolia · 84532
```

---

## Home — the person's origin

### Public

| | |
| --- | --- |
| `GET /.well-known/openid-configuration` | Standard discovery |
| `GET /jwks` | ES256 public keys; verify every `id_token` against these |
| `GET /connect/client-info?client_id=` | Is this app registered, and what is it called? |

```json
// /.well-known/openid-configuration — the parts that matter
{
  "issuer": "https://www.impact-agent.me",
  "authorization_endpoint": "https://www.impact-agent.me/",
  "token_endpoint": "https://www.impact-agent.me/token",
  "jwks_uri": "https://www.impact-agent.me/jwks",
  "response_types_supported": ["code"],
  "code_challenge_methods_supported": ["S256"],
  "scopes_supported": ["openid", "profile", "agent"],
  "claims_supported": ["sub", "aud", "iss", "exp", "iat", "nonce",
                       "agent_name", "canonical_agent_id"]
}
```

**`sub` and `canonical_agent_id` carry the Smart Agent address in CAIP-10 form.** That address —
not `agent_name` — is the identity.

### The sign-in flow

```
GET  /?client_id=…&redirect_uri=…&response_type=code&scope=openid+agent
      &state=…&nonce=…&code_challenge=…&code_challenge_method=S256
      &agent_name=…&delegate=0x…&delegation_template=site-login

  → the person's ceremony runs here → redirect back with ?code&state

POST /token   { grant_type: "authorization_code", code, code_verifier,
                client_id, redirect_uri }
  → { id_token, delegation, org?, expires_in }
```

`delegation_template` decides the caveat set. `site-login` gives identity plus a scoped grant to
your delegate. `org-create` additionally lets the person pick or create an organization and returns
`org.stewardshipDelegation`. Your app cannot widen a template.

### Person-authorized (Bearer `id_token`)

| | |
| --- | --- |
| `GET /connect/related-orgs?client_id=` | Orgs this person linked to **your** app, with their stewardship wires |
| `GET /connect/inbox?preview=1` | Their inbox — the Home holds read residency |
| `GET \| POST /connect/library` | Their (or an org's) content library |
| `GET \| POST /connect/channels` | Discussion, Home-side |
| `GET \| POST /connect/directory` | Community listings |
| `GET \| POST /connect/work` | Coordination / endeavors |
| `GET \| POST /connect/apps` | **Home session only** — your own OIDC registrations |

`/connect/apps` deliberately refuses a relying token: it is the surface that decides which apps
exist, and an app able to call it could register more apps under the member's name.

### Per-handle Homes

A person with a claimed name has their own Home at `<label>.impact-agent.me`, and **that** is the
`iss` on their token. Accept the apex and any single-label subdomain of the zone. Nothing else —
not nested labels, not http on a real host.

---

## A2A — the agent boundary

### Public

| | |
| --- | --- |
| `GET /health` | `{ ok, service, chainId, factory, runtime }` |
| `GET /.well-known/agent-card.json` | This worker's A2A card |
| `POST /interactions/{principal}/status` | **No session.** `{ granted, current, deliveryGranted }` |

### The interactions rail

```
POST /interactions/{principal}/{op}
{ "session": "<id_token>", "stewardship": <wire>, ...args }
```

~40 ops. Full reference: [interactions-api.md](./interactions-api.md).

CSRF-exempt — the session is in the body, not a cookie. Which is exactly why these calls belong on
your server.

### Routes you will see and should not use

`/mcp/*`, `/tools/*`, `/intent` require a gateway assertion from the edge worker on this
deployment:

```json
{ "jsonrpc": "2.0", "error": { "code": -32001, "message": "gateway_assertion_required" } }
```

That is the documented shape, not an outage. Reach the vault through the interactions rail.

`/session/*`, `/account/*`, `/custody/*` are the first-party relayer surface for the reference
demos — sign-in, gasless deploys, custody ceremonies. A third-party app does not need them; the
Home performs those on the person's behalf.

### Per-agent subdomains

Every `<handle>.impact-agent.io` is bound to this worker and serves that agent's A2A endpoint
directly, including its own agent card with that agent's skills.

---

## MCP — the vault

`https://demo-mcp-production.richardpedersen3.workers.dev`

Where records live: encrypted, scoped per record by the delegation reaching them, replay-protected
by a single-use token id enforced at the database.

**Your app does not call this**, and on this deployment it cannot. Every path runs through the A2A
worker so the delegation chain stays intact at each hop. It is listed here so you recognise it in
traces, not so you can call it.

---

## Rate limits and honesty about the deployment

Assistant dispatch is bounded per topic. Coordination reads are bounded per turn. Both are set
generously on this deployment because its actual load is people building against it — the
production values are lower.

These are reference deployments on a testnet. Sessions are demo-grade by design; production custody
is the job of the KMS backends in `@agenticprimitives/key-custody`. Learn the model here; do not
put real value through it.
