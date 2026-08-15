# The twelve principles

These are extracted from the substrate's own architecture decisions. They are not style
preferences — each one is a rule some gate actually enforces, and an app that ignores it will
either be refused at runtime or will quietly become the thing the substrate exists to prevent.

If you read only one thing before building, read this. If you are pointing Claude or Cursor at
this repo — or at a project from `create-primitives-app` — this is the file to put in front of it.
See [vibe-coding.md](./vibe-coding.md) and [getting-started.md](./getting-started.md).

---

## 1. The address is the identity. The name is a facet.

Every person, organization, and service **is** an ERC-4337 Smart Agent address. Names, profiles,
avatars, handles, registry entries — all of them are facets that point *at* that address.

```ts
// Right: the address is the key.
const topics = await listTopics('0x1a2b…');

// Wrong: a name is a lookup, not an identifier.
const topics = await listTopics('grace.impact');
```

**Why it bites you:** names are claimed, transferred, and released. An app that keys its data by
name will silently reattach one person's records to another. Cross-package APIs take addresses for
exactly this reason.

Resolve names at the edge — the moment a person types one — then work in addresses.

## 2. Credentials rotate. The identity does not.

A passkey is not the person. Nor is a wallet, a Google account, or a phone number. They are
*control credentials* — replaceable facets — and swapping one never changes the Smart Agent
address.

**What this means for your app:** never store "the user's wallet" as their identity, never key a
session on a credential, and never invalidate someone's data because they re-onboarded with a new
passkey. The delegations they signed remain valid across credential recovery, and so should your
records.

## 3. A token says WHO. A delegation says WHAT.

This is the single most important distinction in the stack, and the easiest one to blur.

| Artifact | Answers | Verified how |
| --- | --- | --- |
| OIDC `id_token` | Who is this? | Signature against the Home's JWKS |
| Delegation | May they do this? | ERC-1271 against the signer + caveats + unrevoked on-chain |

An `id_token` authorizes **nothing**. It is an envelope. Every gate downstream re-derives what the
caller may do from a delegation *the person or organization signed*, checked against the chain, on
every call — not from a claim, a scope string, or an audience.

**The failure mode this prevents:** OAuth-shaped thinking, where `scope: "vault:read"` becomes the
authority and a leaked bearer becomes total access. Here a leaked token gets you identity and
nothing else; the authority is a separate artifact with its own signature and its own revocation.

> Corollary: never encode field-level access in scopes. `vault:read` is not "decrypt all PII".

## 4. Your app is a delegate, never a custodian.

The account your app holds is a *delegate* — an address a person scoped a grant to. It is never a
custodian of their identity.

Compromising your delegate yields something the person revokes on-chain in one transaction.
Compromising a custodian would yield their identity. Build so that the worst case is the first
one:

- Never accept, transport, or store a person's private key. Not once, not "temporarily".
- Generate your own session keypair locally and send only the public half.
- Assume your delegate *will* be compromised and check that the blast radius is a revoke.

## 5. Records live in the owner's vault, not your database.

Topics, posts, messages, library artifacts — every durable record in this stack lands in the
**owner's** encrypted vault, reachable only through a delegation they signed.

This inverts the normal app-building instinct, and it is the product:

- A person who leaves your app keeps their conversations.
- A revoked grant actually stops you, everywhere, without your cooperation.
- You are never the party holding somebody else's private data.

Your app may hold **derived, rebuildable** state — caches, cursors, indexes, projections. The test:
*if this store were wiped, is the loss a rebuild or a bereavement?* A rebuild is fine. A
bereavement means it belonged in the vault.

## 6. No silent fallbacks. One mechanism per path.

A read or auth path has exactly **one** mechanism. If it has no answer, it returns empty or throws.
It does not escalate to a second, different, more expensive one.

```ts
// Wrong — three mechanisms wearing one function.
let user = await cache.get(id) ?? await db.get(id) ?? await api.get(id);

// Wrong — "try the strong check, fall back to the weak one".
if (!await verifyOnChain(sig)) return verifyLocally(sig);

// Right — the caller SELECTS, and the selection either answers or fails.
const to = body.address ? { address: body.address }
         : body.agentName ? { agentName: body.agentName }
         : null;
if (!to) throw new Error('name the recipient');
```

Empty is an answer, not a trigger. Bounded retries of the *same* call are fine. Cache-first reads
are fine when the cache holds the canonical answer. Switching mechanism because the first one said
no is not — that is how a message ends up delivered to whoever happened to resolve.

## 7. Fail closed, and say which ceremony is missing.

Most refusals from this substrate are not errors. They are a **ceremony that has not happened yet**
— one signature, at the person's Home, with a credential that deliberately does not exist on your
origin.

| Refusal | What it means | Who fixes it |
| --- | --- | --- |
| `storage_not_enabled` | Nobody has enabled this principal's vault storage | The owner or a steward, at their Home |
| `messaging_not_approved` | The person hasn't approved their agent to message this contact | The person, at their Home |
| `read_grant_absent` | Your app has no scoped read grant for this record | The person, at their Home |
| `owner_only` | You reached an op that belongs to the person alone | Nobody — working as designed |

Render these as what they are, with a link. An app that shows "Error 409" for a two-click fix has
turned a working system into a mystery. An app that retries has turned it into a loop.

## 8. Authenticating AS a person is not BEING them.

Your app holds the person's token. That makes you *authenticated as* them. It does not make you
them, and the substrate draws that line explicitly: some operations are the owner's own.

Reading their mail under a grant they issued: yes. Enumerating every record type they hold,
rewriting their agent's instructions, or administering which *other* apps may read them: no.

Design for it. If your feature needs an op behind `owner_only`, the feature is asking the person
to hand over more than they should, and the answer is to link them to their Home rather than to
route around the gate.

## 9. Generic code holds no hostnames.

Reusable code — anything you would publish or share — contains no hostnames, no branding, no
vertical vocabulary, and no deployment specifics. Those are injected by the app.

```ts
// Wrong, inside a package:
const HOME = 'https://www.impact-agent.me';

// Right — the app supplies it:
createHomeConnect({ homeOrigin: env.HOME_ORIGIN, homeZone: env.HOME_ZONE, … })
```

In this repo, `packages/*` obey it and `apps/commons/src/worker/config.ts` is the one module that
knows where anything lives. Copy that shape: it is what makes an app white-labelable without a
rewrite, and it is why swapping deployments is a config change.

## 10. The browser holds no credential.

Run the OIDC exchange and every privileged call **server-side**. The browser gets an `httpOnly`
cookie it cannot read.

Two independent reasons, both real:

1. An `id_token` is a bearer credential with no revocation. In `localStorage` it is one XSS away
   from being somebody else's.
2. The live rails are origin-locked. A cross-origin browser call fails *and* leaks.

`apps/commons` does this end to end: the SPA's only API is its own `/api/*`, and no
`@agenticprimitives/*` package that touches authority is bundled into the client.

## 11. Say what is true, including the parts that are not done.

The reference apps are unusually blunt about their own limits — `update_profile` is a stub and its
README says so; a package's status line says `w1-contracts` rather than "ready".

Do the same. A comment asserting a property nothing enforces is worse than no comment, because it
survives review. If your app cannot run a ceremony, say so and point at who can, rather than
offering a button that fails.

## 12. Ask for an outcome, not a call sequence.

The direction of travel for this stack is that a UI expresses an **intent** — "publish this to the
community", "message the steward" — to an agent that plans, assembles the authority, and composes
the tool calls. It is not a browser driving a tool API with extra steps.

Today's surface is still verb-shaped in places (this starter included, and it says so). Build new
surfaces intent-first where you can, and keep the direct calls behind a seam you can replace.

---

## The shortest version

> The address is the identity. The token says who; the delegation says what. Your app is a
> delegate, its data is somebody else's, and every refusal is either a ceremony or a boundary —
> never a reason to try a different way in.

## Where each principle is enforced

| # | Enforced by | Read more |
| --- | --- | --- |
| 1, 2 | `agent-account`, `agent-naming`, every `Address`-typed API | ADR-0010, ADR-0011 |
| 3, 4 | `delegation`, every A2A/MCP gate, ERC-1271 on-chain | ADR-0019, ADR-0041 |
| 5 | the MCP vault + per-record delegation scope | ADR-0055 |
| 6 | code review, and the shape of every client in this repo | ADR-0013 |
| 7, 8 | the interactions gate's typed refusals | spec 341 |
| 9 | `check:no-domain-in-packages` in the upstream repo | ADR-0021 |
| 10 | your app — nothing stops you getting this wrong | — |
| 11 | culture | — |
| 12 | `check:no-direct-mcp-in-web` upstream | ADR-0044 |
