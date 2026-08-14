# The interactions rail

One endpoint shape, one credential pair, ~40 operations.

```
POST {A2A_BASE}/interactions/{principal}/{op}
Content-Type: application/json

{ "session": "<id_token>", "stewardship": <delegation wire>, ...args }
```

`{principal}` is a Smart Agent address — a person or an organization — and it selects the
serialized writer for that principal, so it is load-bearing rather than decoration.

`@starter/interactions-client` wraps the common ops with types; `client.call(principal, op, body)`
reaches anything it does not.

## The two credentials

| Field | What it is | What it proves |
| --- | --- | --- |
| `session` | the person's Home-issued `id_token` | **who** is asking |
| `stewardship` | an org→person delegation wire | that person may act **for that organization** |

`session` alone reaches things that are the caller's own. Anything touching an organization carries
both. See [principles.md](./principles.md#3-a-token-says-who-a-delegation-says-what).

CSRF does not apply here — the session travels in the body, not a cookie. That is precisely why
these calls belong on your **server** and not in a browser: a browser call would put a bearer
credential within reach of any script on the page.

---

## Before anything else: `status`

```http
POST /interactions/{principal}/status      → { granted, current, deliveryGranted }
```

A **public** read. No session. Ask it before rendering any surface that depends on storage.

`granted: false` is the most common first-run state and has exactly one resolution: the owner or a
steward enables storage once at their Home. There is no app-side workaround, and building one is
not possible — the grant is a delegation the owner signs.

`current: false` means a grant exists but its scope was widened upstream; the owner re-enables.

---

## Discussion — an organization's topics

Principal: the **organization**. Caller must be a member (has published a directory listing) or a
steward (presents the wire).

| Op | Body | Returns |
| --- | --- | --- |
| `channels.list` | — | `{ channels: [descriptors], you, steward }` |
| `channels.read` | `{ channelId }` | `{ channels: [one, with messages], bodies }` |
| `channels.create` | `{ title, participationPolicy }` | `{ channelId }` |
| `channels.post` | `{ channelId, bodyText }` | `{ messageId }` |
| `channels.participants` | `{ channelId }` | participation rows |
| `channels.invite` | `{ channelId, personSA, role }` | — |
| `channels.acceptInvite` | `{ channelId }` | — |
| `channels.revokeParticipant` | `{ channelId, personSA }` | — |

**`participationPolicy`**: `open` means every org member participates (derived from membership — no
stored list). `restricted` means invite-only, and only a **steward** may create one: standing up an
invite-only space is a facilitator act, so it takes the organization's own proof.

**Bodies arrive separately.** An envelope carries a body *hash* and a vault pointer, never the
text. `channels.read` returns `bodies` keyed by message id. A message whose body did not come back
should render empty — not with a guess.

```ts
const topic = await interactions.readTopic(org, topicId, { session, stewardship });
```

## Community directory — who is here

| Op | Body | Returns |
| --- | --- | --- |
| `directory.list` | — | `{ listings: [{ listing, … }] }` |
| `directory.publish` | `{ listing }` | — |
| `directory.revoke` | `{ subject }` | — |

Each row re-verifies at the gate against the subject's own signature. Presence in the index is
never trust — the index itself is writable under the execution grant.

`directory.publish` needs a listing the subject **signed**, which takes their credential. In
practice a relying app links people to their Home for this, or works through the steward path.

## 1:1 messaging

Principal: the **person** (their own rail). An organization's rail is driven by a steward with the
wire, because a member-access grant is not authority to speak *as* the organization.

| Op | Body | Returns |
| --- | --- | --- |
| `messaging.wireStatus` | — | `{ sessionKey, wirePresent, recipients[] }` |
| `messaging.send` | `{ recipient \| recipientName \| conversationId, bodyText, subject?, contextRefs? }` | `{ messageId, conversationId }` |

**Name the recipient exactly one way.** Three alternatives, caller-selected — never a chain the
client walks. An app that tried an address, then a name, then a conversation would eventually send
to whoever answered.

`recipientName` resolves on-chain through the name registry. `conversationId` alone is the reply
case and resolves from the **owner's own** descriptor, never from anything the counterparty sent —
which is why a reply cannot be redirected by the other party.

**`wire_absent` (409)** means the person has not approved their agent to message this counterparty.
The refusal names the recipient so the approval is one click. It is one prompt per new contact, at
their Home, and your app cannot perform it — their credential does not live on your origin.

Reading the inbox is a **Home** call, not an interactions op:

```http
GET {home}/connect/inbox?preview=1
Authorization: Bearer <id_token>
```

## Content library — an organization's artifacts

Principal: the **organization**. Steward-gated (or a scoped data grant covering the exact record).

| Op | Body | Returns |
| --- | --- | --- |
| `content.get` | `{ resource: "content.catalog" }` | `{ record: LibraryArtifact[] }` |
| `content.get` | `{ resource: "content.artifact.<id>" }` | `{ record }` |
| `content.put` | `{ resource, data }` | — |
| `content.put` | `{ resource: "content.artifact.<id>", data: null }` | delete |
| `content.shared` | `{ artifactId }` | `{ artifact }` or `{ artifact: null }` |

Two records per artifact: the artifact itself, and an entry in the org-wide `content.catalog`
index. **Write the artifact first.** Catalog-first would leave a dangling entry a reader cannot
open and an owner cannot explain.

`data: null` **is** the delete — the gate reads it as one and checks the caller for `delete`, so a
grant that says `write` cannot erase records.

`content.shared` is worth studying as a design pattern. A reader asks the owner's agent for **one**
artifact; the owner's agent evaluates its own grants and returns that artifact or nothing. The
catalog never leaves. Absent and not-shared answer identically, so a reader cannot enumerate what
an owner holds by reading the difference in refusals.

## The person's own records

| Op | Body | Notes |
| --- | --- | --- |
| `record.get` | `{ recordType }` | Needs a per-app **read grant** scoped to that record |
| `inbox.get` | `{ sinceRev? }` | Needs a read grant covering `vault:inbox.data` |
| `inbox.body.get` | `{ resource }` | `dm:` namespace only |

A relying app reads under **its own** grant, not the person's broad one. That is what makes "revoke
this app" a real, on-chain, app-specific act instead of a registry edit.

**How the person issues one:** at their Home, under **Manage → Connected**, they enter your app's
`client_id` and pick a record family. The grant is read-only by construction (`ops: ['read']`),
scoped to that family, never `vault:*`, and time-bounded. Signing in does not imply it, and asking
for it is a second, separate yes — which is exactly what stops "connect this app" from being one
coarse decision.

The same applies to the Home's `GET /connect/inbox`: a relying token reaches it, but the read runs
under your app's grant, so without one it answers `read_grant_absent`.

---

## What a third-party app cannot do, and why

These refuse for a **relying** caller — one authenticated as the person by an `id_token` — no
matter how the request is shaped. Design around them rather than for them.

| Op | Code | Why |
| --- | --- | --- |
| `record.put` | `read_grant_read_only` | A read grant is read-only by construction |
| `record.list` | `read_grant_no_enumerate` | Listing every record type defeats scoping |
| `readgrant.*` | `owner_only` | An app administering the mechanism that bounds apps |
| `relationships.*` | `owner_only` | Person↔org links are private vault credentials |
| `inbox.assistant*` | `owner_only` | Rewriting what someone's agent says is authorship |
| `member.profile.put`, `membership.put` | `owner_only` | Identity and membership writes |
| `grants.list` | `owner_only` | Enumerating a person's authority surface |
| `internal.*` | 403 | In-Worker only; never routable |

The pattern: an app **authenticates as** a person; it is not them. Ops that configure their agent
or write their private records stay theirs. Ops an app legitimately drives — `channels.*`,
`directory.*`, `content.*` — are gated by a delegation instead, and are deliberately open.

## Refusals, and what each one means

| HTTP | Code / text | Meaning | Resolution |
| --- | --- | --- | --- |
| 401 | `invalid session` | Token expired or failed verification | Reconnect |
| 403 | `owner_only` | The person's own operation | None — by design |
| 403 | `read_grant_scope` | Grant does not cover this record | The person authorizes, at their Home |
| 403 | — | Not a member / not a steward / not a participant | Join, or present the wire |
| 404 | — | No such topic, artifact, or conversation | — |
| 409 | `no interactions grant` | Storage never enabled for this principal | Owner or steward, at their Home |
| 409 | `interactions grant is stale` | Scope widened; grant needs re-signing | Steward re-enables |
| 409 | `wire_absent` | Messaging not approved for this contact | The person, at their Home |
| 503 | — | Chain read unavailable — refused fail-closed | Retry the same call |

Fail-closed everywhere. A gate that cannot verify refuses; it never assumes.

## Ops this client does not wrap

Real and reachable through `client.call`, documented upstream:

- **Coordination** — `endeavor.request`, `proposePlan`, `adoptPlan`, `satisfyStep`, `satisfy`, `post`
- **Org assistants** — `channels.assistantEnable`, `channels.assistantSkill.put`, `consult.routing*`
- **Admission** — `org.apply`, `applications.mine`, `invite.claim`
- **Per-app grants** — `readgrant.put`, `readgrant.list`, `readgrant.revoke` *(owner-only)*
- **Auto-work** — `autowork.get`, `autowork.enable`, `autowork.disable`
