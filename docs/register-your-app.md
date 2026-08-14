# Registering your app at a Home

Your app cannot sign anyone in until the Home knows it exists. This is the first thing that will
stop you, it looks like a bug, and it is not.

## What registration is

An entry saying: this `client_id` exists, here is its display name, and here are the **exact** URIs
it may receive an authorization code at.

What it is **not**: a grant of anything. Every sign-in through a registered app is still a ceremony
the person runs with their own credential, ending in a delegation they sign, scoped by a template
your app cannot widen, and revocable on-chain without the Home's cooperation. Registration decides
who may *ask*; the person decides, every time, whether to *grant*.

## Register it yourself, from your Home

Sign in at your Home and open **Manage → Your apps** (`/developer`).

| Field | What goes in it |
| --- | --- |
| **App ID** | Your `client_id`, and the `aud` of every token minted for you. Lowercase letters, digits, single dashes, 3–40 chars. Permanent. |
| **Display name** | What people see on the consent screen. Make it recognisable. |
| **Redirect URIs** | One per line. **Exact match** — a trailing slash matters. |
| **Templates** | `site-login` always; add `org-create` if your app works with organizations. |
| **Delegate** *(advanced)* | Your backend account. Blank uses the shared demo delegate. |

Redirect URI rules, and the reason for each:

- **https only**, except `http://localhost` and `http://127.0.0.1` — a code delivered over
  plaintext to a real host is a code on the wire; loopback has no wire.
- **No fragment, no wildcard, no credentials in the URL** — the match is exact, so anything that
  makes "exact" ambiguous is refused at registration rather than at use.
- **Not on the Home's own domain** — an app whose redirect lived there would be same-site with the
  Home for cookie purposes. Registration must not be a way to move onto the Home's origin.
- **One origin, one app** — otherwise two apps could claim an origin and the index would answer for
  whichever wrote last.

Up to 10 apps per person, 8 redirect URIs each.

## What self-registration cannot request

Deliberately withheld, each for a specific reason:

| Withheld | Because it would grant |
| --- | --- |
| `socialCustody` | A KMS-custodied Smart Agent from a social sign-in — custody, granted by registration |
| `paymentConfig` | Payment mandates against a person's treasury |
| `collectionConfig` | The ability to redeem other people's standing mandates |
| `operational_delegate` | An org→service-agent operational grant |
| `jp-data-access`, `x402-pay`, `subscription-collect`, `content-signer`, `service-agent-wire` | Caveat sets that reach past sign-in |

A self-registered app gets `site-login` and `org-create` — which is everything a relying app
actually needs. If you need one of the above, that is a conversation with the deployment operator,
not a form.

## What you get back

The page shows the values to paste into your app:

```
Issuer            https://www.impact-agent.me
Discovery         https://www.impact-agent.me/.well-known/openid-configuration
Authorization     https://www.impact-agent.me/
Token             https://www.impact-agent.me/token
JWKS              https://www.impact-agent.me/jwks
Flow              response_type=code · PKCE S256
Scopes            openid profile agent
```

## The issuer rule that catches everyone

A person with a claimed name signs in at **their own subdomain** — `nathan.impact-agent.me`, not
the apex. So the `iss` on the token you receive may not be the origin you sent them to.

Accept the apex **and** any single-label subdomain of the zone. Accept nothing else:

```ts
// packages/home-connect/src/origins.ts — this exact rule
isAllowedHomeOrigin('https://nathan.impact-agent.me', policy)  // true
isAllowedHomeOrigin('https://www.impact-agent.me', policy)     // true
isAllowedHomeOrigin('https://a.b.impact-agent.me', policy)     // false — nested
isAllowedHomeOrigin('http://impact-agent.me', policy)          // false — not https
```

Never widen this to make a login work. A wrong issuer is an attack, not a config nit.

## Verifying it took

```sh
curl "https://www.impact-agent.me/connect/client-info?client_id=YOUR_APP_ID"
```

```json
{ "ok": true, "client": { "client_id": "your-app", "name": "Your App",
  "redirect_uris": ["https://…/"], "delegate": "0x…" } }
```

A `404` means not registered — or registered under a different id. The endpoint is public and
non-enumerable: you must already know the id to ask about it.

## The worked example

`commons-app` is registered at the reference Home with these redirect URIs:

```
https://commons-production.richardpedersen3.workers.dev/    the deployed starter
http://localhost:8799/                                      wrangler dev
http://127.0.0.1:8799/                                      wrangler dev
```

Check it yourself — the lookup is public:

```sh
curl "https://www.impact-agent.me/connect/client-info?client_id=commons-app"
```

## For a deployment operator

Curated entries still live in `apps/demo-sso-next/src/whitelabel/config.ts` and always win over a
member registration — a member cannot shadow a curated `client_id`. Use one when the app needs a
privileged template, or when it must work before anyone opens the portal. `commons-app` is
registered that way so this starter runs against a fresh deployment.

## When it goes wrong

| Symptom | Cause |
| --- | --- |
| "Request blocked / Only start setup from a site you trust" | `redirect_uri` is not an exact match, or the `client_id` is unknown |
| `unknown client_id` from `/token` | Registered at a different Home than the one you are exchanging at |
| `redirect_uri not allowed for client` | Trailing slash, `www` vs apex, `http` vs `https`, or a port difference |
| Sign-in works, `/interactions/*` returns 401 | The token verified but expired — they are short-lived by design |

More in [troubleshooting.md](./troubleshooting.md).
