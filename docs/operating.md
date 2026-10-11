# Operating it yourself — the ladder

This kit is for **building on** Agentic Primitives: a relying app of a Home, a service agent, a connector. Running
the substrate for a population of your own — your own Home and vault for your own people, or a town's shared
services on your own chain — is a different job, and it has a guide per scale, kept in the repository that owns
that scale:

| Scale | You are… | Guide |
| --- | --- | --- |
| **Substrate** | building an application on the packages and contracts | this kit: [Getting started](getting-started.md) · [Register at a Home](register-your-app.md) · [`create-app`](create-app.md) |
| **Estate** | standing up a Home, agent runtime, vault, edge and Home MCP for people whose keys stay with you | [What an estate is made of](https://github.com/agentictrustlabs/agenticprimitives/blob/master/docs/operators/estate.md) → [New estate runbook](https://github.com/agentictrustlabs/ap-home/blob/master/docs/runbooks/new-estate.md) (`ap-home`) |
| **Town** | publishing an estate into the services every estate on that chain shares — names, the public graph, registries, chain access, key custody | [Publish an estate](https://github.com/agentictrustlabs/ap-town/blob/master/operations/runbooks/publish-an-estate.md) (`ap-town`) |
| **Federation** | letting an agent from one chain prove its standing on another, without authority crossing | designed, not yet runnable: [Chains and estates](https://agenticprimitives.dev/architecture/chains) |

The index of record is [`docs/operators/README.md`](https://github.com/agentictrustlabs/agenticprimitives/blob/master/docs/operators/README.md)
in the substrate repository, mirrored at [agenticprimitives.dev/architecture/operating](https://agenticprimitives.dev/architecture/operating).
The scales themselves — what each IS — are [Substrate, estate, town, federation](https://agenticprimitives.dev/architecture/scales).

One rule runs through the ladder: a rung never asks the one below it for anything it should not hold. An estate
takes packages, never a deployment; a town takes an estate's public facts, never a key, a vault, a delegation or a
session; a federation takes evidence, never a mandate.
