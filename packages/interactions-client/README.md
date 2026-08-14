# @starter/interactions-client

**Discussion topics, 1:1 messages, an organization's content library, and a person's inbox — none
of it stored by your app.**

Every record lands in the **owner's** encrypted vault, reachable only through a delegation they
signed and can revoke on-chain without telling you. That inversion is the product, not a constraint
to route around.

```ts
import { createInteractionsClient } from '@starter/interactions-client';

const interactions = createInteractionsClient({
  a2aBase: 'https://demo-a2a-production.richardpedersen3.workers.dev',
  // On Cloudflare, pass a service binding's fetch — a Worker cannot fetch a sibling
  // *.workers.dev URL on the same account (error 1042).
  fetch: env.A2A?.fetch.bind(env.A2A),
});

// ALWAYS first. A public read — no session needed.
const { granted } = await interactions.status(orgAddress);
if (!granted) return showCeremonyLink();   // a steward enables storage once, at their Home

const auth = { session: idToken, stewardship: org.stewardshipDelegation };

await interactions.createTopic(orgAddress, { title: 'Welcome' }, auth);
await interactions.postToTopic(orgAddress, { topicId, text: 'Hello' }, auth);
const topic = await interactions.readTopic(orgAddress, topicId, auth);
```

## The two credentials

| Field | Proves | Verified by |
| --- | --- | --- |
| `session` | **who** is asking | Signature against the Home's JWKS |
| `stewardship` | that person may act **for that organization** | ERC-1271 against the org + caveat shape + unrevoked on-chain |

`session` alone reaches the caller's own things. Anything touching an organization carries both, and
the gate checks them independently.

## Server-side only

`/interactions/*` is CSRF-exempt — the session travels in the body, not a cookie. That is exactly
why these calls belong on your server: a browser call would put a bearer credential within reach of
any script on the page, and the live worker is origin-locked anyway.

## What it wraps

| | |
| --- | --- |
| `status(principal)` | Public. `{ granted, current, deliveryGranted }` |
| `listTopics` `readTopic` `createTopic` `postToTopic` | Discussion |
| `listMembers` | The community directory |
| `messagingStatus` `sendMessage` | 1:1 messaging |
| `listLibrary` `readArtifact` `putArtifact` `deleteArtifact` | The org content library |
| `call(principal, op, payload)` | Anything else — see [the op reference](../../docs/interactions-api.md) |

## Three things that will surprise you

**Bodies arrive separately from envelopes.** An envelope carries a body *hash* and a vault pointer,
never the text. `readTopic` matches them by message id. A message whose body did not come back
renders empty — not with a guess.

**Name a recipient exactly one way.** `{ address }`, `{ agentName }`, or `{ conversationId }` —
alternatives the caller selects, never a chain the client walks. An app that tried an address, then
a name, then a conversation would eventually send to whoever answered.

**`putArtifact` writes two records, artifact first.** The artifact, then the org-wide catalog.
Catalog-first would leave a dangling entry a reader cannot open and an owner cannot explain.

## Refusals are typed, and most are ceremonies

```ts
import { InteractionsError, isCeremonyRequired } from '@starter/interactions-client';

try {
  await interactions.sendMessage(person, { to, text }, { session });
} catch (e) {
  if (isCeremonyRequired(e)) return showHomeLink(e.code);  // one signature, at their Home
  throw e;
}
```

| Code | Meaning | Who resolves it |
| --- | --- | --- |
| `storage_not_enabled` | Nobody has enabled this principal's vault storage | Owner or steward, at their Home |
| `messaging_not_approved` | Messaging not approved for this counterparty | The person, at their Home |
| `read_grant` | No grant, out of scope, or revoked | The person, at their Home |
| `owner_only` | An operation that belongs to the person alone | Nobody — by design |
| `not_authorized` | Not a member, steward, or participant | Join, or present the wire |
| `session_invalid` | Token expired or failed verification | Reconnect |

Never retry a ceremony. Never work around one. Your app cannot perform it — the credential lives at
their Home, and that is what makes the whole arrangement worth trusting.

## Types

`Topic`, `TopicMessage`, `LibraryArtifact`, `MessagingWireStatus`, `StorageStatus` and friends. The
canonical signed shapes (`ChannelV1`, `MessageEnvelopeV1`) are **re-exported** from
`@agenticprimitives/fabric/messaging` rather than restated — a second definition of a signed record
is a second definition that can disagree with the signature.
