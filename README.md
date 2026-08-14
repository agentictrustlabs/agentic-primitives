# Agentic Primitives — developer starter

**Build an app where you hold your users' identity, authority, and data — and none of it belongs to
you.**

This is a working monorepo for third-party developers building against the
[agenticprimitives](https://www.npmjs.com/org/agenticprimitives) substrate: 66 published npm
packages, Ethereum contracts on Base Sepolia, and three live services you can call right now
without deploying anything.

```sh
git clone https://github.com/agentictrustlabs/agentic-primitives.git && cd agentic-primitives
pnpm install
pnpm check:endpoints          # the live rails are real — this proves it in ~5s
```

## What is in here

| | |
| --- | --- |
| **[`apps/commons`](apps/commons)** | A complete community app — connect via your Home, message, discuss, keep a shared library. One Cloudflare Worker. **No database.** |
| **[`packages/home-connect`](packages/home-connect)** | The relying-app half of Connect: hand a person to their Home, get back a verified token |
| **[`packages/interactions-client`](packages/interactions-client)** | Typed client for topics, messages, an org library, and the inbox |
| **[`packages/catalog`](packages/catalog)** | Every published `@agenticprimitives/*` package, installed and import-checked |
| **[`docs/`](docs)** | The principles, the API, and how to point Claude or Cursor at this |

## The idea, in one screen

A normal app owns your account and your data. This one owns neither.

```ts
// Your app never sees a password, a passkey, or a private key.
// It sends the person to their Home, which runs the ceremony.
const start = await connect.startConnect({ agentName: 'nathan.impact' });

// It gets back a token that proves WHO — and authorizes nothing.
const { person, idToken, org } = await connect.completeConnect({ start, code, state });

// Authority is a separate artifact the person or organization SIGNED,
// verified on-chain at every gate, revocable without your cooperation.
await interactions.postToTopic(org.orgAgent, { topicId, text }, {
  session: idToken,                          // who
  stewardship: org.stewardshipDelegation,    // may they act as this organization
});

// The post lands in the ORGANIZATION's encrypted vault. Not yours.
// Delete this app tomorrow and nobody loses anything.
```

That inversion is the product, not a constraint to route around:

- A person who leaves your app **keeps their conversations**.
- A revoked grant **actually stops you**, everywhere, without your cooperation.
- You are **never the party holding somebody else's private data**.
- A leaked credential of yours yields something a person revokes in one transaction — never their
  identity.

## See it running

**<https://commons-production.richardpedersen3.workers.dev>** — the app in this repo, deployed.
Sign in with a Home, connect a community, post something. Then open **Under the hood** and look up
the delegation hash on Basescan: everything the app claims about its own authority is checkable
without trusting the app.

## Run the example

```sh
cp apps/commons/.dev.vars.example apps/commons/.dev.vars   # add a SESSION_SECRET
pnpm dev                                                   # http://localhost:8799
```

Sign in with your Home, connect a community, and open a topic. Everything you write lands in a
vault you do not control, reached through a delegation you signed.

To deploy your own — one Worker, no database, no queue, no KV:

```sh
cd apps/commons
wrangler secret put SESSION_SECRET --env production
# set REDIRECT_URI in wrangler.toml to YOUR deployed origin, then:
pnpm deploy
```

`wrangler deploy --env production` names the Worker `<name>-production`, so the origin carries that
suffix. Register it at your Home (**Manage → Your apps**) — about a minute:
[docs/register-your-app.md](docs/register-your-app.md).

Deploying to the **same Cloudflare account** as the rails? Keep the `[[env.production.services]]`
binding in `wrangler.toml` — Cloudflare forbids a Worker fetching a sibling `*.workers.dev` URL
(error 1042). A different account works over the public URL and needs nothing.

## Start reading here

1. **[The twelve principles](docs/principles.md)** — each one is a rule some gate enforces, with
   the failure mode it prevents. Read this before writing code.
2. **[How the pieces fit](docs/architecture.md)** — the three live services and who trusts whom.
3. **[The interactions rail](docs/interactions-api.md)** — the op reference, including what a
   third-party app *cannot* do and why.
4. **[Building with Claude or Cursor](docs/vibe-coding.md)** — the four instincts to override, and
   the prompts that produce wrong code.

Also: [live endpoints](docs/live-endpoints.md) · [contracts](docs/contracts.md) ·
[package catalog](docs/packages.md) · [registering your app](docs/register-your-app.md) ·
[troubleshooting](docs/troubleshooting.md)

## The three live services

| | |
| --- | --- |
| **Home** — `www.impact-agent.me` | Credential ceremonies, custody, OIDC. The only place a person's key is used. |
| **A2A** — `demo-a2a-production.…workers.dev` | The agent boundary: verifies tokens and delegations, serializes writes per principal. |
| **MCP** — `demo-mcp-production.…workers.dev` | The vault: encrypted, per-record delegation scope, replay-protected. |

Base Sepolia (`84532`) holds the answers every gate reads: is this delegation revoked, did this
organization really sign, who claimed this name.

## The one thing to get right

> **A token says WHO. A delegation says WHAT.**
>
> The `id_token` proves identity and authorizes nothing. Authority is a separate on-chain artifact
> the person signed, verified against the chain on every call. If you find yourself gating a
> capability on a claim, a scope, or an audience, stop — that is the OAuth-shaped thinking this
> substrate exists to replace.

## Status

The reference deployments are on a **testnet** and are not a product. Sessions are demo-grade by
design; production custody is the job of the KMS backends in `@agenticprimitives/key-custody`. The
packages are alpha across two release lines — pin exactly.

Learn the model here. Do not put real value through it.

## License

MIT. The `@agenticprimitives/*` packages carry their own licenses.
