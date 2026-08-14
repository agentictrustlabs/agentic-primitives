# @starter/home-connect

**Hand a person to their Home; get back a verified token and, sometimes, an organization.**

Your app runs no credential ceremony. It has no password field, no wallet button, and cannot create
an identity — the Home does all three, on its own origin, with a credential that deliberately does
not exist on yours.

Runs anywhere WebCrypto does: Cloudflare Workers, Node ≥ 20, the browser. No Node builtins.

```ts
import { createHomeConnect } from '@starter/home-connect';

const connect = createHomeConnect({
  clientId: 'my-app',
  redirectUri: 'https://my-app.example.com/',   // EXACT match at the Home
  delegate: '0x89D1…',                          // your backend account
  homeOrigin: 'https://www.impact-agent.me',
  homeZone: 'impact-agent.me',
});

// 1. Send them off. Persist the whole ConnectStart — you need every field back.
const start = await connect.startConnect({ agentName: 'nathan.impact' });

// 2. They return with ?code&state.
const { person, idToken, agentName, org } = await connect.completeConnect({ start, code, state });

// 3. Which organizations did they link to THIS app?
const orgs = await connect.listRelatedOrgs(idToken, start.authOrigin);
```

## What the pieces mean

**`idToken`** proves *who*. `sub` carries the person's Smart Agent address in CAIP-10 form. It
authorizes **nothing** — every gate downstream re-derives what they may do from a delegation they
signed. See [principle 3](../../docs/principles.md#3-a-token-says-who-a-delegation-says-what).

**`person`** is the Smart Agent address, lowercased. This — not `agentName` — is the identity.
Names are claimed, transferred and released; keying data by name silently reattaches one person's
records to another.

**`org.stewardshipDelegation`** is the credential that lets your app act **for an organization**.
The token says who the person is; this signed, on-chain-revocable wire says the organization named
them its steward. Your app stores it and can never mint it.

## Two templates

| Template | What the Home does | What comes back |
| --- | --- | --- |
| `site-login` | Runs the ceremony | `idToken`, a scoped `delegation` to your delegate |
| `org-create` | Also asks them to pick an org they steward, or name a new one their credential custodies | plus `org` with its `stewardshipDelegation` |

`org-create` runs in **chooser mode** — no `orgBase`, so the Home asks. Passing one would mean your
app decided which organization, and it is theirs to choose.

## Where a Home lives

A person with a claimed name has their **own subdomain**: `nathan.impact-agent.me`. Someone with no
name starts at the apex and onboards there. So the `iss` on the token you receive may not be the
origin you sent them to.

```ts
connect.homeOriginFor('nathan.impact')  // https://nathan.impact-agent.me
connect.homeOriginFor('')               // https://www.impact-agent.me

connect.trustsIssuer('https://nathan.impact-agent.me')  // true
connect.trustsIssuer('https://a.b.impact-agent.me')     // false — nested label
connect.trustsIssuer('http://impact-agent.me')          // false — not https
```

`trustsIssuer` is a hard allowlist (the relying-side half of SEC-018). **Never widen it to make a
login work.** A wrong issuer is an attack, not a config nit.

## Run it server-side

Two independent reasons, both real:

1. The `id_token` is a bearer credential with no revocation. In `localStorage` it is one XSS from
   being somebody else's.
2. The live rails are origin-locked. A cross-origin browser call fails *and* leaks.

`apps/commons` does this end to end: the Worker holds the token in an AES-GCM sealed `httpOnly`
cookie and the SPA's only API is that Worker.

## Errors

Every failure is a typed `HomeConnectError` with a `code`. There is no fallback chain — a refusal is
an answer, not a prompt to try something else.

| Code | Meaning |
| --- | --- |
| `redirect_not_registered` | The Home does not know this `client_id`, or the redirect is not an exact match |
| `issuer_not_allowed` | The origin that answered is not one this app trusts |
| `state_mismatch` | A cross-site request, or a stale tab |
| `token_invalid` | Signature / alg / iss / aud / nonce / exp verification failed |
| `code_exchange_failed` | Code expired, replayed, or PKCE mismatch |
| `no_agent_in_token` | Verified, but carries no Smart Agent address |

`redirect_not_registered` on a first run is almost always a registration step, not a code defect:
[docs/register-your-app.md](../../docs/register-your-app.md).

## Also exported

- **`fetchHomeManifest(origin)`** — fetch and gate a Home's signed manifest with
  `@agenticprimitives/home`'s fail-closed validators. Reachable ≠ trusted. On this deployment the
  manifest is published **per handle**, so the apex returns 404 and `verdict.checked === false`
  means "nothing was checked" — it never means trusted.
- **`asDelegationWire(value)`** — narrow the Home's opaque delegation payload to a structurally
  complete wire, or `undefined`. A real check, not a cast: a half-formed wire is worse than none,
  because *present* is what makes an app believe it is a steward.

## What this package will not do

Verify a delegation. Check a signature. Decide whether you have authority. Those are the gate's job,
per call, against the chain — and an app that concluded otherwise for itself would be exactly the
mistake the substrate prevents.
