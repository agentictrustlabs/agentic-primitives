# Commons

A small community app: **connect via your Home, message, discuss, keep a shared library.**

One Cloudflare Worker. No database, no KV, no Durable Object, no queue — because every durable
record it touches lives in somebody else's vault. That is why the deploy is one command, and it is
also the point.

```sh
cp .dev.vars.example .dev.vars    # add a SESSION_SECRET
pnpm dev                          # http://localhost:8799
```

## What it does

| Tab | What happens | Where the data lives |
| --- | --- | --- |
| **Discussion** | Topics and posts in a community | The organization's vault |
| **Messages** | 1:1 messages, sent by the person's own agent | The recipient's inbox, at their Home |
| **Library** | Publish documents with verifiable content commitments | The organization's vault |
| **Members** | Who is in the community; where an invitation gets issued | The org's vault (invite record) |
| **Under the hood** | Your address, the delegation hash, the contracts | The chain |

That last tab is not a demo flourish. An app holding authority over somebody's organization should
be able to tell them exactly which delegation that is and how to revoke it. Ship something like it.

## The shape to copy

```
browser ──▶ /api/*  (httpOnly cookie, no credential in JS)
              │
         this Worker ──▶ Home    (OIDC, related orgs, inbox)
              │        └▶ A2A     (topics, messages, library)
              ▼
         index.html from the ASSETS binding
```

The SPA's only API is this app's own `/api/*`. It never sees the `id_token`, never holds a
delegation, and no `@agenticprimitives/*` package that touches authority is bundled into the client.
Two independent reasons, both real: a bearer credential in `localStorage` is one XSS from being
somebody else's, and the live rails are origin-locked so a cross-origin call fails *and* leaks.

## Files worth reading

| File | Why |
| --- | --- |
| `src/worker/index.ts` | Every pattern, in about 450 lines. Start here. |
| `src/worker/config.ts` | The **one** module that knows any hostname (ADR-0021's shape) |
| `src/worker/session.ts` | AES-GCM sealed cookie; what is deliberately *not* in it |
| `src/worker/orgs.ts` | Fetching org stewardship wires, and why the cache is 60 seconds |
| `src/ui/views/parts.tsx` | Rendering a refusal as a ceremony rather than an error |

## Test identities

The connect screen carries a collapsed pane listing the pre-custodied identities the Home offers
(`/connect/demo-personas`). Connecting as one is an ordinary sign-in — same verification, same
session cookie, same version — against a real on-chain Smart Agent whose custodian the Home holds.
Not a demo mode: an app with a second, weaker session path is an app whose real path is untested.

**Gated by the Home, not by this app.** `listDemoIdentities()` returns `[]` when the Home offers
none, and the pane does not render. No flag ships here, and no list is hardcoded — an app that
hardcoded one would defeat the gate.

Collapsed by default and never auto-opened: anyone who opens it can act as those accounts.

What works as one, verified end to end: sign-in, identity, messaging, and the chain panel.
**Discussion and the library do not** until a community is connected *in this app* — that ceremony
runs at the Home, and shared accounts have no keyless route into it, so it needs a browser sign-in
there first.

## Configuration

`wrangler.toml` `[vars]`:

| | |
| --- | --- |
| `CLIENT_ID` | Registered at the Home. `REDIRECT_URI` must be an **exact** match for one of its URIs. |
| `HOME_ORIGIN` / `HOME_ZONE` | The apex Home, and the zone whose single-label subdomains are also Homes |
| `DELEGATE` | Your backend account — a delegate, never a custodian |
| `A2A_BASE` | The A2A worker |

Secret: `wrangler secret put SESSION_SECRET` (32+ random bytes, encrypts the session cookie).

If you deploy alongside the rails on the same Cloudflare account, add a service binding —
Cloudflare forbids a Worker fetching a sibling `*.workers.dev` URL (error 1042):

```toml
[[services]]
binding = "A2A"
service = "demo-a2a-production"
```

`buildConfig` picks it up automatically; a cross-account deploy needs nothing.

## Deploy

```sh
pnpm deploy    # vite build && wrangler deploy
```

Then register the deployed origin at your Home — **Manage → Your apps** — and set `REDIRECT_URI` to
match it exactly. See [docs/register-your-app.md](../../docs/register-your-app.md).

## Things it deliberately does not do

- **Create an organization.** The person does that at their Home, custodied by their own credential.
  This app requests the ceremony; it cannot perform it.
- **Enable anyone's storage.** A steward signs that delegation once, at their Home. The app shows a
  link and says so.
- **Approve messaging.** One signature per new contact, at their Home. The refusal names the
  recipient so the approval is one click.
- **Store anything.** Refresh and you are reading the owner's record, not a copy.
- **Issue an invitation.** An invitation carries a member-access grant the ORGANIZATION signed
  against the invitee's address; without it they accept, arrive, and are refused. Producing that
  signature takes the org's custody, reached through the steward's own credential — a Home session.
  A relying app authenticates *as* the person and holds none, so `GET /api/invite` resolves who may
  invite and where, and the person completes it at their Home. Not a fallback: a selection made up
  front, because this one can never succeed here.

Each of those is a place where a normal app would quietly do the thing itself. Every one of them
would mean holding custody the person did not grant.

## Honest limits

- The `/api/*` surface is **verb-shaped** — `POST /api/topics`, `POST /api/messaging/send`. The
  direction of travel is intent-shaped, where a UI says "publish this to the community" and an agent
  plans and composes. Build new surfaces that way where you can; this one is the simple version and
  says so.
- Reading the org list re-fetches from the Home every 60 seconds. Fine at this scale; a real app
  wants an event, not a poll.
- No tests. The example is the documentation, and the verification is `pnpm check:endpoints`
  against the real services.
