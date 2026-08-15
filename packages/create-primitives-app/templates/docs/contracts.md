# The Ethereum contracts

Base Sepolia, chain `84532`. Addresses ship with the published package, so the values your app
shows and the values the gates read come from one artifact:

```ts
import deployments from '@agenticprimitives/contracts/deployments-json/base-sepolia';
// A flat map of name → address, plus `chainId`.
```

Do not re-type them into a config file. That is how a redeploy makes your UI lie.

## What your app actually touches

Almost nothing, directly — and that is the design. Authority decisions are made by the gates, which
read the chain on every call. Your app reads it only to **show** people what is true.

| Contract | What it answers | Where it matters to you |
| --- | --- | --- |
| `delegationManager` | `isRevoked(hash)` — is this delegation dead? | The hash to show a person when they ask "what does this app hold?" |
| `agentAccountFactory` | The counterfactual address for a set of custodians | Why an address exists before it is deployed |
| `agentNameRegistry` | Who claimed this name | Name → address, one direction |
| `agentNameUniversalResolver` | Resolution across subregistries | `messaging.send` uses it for `recipientName` |
| `universalSignatureValidator` | ERC-1271 / ERC-6492, including undeployed accounts | Why a fresh Smart Agent can sign before deployment |

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
presence *and shape* is part of what makes a wire valid:

| Enforcer | Bounds |
| --- | --- |
| `timestampEnforcer` | The validity window |
| `allowedTargetsEnforcer` | Which addresses may be acted on |
| `allowedMethodsEnforcer` | Which methods / skill selectors |
| `valueEnforcer` | Maximum value (usually zero) |
| `paymentEnforcer` | Payment caps, for the payment templates |
| `quorumEnforcer` | Multi-party approval |

Worth knowing because it explains a refusal you will otherwise find baffling: a **stewardship**
wire must carry a governance `allowedTargets` caveat and must **not** carry a vault-record-scope
caveat. A data-access grant has the opposite shape. So a member-access grant cannot be replayed as
stewardship — the gate rejects it on shape before it ever checks the signature.

## Accounts, briefly

`AgentAccount` is an ERC-7579 modular core. Custody governance — threshold, guardians, recovery,
credential rotation — is an installed executor module. Session acceptance and spend limits are
currently inlined rather than modular, and the upstream docs say so rather than claiming otherwise.

The consequence you care about: **credential rotation does not change the address, and does not
invalidate delegations already signed.** Someone who loses a passkey and recovers with a new one
keeps their identity, their organizations, and their grants. Your app should too — see
[principle 2](./principles.md#2-credentials-rotate-the-identity-does-not).

## Reading the chain from a Worker

`viem` over the public Base Sepolia RPC works. Two rules from upstream that are worth adopting:

1. **No `eth_getLogs` in product read paths.** Use `readContract` only. History comes from an
   indexer or from on-chain storage, never an inline log scan — it is slow, it is rate-limited, and
   it fails differently on every provider.
2. **Fail closed on an unreadable chain.** A gate that cannot check revocation refuses. If your app
   reads the chain to decide something, do the same; if it reads only to display, show "unknown"
   rather than "fine".

## The full address list

Print it from the package rather than copying it:

```sh
node -e "console.table(require('@agenticprimitives/contracts/deployments-base-sepolia.json'))"
```

`apps/commons` serves the same map at `/api/chain`, and every address on its "Under the hood" tab
links to Basescan. Independently checkable, which is the point.
