# When it does not work

Ordered roughly by when you will hit it. Most entries are not bugs — they are a gate doing its job
or a ceremony that has not happened. The distinction matters, because the fix for a gate is never a
retry.

## Sign-in

### "Request blocked / Only start setup from a site you trust"

Your `client_id` is unknown at that Home, or your `redirect_uri` is not an **exact** match.

```sh
curl "https://www.impact-agent.me/connect/client-info?client_id=YOUR_APP_ID"
```

`404` → not registered. See [register-your-app.md](./register-your-app.md).
`200` → compare `redirect_uris` to what you sent, character for character. The usual culprits:

- a missing or extra trailing slash
- `www.` vs the apex
- `http` vs `https`
- a port that changed since you registered

### `unknown client_id` from `/token`

You registered at one Home and are exchanging at another. Remember that a **named** person's Home
is their subdomain — if the redirect came back from `nathan.impact-agent.me`, exchange there. The
`ConnectStart.authOrigin` your app stashed already holds the right one; use it rather than
re-deriving.

### The redirect comes back but `completeConnect` throws `state_mismatch`

The PKCE cookie is gone. Three causes, in order of likelihood:

1. More than ten minutes elapsed — the pending cookie is short-lived on purpose.
2. `SameSite=Lax` dropped it because the return was a cross-site **POST** rather than a navigation.
3. You started the flow on one origin and returned on another (`localhost` vs `127.0.0.1` are
   different origins).

### `token_invalid` after a successful exchange

The `id_token` failed verification. Check, in this order: the issuer you verified against matches
the `iss` claim; your allowlist accepts subdomains of the zone; the `nonce` you stashed is the one
you compared. Do not widen the issuer allowlist to make it pass — a wrong issuer is an attack.

---

## The interactions rail

### `409 · no interactions grant — enable interactions for this agent first`

**The most common first-run state, and not an error.** This principal has never enabled vault
storage. The owner (or a steward, for an organization) enables it once at their Home, by signing a
delegation. Your app cannot do it, cannot fake it, and should not retry.

Render it as a link. `apps/commons` shows a notice with an "Open your Home" button.

Ask `POST /interactions/{principal}/status` **before** rendering the surface — it is a public read
and it tells you this without a round trip through a failure.

### `409 · interactions grant is stale`

A grant exists but the scope widened upstream, so the old one no longer covers everything. A
steward re-enables. Same shape as above: a ceremony, not a bug.

### `409 · wire_absent`

The person has not approved their agent to message this counterparty. One prompt per new contact,
at their Home. The refusal names the recipient so the approval is one click.

### `403 · owner_only`

You reached an operation that is the person's own. Working as designed — see
[the table](./interactions-api.md#what-a-third-party-app-cannot-do-and-why). Your app authenticates
**as** a person; it is not them. If the feature needs one of these, the feature is asking for too
much.

### `403 · read_grant_absent` / `read_grant_scope` / `read_grant_revoked`

Your app has no scoped read grant, its grant does not cover this record, or it was revoked
on-chain. `read_grant_scope` names the resource it is missing.

The person authorizes it at their Home under **Manage → Connected**, by entering your app's
`client_id` and choosing which record family it may read. The grant they sign is read-only by
construction, scoped to that family alone, time-bounded, and revocable for your app without
touching any other. Reading someone's inbox from a third-party app always needs one — signing in
does not imply it, and that separation is the point.

### `403 · join this community first`

Neither a member nor a steward of that organization. Either the person has no directory listing
there, or you did not send the `stewardship` wire. Check `listRelatedOrgs` actually returned one:

```ts
const orgs = await connect.listRelatedOrgs(idToken, authOrigin);
console.log(orgs.map((o) => [o.orgName, !!o.stewardshipDelegation]));
```

Empty array usually means the person has not connected an organization to *this* app yet. Run the
`org-create` ceremony.

### `401 · invalid session: not a 3-part JWT`

You sent something that is not the `id_token` — commonly `undefined` stringified, or a session
cookie value. Log `session.slice(0, 20)` and check.

### `401` on a call that worked ten minutes ago

The token expired. They are short-lived by design. Re-connect; do not extend the TTL client-side
(you cannot) and do not cache the token longer (do not).

### `503 · revocation check unavailable — read refused`

The gate could not read the chain, so it refused rather than assumed. Fail-closed, correct, and
usually transient. A bounded retry of the **same** call is the right response.

---

## Deploying

### `SESSION_SECRET is unset or too short`

Local: `cp .dev.vars.example .dev.vars` and put 32+ random bytes in it.
Deployed: `wrangler secret put SESSION_SECRET`.

### Error 1042 from your Worker calling the A2A worker

Cloudflare forbids a Worker fetching a **sibling** `*.workers.dev` URL on the same account. Use a
service binding:

```toml
[[services]]
binding = "A2A"
service = "demo-a2a-production"
```

`buildConfig` picks it up automatically. A cross-account deploy uses the public URL and needs
nothing.

### The SPA loads but every `/api/*` returns HTML

The asset server is answering before the Worker. Check `not_found_handling = "none"` in
`wrangler.toml` — with `single-page-application` it returns `index.html` for everything, including
your API routes, with a 200.

### `pnpm dev` serves a stale UI

`vite build --watch` writes to `dist/client`, and `wrangler dev` serves that directory. Give the
first build a moment; if it persists, run `pnpm build` once and restart.

---

## Diagnosing anything else

```sh
pnpm check:endpoints    # are the live rails answering as documented?
pnpm check:packages     # does every published package still import?
```

`check:endpoints` catches the class of problem no amount of reading finds: the live services are
real and they change. If it disagrees with [live-endpoints.md](./live-endpoints.md), the endpoint
is right.

For a raw look at what a gate said, call it directly — the refusals are informative on purpose:

```sh
curl -sS -X POST \
  "https://demo-a2a-production.richardpedersen3.workers.dev/interactions/0xYOUR_ORG/channels.list" \
  -H 'content-type: application/json' \
  -d '{"session":"<id_token>"}' | jq
```
