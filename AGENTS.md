# Instructions for AI coding assistants

Binding for **every** assistant working in this repo — Claude Code, Cursor, Codex, anything else.
Cursor loads the same content from `.cursor/rules/`; Claude reads `CLAUDE.md`, which points here.

## Read before writing code

1. [`docs/principles.md`](docs/principles.md) — twelve rules, each enforced by a real gate.
2. `apps/commons/src/worker/index.ts` — a complete, working example of every pattern.

## The four instincts to override

This substrate looks like a normal OAuth + REST app and is not one. The patterns a model reaches
for by default are the exact ones it exists to replace. These four override them:

### 1. A token is not authority

The OIDC `id_token` proves **who**. It authorizes nothing. Authority is a separate on-chain
delegation the person or organization signed, verified by ERC-1271 + caveats + an on-chain
revocation check, on every call.

Never gate a capability on a claim, a scope string, or an audience. Never add a `role` or `isAdmin`
to a session object.

### 2. Records belong to the owner, not the app

Do not add a database, a table, a KV namespace, or a Durable Object to store user content. Topics,
posts, messages, and library artifacts go in the **owner's** vault via
`@starter/interactions-client`.

The app may hold derived, rebuildable state — caches, cursors, projections. The test: *if this
store were wiped, is the loss a rebuild or a bereavement?*

### 3. No fallback chains

One mechanism per read or auth path. If it has no answer it returns empty or throws. Never "try X,
and if that fails try Y". Bounded retries of the **same** call are fine; switching mechanism is not.

```ts
// Never:
const user = await cache.get(id) ?? await db.get(id) ?? await api.get(id);
// Never:
if (!await verifyOnChain(sig)) return verifyLocally(sig);
```

### 4. A refusal is usually a missing ceremony

`storage_not_enabled`, `messaging_not_approved`, `read_grant_absent`, `wire_absent` all mean a
person must sign something at their **Home**, with a credential that deliberately does not exist on
this origin. Render a link. Never retry, never work around, never fake success.

`owner_only` means you reached an operation that belongs to the person alone. Working as designed —
redesign the feature, do not route around the gate.

## Repo conventions

- TypeScript strict, ESM, Node ≥ 20. `noUncheckedIndexedAccess` is on.
- Privileged calls run **server-side**. The browser gets an `httpOnly` cookie it cannot read.
- No hostnames in `packages/*`. `apps/commons/src/worker/config.ts` is the one module that knows
  where anything lives.
- The address is the identity; names are facets. Resolve a name once, at the edge, then work in
  addresses.
- Use the published packages for anything touching authority — delegation construction, caveats,
  signature verification. Never hand-roll an EIP-712 struct or a signature check.

## Before you say it is done

```sh
pnpm typecheck
pnpm check:endpoints    # the live rails are real and they change
pnpm check:packages
```

If `check:endpoints` disagrees with `docs/live-endpoints.md`, **believe the endpoint** and fix the
doc.

## Do not

- Add a persistence layer for user content.
- Put a token in `localStorage`, a readable cookie, or a URL.
- Widen an issuer allowlist to make a sign-in work.
- Catch a substrate refusal and continue as if it succeeded.
- Write a comment asserting a property nothing enforces. That is worse than no comment, because it
  survives review.
