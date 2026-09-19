# The Ethereum contracts

Two chains ship in the published package. **Base Sepolia** (chain `84532`) is the public reference
testnet — anyone can read it, and `pnpm doctor:full` confirms every address still has runtime
code. The **estate chain** (chain `34348`) is a private chain behind a gated RPC where the mandate
path — `DigestBindingEnforcer` + `PaymentEnforcer` — runs live; its addresses are resolved from
the same artifact so a builder can name them, but this kit cannot reach the chain to verify them.

Addresses ship with the published package, so the values your app shows and the values the gates
read come from one artifact:

```ts
import deployments from '@agenticprimitives/contracts/deployments-json/base-sepolia';
// name → address, plus `chainId`, plus one nested map: `permissionlessSubregistries`.

import { getDeployments } from '@agenticprimitives/contracts/deployments';
const estate = getDeployments('faithchain');   // typed; 'base-sepolia' | 'faithchain' | …
```

Do not re-type them into a config file. That is how a redeploy makes your UI lie. This kit's
per-contract records live under [`contracts/deployments/`](../contracts/deployments/) and carry the
ABI path and its sha256 — see [release-binding.md](./release-binding.md).

## What your app actually touches

Almost nothing, directly — and that is the design. Authority decisions are made by the gates, which
read the chain on every call. Your app reads it only to **show** people what is true.

| Contract | What it answers | Where it matters to you |
| --- | --- | --- |
| `delegationManager` | `isRevoked(hash)` — is this delegation dead? | The hash to show a person when they ask "what does this app hold?" |
| `agentAccountFactory` | The counterfactual address for a set of custodians | Why an address exists before it is deployed |
| `agentNameRegistry` | Who claimed this name | Name → address, one direction |
| `agentNameUniversalResolver` | Resolution across the typed subregistries | `messaging.send` uses it for `recipientName` |
| `permissionlessSubregistries.*` | One subregistry per agent class: `me`, `org`, `team`, `svc`, `workspace`, `treasury`, `registry`, plus vertical roots | Why `alice.me` and `outreach.treasury` are checked against the on-chain agent type, and fail closed on mismatch |
| `universalSignatureValidator` | ERC-1271 / ERC-6492, including undeployed accounts | Why a fresh Smart Agent can sign before deployment |
| `agentRegistryBase` | The registry-kit base: anchor-bound entries, admission receipts, lifecycle | What a registry built from the kit is built *on* |
| `agenticGovernance` + `timelockController` | System pause and the timelocked governance path | Why a pause is a governance act with a delay, not a switch an operator flips |

## The delegation hash

The one on-chain value worth surfacing in your UI. It is the EIP-712 digest of a delegation, and it
is what a revoke names:

```ts
import { hashDelegation } from '@agenticprimitives/delegation';

const hash = hashDelegation(
  { ...wire, salt: BigInt(wire.salt) },   // the wire carries salt as a decimal string
  84532,
  deployments.delegationManager,
);
```

`apps/commons` shows this on its "Under the hood" tab, next to the organization it belongs to. An
app that holds authority over somebody's organization should be able to tell them exactly which
delegation that is and how to kill it. Revoking it stops the app at every gate that checks — not
just at yours — and takes nothing from any other app.

## The caveat enforcers

A delegation is not a blank cheque. Its caveats are separate contracts the gate consults, and their
presence *and shape* is part of what makes a wire valid. They also run **again at redemption**, in
the same transaction as the act — the one check no off-chain verifier can give you:

| Enforcer | Bounds |
| --- | --- |
| `timestampEnforcer` | The validity window |
| `allowedTargetsEnforcer` | Which addresses may be acted on |
| `allowedMethodsEnforcer` | Which methods / skill selectors |
| `valueEnforcer` | Maximum value (usually zero) |
| `callDataHashEnforcer` | Exact calldata |
| `quorumEnforcer` | Multi-party approval |
| `paymentEnforcer` | Payee, ceiling, single-use nonce — the payment half of a **mandate** |
| `digestBindingEnforcer` | Redeemable only for an action whose intent digest equals this value — the other half of a mandate. On the estate chain today; the ABI ships in every release |

Worth knowing because it explains a refusal you will otherwise find baffling: a **stewardship**
wire must carry a governance `allowedTargets` caveat and must **not** carry a vault-record-scope
caveat. A data-access grant has the opposite shape. So a member-access grant cannot be replayed as
stewardship — the gate rejects it on shape before it ever checks the signature.

### A mandate is a delegation with two more caveats

There is no `Mandate` type on chain. "Pay the caterer 400" becomes a typed intent, canonicalised
and hashed; the delegation that authorizes it carries a `digestBinding` caveat (only an action
matching *this* intent) and a `payment` caveat (this payee, at most 400, this nonce, once). A
retry that re-derives the same nonce reverts with `NonceReused`. A planner that changes the payee
fails at the enforcer. The delegation is the artefact; the mandate is a shape of it.

## Accounts, custody, and treasuries

`AgentAccount` is an ERC-7579 modular core. Custody governance — threshold, guardians, recovery,
credential rotation — is the installed `CustodyPolicy` executor module (16 actions, tiered quorums, a
24h default timelock on the sensitive tier). A person's or organization's account **authorizes**; a
treasury is a separate service agent chartered under it that **transacts**, and only under a
mandate the principal signed.

The consequence you care about: **credential rotation does not change the address, and does not
invalidate delegations already signed.** Someone who loses a passkey and recovers with a new one
keeps their identity, their organizations, and their grants. Your app should too — see
[principle 2](./principles.md#2-credentials-rotate-the-identity-does-not).

## Registries and the ontology on chain

`ontologyTermRegistry`, `shapeRegistry`, `relationshipTypeRegistry`, and `skillDefinitionRegistry`
carry the vocabulary the rest of the stack binds to by IRI: agent types, typed-name suffixes,
relationship kinds (`charteredUnder` says "never authority"), capability definitions. A capability
id means the same thing on the A2A card, in a registry entry, and on chain because it names one
definition here. `attestationRegistry`, `agreementRegistry`, `paymentReceiptRegistry`, and
`geoFeatureRegistry` are the evidence and claim registries the credential packages write to.

## Reading the chain from a Worker

`viem` over the public Base Sepolia RPC works. Two rules from upstream that are worth adopting:

1. **No `eth_getLogs` in product read paths.** Use `readContract` only. History comes from an
   indexer or from on-chain storage, never an inline log scan — it is slow, it is rate-limited, and
   it fails differently on every provider.
2. **Fail closed on an unreadable chain.** A gate that cannot check revocation refuses. If your app
   reads the chain to decide something, do the same; if it reads only to display, show "unknown"
   rather than "fine".

The public RPC also rate-limits batches; `scripts/doctor.mjs` chunks and paces its `eth_getCode`
sweep for that reason, and reports a rate-limited call as *unchecked*, never as *no code*.

## The full address list

Print it from the package rather than copying it:

```sh
node -e "console.table(require('@agenticprimitives/contracts/deployments-base-sepolia.json'))"
cat contracts/deployments/eip155-84532/base-sepolia-2026.09.0/index.json
```

`apps/commons` serves the same map at `/api/chain`, and every address on its "Under the hood" tab
links to Basescan. Independently checkable, which is the point.
