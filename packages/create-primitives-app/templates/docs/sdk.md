# npm SDK

66 published libraries under [`@agenticprimitives`](https://www.npmjs.com/org/agenticprimitives).
You will not use most of them. A relying app starts with six, plus the two workspace wrappers this
kit ships.

Pin exactly. Two alpha lines run concurrently (`1.0.0-alpha.21` and `0.0.0-alpha.N`). The root
`package.json` `pnpm.overrides` is the known-good tree — copy it.

```sh
pnpm add @agenticprimitives/types @agenticprimitives/connect-client \
         @agenticprimitives/delegation @agenticprimitives/contracts \
         @agenticprimitives/home @agenticprimitives/fabric
```

Or scaffold and let the workspace wrappers pull them in: [create-app.md](./create-app.md).

## Start here

| Package | Import | What it is |
| --- | --- | --- |
| `types` | `@agenticprimitives/types` | `Address`, `Hex`, branded chain primitives |
| `connect-client` | `@agenticprimitives/connect-client` | PKCE, authorize URL, `/token`, ES256 verify |
| `delegation` | `@agenticprimitives/delegation` | Build, hash, verify EIP-712 delegations + caveats |
| `home` | `@agenticprimitives/home` | Home manifest schema, fail-closed validators |
| `fabric` | `@agenticprimitives/fabric` | Envelopes, topic boards, inbox projections |
| `contracts` | `@agenticprimitives/contracts/deployments-json/base-sepolia` | Addresses + ABIs as shipped data |

This kit wraps the first two for a relying app:

```ts
import { createHomeConnect } from '@starter/home-connect';
import { createInteractionsClient } from '@starter/interactions-client';
```

`home-connect` is Connect + issuer allowlist + org payload. `interactions-client` is the typed
A2A rail. Use those unless you are writing a Home or a gate.

## Contracts from npm

```ts
import deployments from '@agenticprimitives/contracts/deployments-json/base-sepolia';
import { hashDelegation } from '@agenticprimitives/delegation';

const hash = hashDelegation(
  { ...wire, salt: BigInt(wire.salt) },
  84532,
  deployments.delegationManager,
);
```

`@agenticprimitives/contracts` has **no default entry**. Subpaths only (`/deployments-json/base-sepolia`,
`/abi`). That is deliberate. Do not re-type addresses into a config file — a redeploy then makes
your UI lie. Full map: [contracts.md](./contracts.md).

## Authority — never hand-roll

```ts
import { hashDelegation } from '@agenticprimitives/delegation';
```

If an assistant starts writing an EIP-712 struct or a `ecrecover`, stop it. The published package
is the only implementation the gates agree with. Getting this wrong typechecks and is a breach.

## Identity

```ts
import type { Address } from '@agenticprimitives/types';

// Right — the address is the key.
const topics = await listTopics(person as Address);

// Wrong — a name is a lookup, not an identifier.
const topics = await listTopics('grace.impact');
```

Resolve a name once, at the edge, then work in addresses. Names transfer.

## What a third-party app does not import

| Package | Why not |
| --- | --- |
| `connect` | Home/broker side — you are the relying party |
| `key-custody` | Production KMS. You are a delegate, not a custodian |
| `mcp-runtime` | The vault gate. You reach the vault through A2A |
| `agent-account` execute paths | The Home deploys and signs for the person |

The full catalog, with the one-way dependency rule: [packages.md](./packages.md).
`pnpm check:packages` imports every entry point for real.

## Versioning

Alpha. Pin the name **and** the transitive tree:

```json
"pnpm": {
  "overrides": {
    "@agenticprimitives/delegation": "1.0.0-alpha.21",
    "@agenticprimitives/connect-client": "1.0.0-alpha.10"
  }
}
```

Floating `^` across the two release lines is how you get a type error that names the wrong package.
