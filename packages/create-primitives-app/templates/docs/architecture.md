# How the pieces fit

Three live services, one chain, and your app. Nothing here is a mock.

```
                    ┌──────────────────────────────────────────┐
   the person ─────▶│  HOME    www.impact-agent.me             │
                    │  · runs the credential ceremony          │
                    │  · holds custody, signs delegations      │
                    │  · issues OIDC id_tokens                 │
                    │  · owns the person's inbox + library     │
                    └───────────────┬──────────────────────────┘
                                    │ id_token (who)
                                    │ delegation (what)
                                    ▼
   the browser ────▶┌──────────────────────────────────────────┐
      (your SPA)    │  YOUR APP                                │
                    │  · httpOnly cookie, no credential in JS  │
                    │  · proxies every privileged call         │
                    └───────────────┬──────────────────────────┘
                                    │ session + stewardship
                                    ▼
                    ┌──────────────────────────────────────────┐
                    │  A2A    demo-a2a-production…workers.dev  │
                    │  · verifies the token, verifies the wire │
                    │  · one serialized writer per principal   │
                    │  · topics · messages · library · inbox   │
                    └───────────────┬──────────────────────────┘
                                    │ delegation-gated
                                    ▼
                    ┌──────────────────────────────────────────┐
                    │  MCP    demo-mcp-production…workers.dev  │
                    │  · the vault: encrypted, per-record      │
                    │    delegation scope, replay-protected    │
                    └───────────────┬──────────────────────────┘
                                    │ readContract
                                    ▼
                        Base Sepolia (chain 84532)
                        delegations · revocations · names · accounts
```

## Who does what

### The Home — `www.impact-agent.me`

The person's origin. It is the **only** place a credential ceremony runs: passkey, wallet, Google,
email, phone. It holds custody, signs delegations on the person's behalf, and issues OIDC
`id_token`s to registered apps.

A person with a claimed name has their own Home at `<label>.impact-agent.me`. Someone with no name
yet starts at the apex and onboards there. **Your app must accept both as an issuer** — the apex
and any single-label subdomain of the zone, and nothing else.

Your app never runs a ceremony, never sees a credential, and cannot create an identity. That is
not a limitation you route around; it is the reason a person can trust your app at all.

### The A2A worker — the agent boundary

Where a browser session becomes bounded machine authority. It verifies who is calling, verifies
the delegation they present, and routes every operation on a principal through **one serialized
execution point** for that principal (a Durable Object keyed by its Smart Agent address).

That serialization is why concurrent posts to one topic cannot interleave into a corrupt document
— the underlying vault is last-writer-wins, and ordering has to come from somewhere.

`/interactions/*` on this worker is the surface your app uses. See
[interactions-api.md](./interactions-api.md).

### The MCP worker — the vault

Where records actually live: encrypted, scoped per record by the delegation that reaches them, with
single-use replay protection enforced at the database rather than in application code.

**Your app does not call this directly**, and on the live deployment it cannot — the agentic-data
routes require an edge-signed assertion. Everything reaches it through the A2A worker, so the
delegation chain stays intact at every hop.

### The chain — Base Sepolia

Not a ledger the app writes to. It is where the **answers** live:

- Is this delegation revoked? → `DelegationManager.isRevoked(hash)`
- Did this organization really sign this? → ERC-1271 against its account
- Who claimed this name? → the name registry

Every gate reads it. That is what makes a revoke work everywhere at once, including in apps whose
operators you have never met.

## The two credentials, again

Because it is the thing to get right:

```ts
await interactions.postToTopic(orgAddress, { topicId, text }, {
  session: idToken,               // WHO is asking      — verified against the Home's JWKS
  stewardship: stewardshipWire,   // MAY they act as X  — ERC-1271 + caveats + unrevoked on-chain
});
```

The token can only ever act as the person it names. The delegation says what that person may do
for someone else. Neither substitutes for the other, and the gate checks both independently.

## Where the stewardship wire comes from

Your app cannot mint one. It arrives from the Home, in one of two ways:

1. **The `org-create` ceremony.** The person picks an organization they already steward, or names
   a new one their own credential custodies, and the Home returns
   `org.stewardshipDelegation` with the token.
2. **`GET /connect/related-orgs?client_id=…`** with the person's token. The Home returns the orgs
   *this person* linked to *this app*, each with its wire.

Person↔org links are private vault credentials — not public graph state, not enumerable from the
chain. The Home is the only source, and it answers only for the token's subject.

## The request path, end to end

A person opens a topic in `apps/commons`:

1. **Browser** → `POST /api/topics` on your Worker. No credential; just an httpOnly cookie.
2. **Your Worker** unseals the cookie, reads the id_token, fetches the org's stewardship wire
   (cached 60s), and calls `POST {a2a}/interactions/{org}/channels.create` with both.
3. **A2A** verifies the token's signature and issuer, verifies the wire — delegator is that org,
   delegate is this person, caveat shape is stewardship not data-access, ERC-1271 against the org,
   unrevoked on-chain — then routes into the org's serialized writer.
4. **The writer** reads the topic index from the org's vault, appends, writes it back — all under
   the org's own interactions grant, through the MCP vault.
5. The answer comes back the same way. Nothing was stored in your app.

Four verifications happened that your app did not perform and could not have skipped.

## Live addresses

| | |
| --- | --- |
| Home | `https://www.impact-agent.me` |
| A2A | `https://demo-a2a-production.richardpedersen3.workers.dev` |
| MCP | `https://demo-mcp-production.richardpedersen3.workers.dev` |
| Chain | Base Sepolia, id `84532` |

Contract addresses ship with `@agenticprimitives/contracts` — see [contracts.md](./contracts.md).
Run `pnpm check:endpoints` to confirm they are answering as documented.

## Status, honestly

These are reference deployments on a testnet, not a product. Sessions are demo-grade by design;
production custody is the job of the KMS backends in `@agenticprimitives/key-custody`. Build
against them, learn the model, and do not put real value through them.
