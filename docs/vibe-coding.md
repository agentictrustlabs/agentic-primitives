# Building on this with Claude or Cursor

This substrate is unusually easy to build on with an AI assistant and unusually easy to get
*subtly wrong* with one. The reason is the same in both cases: it looks like a normal OAuth + REST
app, and it is not one. A model that has seen ten thousand OAuth apps will confidently produce the
patterns this stack exists to replace — bearer-as-authority, app-owned user data, fallback chains
— and every one of those will typecheck, look reasonable in review, and fail at a gate or, worse,
not fail at all.

So the job is less "explain the API" and more "prevent four specific instincts".

## The four instincts to override

Put these in your system prompt, your `CLAUDE.md`, or your Cursor rules. Verbatim is fine.

> 1. **A token is not authority.** The `id_token` proves *who*. Authority is a separate
>    on-chain delegation the person signed. Never gate a capability on a claim, a scope, or an
>    audience.
> 2. **Records belong to the owner, not the app.** Do not add a database, a table, or a KV
>    namespace to store user content. It goes in their vault, through the interactions client.
> 3. **No fallback chains.** One mechanism per path. If it has no answer, return empty or throw.
>    Never "try X, and if that fails try Y".
> 4. **A refusal is usually a missing ceremony.** `storage_not_enabled`, `messaging_not_approved`,
>    `read_grant_absent` mean a person must sign something at their Home. Render a link. Never
>    retry, never work around.

`AGENTS.md` and `CLAUDE.md` at the repo root already carry these, so an assistant working inside a
clone picks them up automatically.

## What to hand it, in order

1. [`docs/principles.md`](./principles.md) — the twelve rules, with the failure mode each prevents.
2. [`docs/architecture.md`](./architecture.md) — what the three live services are and who trusts whom.
3. [`docs/interactions-api.md`](./interactions-api.md) — the op reference, including which ops a
   third-party app **cannot** call and why.
4. `apps/commons/src/worker/index.ts` — a complete, working, ~450-line example of every pattern.

That last one does most of the work. Models are far better at "make this like that" than at
"follow this rule", and `commons` is deliberately written so that copying it produces correct code:
credentials server-side, no app database, typed refusals rendered as ceremonies, one mechanism per
path.

## Prompts that work

**Starting a feature**

> Read `docs/principles.md` and `apps/commons/src/worker/index.ts`. Add a "pinned posts" feature to
> the discussion view. Follow the existing patterns exactly: the record goes in the org's vault via
> `interactions.call`, the SPA never sees the id_token, and any refusal from the substrate is
> rendered with its ceremony link rather than as an error.

**Reviewing what it produced** — this catches more than anything else:

> Review this diff against `docs/principles.md`. For each of the twelve principles, say whether the
> diff upholds it, violates it, or is not applicable. Be specific about line numbers. Do not fix
> anything yet.

**When something is refused**

> The call returned `{"code":"storage_not_enabled"}`. Look up that code in
> `docs/interactions-api.md` and `docs/troubleshooting.md`, tell me what ceremony is missing and
> who can perform it. Do not add a retry or a fallback.

## Prompts that produce wrong code

These read as reasonable and are not:

| Prompt | What you get | Why it is wrong |
| --- | --- | --- |
| "Add a database for the posts" | D1/Postgres holding somebody else's content | Principle 5 — records live in the owner's vault |
| "Cache the user's token so calls are faster" | A token in KV or `localStorage` | Principle 10 — bearer credential, no revocation |
| "Handle the 409 gracefully" | A retry loop, or a silent skip | Principle 7 — it is a ceremony, not a transient |
| "Make it work without connecting an org" | Faked authority, or an app-owned org concept | Principle 4 — your app cannot mint an organization |
| "Check if the user is an admin" | A boolean on a session object | Principle 3 — authority is a delegation, checked per call |
| "Look up the user by their name" | A name-keyed store | Principle 1 — names are transferable |

If your assistant proposes one of these, the fix is usually a single sentence: *"No — that record
belongs in the owner's vault; use `interactions.putArtifact` and let the gate decide."*

## Cursor specifically

`.cursor/rules/agentic-primitives.mdc` is loaded automatically for every file in this repo. It is
a compressed form of the four instincts plus the op reference. Keep it short — a rule file that
grows past a screen stops being read, by people and by models alike.

## A note on what "vibe coding" can and cannot do here

It works well for the app layer: views, flows, copy, wiring new ops, shaping refusals into UI. That
is most of the work and it is genuinely fast.

It works badly for anything that touches authority. Delegation construction, caveat selection,
signature verification, custody — those are load-bearing cryptographic decisions where a plausible
answer is indistinguishable from a correct one until it is exploited. **Use the published packages
for all of it.** `@agenticprimitives/delegation` builds and hashes delegations; `connect-client`
runs the OIDC verification; the gates do the checking. If your assistant starts hand-rolling an
EIP-712 struct or a signature check, stop it and find the package that already does it.

The rule of thumb: if getting it wrong would be a *bug*, generate freely. If getting it wrong would
be a *breach*, use the package.

## Verifying the result

```sh
pnpm typecheck              # strict, no implicit any, no unchecked index access
pnpm check:endpoints        # are the live rails reachable and answering as documented?
pnpm check:packages         # does every published package still import cleanly?
```

`check:endpoints` is the one that catches drift an assistant cannot see: the live services are real
and they change. If it reports a route answering differently from what
[`live-endpoints.md`](./live-endpoints.md) says, believe the endpoint and fix the doc.
