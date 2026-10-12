# What an estate is made of

**Build 4 of [five](builds.md).** Written from the second estate stood up on a live chain. The commands are in the
[new-estate runbook](https://github.com/agentictrustlabs/ap-home/blob/master/docs/runbooks/new-estate.md) in `ap-home`;
this note is the part that is true of ANY estate built on the substrate, whichever product deploys it. Read it first —
it says why each step of that runbook exists.

An estate is one deployment of the substrate for one population: the people, organizations and services whose
custody ceremonies happen at its Home and whose records live in its vault. Two estates on one chain share the chain,
the contracts and the town's services, and share **nothing else**. That sentence is the whole design; everything
below is what it costs to keep it true.

## 1. The parts, and what each one is made of

| Part | Made of (substrate) | Owned by the estate | Shared with the town |
| --- | --- | --- | --- |
| **Custody root** | a seed; a KMS-custodied person's custodian is derived from it, and their Smart Agent is a CREATE2 address over that custodian ([`key-custody`](https://www.npmjs.com/package/@agenticprimitives/key-custody), [`agent-account`](https://www.npmjs.com/package/@agenticprimitives/agent-account)) | yes — this is WHY an estate's people are different agents from a sibling's people of the same name | the `AgentAccountFactory` and `CustodyPolicy` code on chain |
| **Relay key** | the EOA that sends the estate's userOps | yes | the chain's EntryPoint, the paymaster policy |
| **Interactions key + two service agents** | a delegate key named inside every principal-signed session leaf, and two Smart Agents custodied by it (salt 0: `INTERACTIONS_SERVICE_SA`, what grants name; salt 1: `HARNESS_AGENT_SA`, what the agent acts as under a mandate) | yes — and NEVER the relay key: sharing it would make the relayer a delegate of every grant | the `DelegationManager` and enforcers that verify the wires |
| **Vault** | per-owner records in encrypted envelopes under a per-owner KEK ([`mcp-runtime`](https://www.npmjs.com/package/@agenticprimitives/mcp-runtime)); the KEK lives in a KMS **tenant** | yes — its own database, its own vault id, its own tenant | the KMS service itself |
| **Edge** | admission in front of the runtime ([`admission`](https://www.npmjs.com/package/@agenticprimitives/admission)) | yes | nothing |
| **Home** | where people sign: OIDC issuer, session cookie, deployment epoch, the client registry of relying apps, the demo roster | yes | nothing |
| **Names** | typed, paid names on the chain's registries ([`agent-naming`](https://www.npmjs.com/package/@agenticprimitives/agent-naming)); the estate's Home signs claim tickets with its own **gate** key | the gate; which roots it serves | the registries, the prices, the domain rule — chain-wide |
| **Service MACs / secrets** | the A2A→vault MAC, gateway assertion, custody bridge — each shared by exactly the Workers that must agree | yes | nothing |

The test for any item not in this table: *if the town were wiped, would the estate still enforce?* It must. *If the
estate were wiped, would the town have to be told?* Only to delete a row.

## 2. The invariants (what a second estate proved)

1. **A KMS tenant is an estate boundary.** The tenant is a derivation root — MAC keys and the custody seed derive
   from it — so two estates in one tenant are one estate with two front doors. A second DEPLOYMENT of an estate, or a
   service WITHIN it, shares its tenant; a second estate never does.
2. **Caller allowlists are exact.** A caller bound to a tenant is allowed operations, key purposes, MAC audiences
   and protection levels by exact string or `*`. A vault needs `data-key-generate`, `data-key-unwrap`,
   `mac-generate` and `key-create`; purposes `*` (every person's KEK is its own purpose); the audience the Workers
   actually send. A runtime that signs its own relay needs `mac-generate` only. Bind for derived (CVM) protection
   levels only — an HSM-direct key is a billable object, and leaving the level off the caller is what makes a
   billable key impossible rather than discouraged.
3. **A local KEK is a `wrangler dev` path and nothing else.** Bundlers constant-fold `NODE_ENV === 'production'`,
   so the dev-only guard refuses in every deployed Worker. A deployed estate has a KMS tenant or it has no vault.
4. **The custody root never moves.** Rotating it orphans every home it custodies. Put the vault and the MACs on
   KMS; leave the root where the people were made.
5. **Names are chain-wide; gates are per Home.** The town's naming agent allows each Home's gate on the priced
   roots; revoking one Home's gate touches no other. A purchase is TWO signed operations — claim and pay from the
   treasury, then present from the owner — and a client interrupted between them leaves a registered,
   unpresented name that must be finished from the owner's account.
6. **A sign-in store is per estate.** The login-facet index maps a credential to the agent it opens; two estates
   are two populations, so one shared, unprefixed store opens the WRONG Home. Check the store is empty before
   attaching it.
7. **Demo people are an estate's own.** A demo person is a real Smart Agent custodied by a seeded key; the roster is
   the Home's secret, merged never replaced, and a person's agent is never also their organization's.
8. **Secrets are files, 0600, gitignored, single-quoted.** A shell-sourced env file strips quotes from a JSON value;
   a JWK shipped as `{kty:EC}` fails with an empty-bodied 500 that looks like a downstream fault.
9. **Worker names, Durable Object class names, bindings and migration tags are never renamed.** They are storage.
10. **Nothing in the Home is estate-neutral by accident.** Every `NEXT_PUBLIC_*` default that names a host, a client
    id, a relying app or a registry is the FIRST estate's value. A second estate must set each one or discover it
    the hard way (imbnet: signing out walked faithnet's relying-app logout list and landed on a foreign app).

## 3. The lessons, in the order a second estate meets them

Each of these was a silent failure before it was a named one. The runbook has the fix for each; this is the shape.

| You see | It means | Not |
| --- | --- | --- |
| `interactions_not_enabled` / `vault_key_unauthorized` on every record read, nothing in the console naming KMS | the runtime's MAC to the vault is being refused by the KMS caller binding (audience or purpose not allowed) | the interactions grant, the vault key, the session |
| `501` naming a cloud KMS credential the org never used | no KMS backend is configured for this deployment | "add that credential" |
| `issued_at_required` on vault-key provision | the client did not sign the owner-control proof; provisioning mints a real key and is gated on it | the vault being down |
| a 400/500 with an empty body right after secrets were set | a secret was malformed by shell quoting or a wrong format (hex where JSON was expected, or the reverse) | the service behind it |
| the town reads the new estate as "gone" though its health answers | a Worker cannot fetch a same-account `workers.dev` host; the town must declare the host as a lane and bind it | the estate |
| the new estate reports the FIRST estate's census or heartbeat | an estate id or registry origin defaulted to the first estate's | a shared registry bug |
| a domain-rule refusal on a name that is "obviously free" | `<label>.com` or `.org` exists; the gate asks for a verified email there | a naming outage |
| sign-out lands on an app you never used | the Home's front-channel logout list is the first estate's | that app |

## 4. What an estate must not be asked for, and must not ask for

- It must not ask the town for a key, a vault, a delegation or a session (a town grants nothing).
- It must not be asked by a relying app to prove membership as authority — being a member is not permission to act;
  the effect must be inside the acting principal's live delegation.
- It must not hold another estate's people. The day it does, the custody root is shared and there is one estate.

## Sources

[The four scales](https://agenticprimitives.dev/architecture/scales) · [The estate and the federation](https://agenticprimitives.dev/architecture/estate) ·
[Chains and estates](https://agenticprimitives.dev/architecture/chains) · the
[new-estate runbook](https://github.com/agentictrustlabs/ap-home/blob/master/docs/runbooks/new-estate.md) (`ap-home`) ·
the town's half, [publish an estate](https://github.com/agentictrustlabs/ap-town/blob/master/operations/runbooks/publish-an-estate.md) (`ap-town`).
