# Operating it yourself — the ladder

This kit is mostly for **building on** Agentic Primitives. Running it — your own Home and vault for your own
people, or a chain's shared services — is a different job with its own guides. The four scales, and what you do
at each:

| Scale | You are… | Guide |
| --- | --- | --- |
| **Substrate** | building an application, a behaviour or a service on the packages and contracts | [Five builds](builds.md) — builds 1–3 |
| **Estate** | standing up a Home, agent runtime, vault, edge and Home MCP for people whose keys stay with you | [What an estate is made of](estate-anatomy.md) → [new-estate runbook](https://github.com/agentictrustlabs/ap-home/blob/master/docs/runbooks/new-estate.md) (`ap-home`) |
| **Town** | the services every estate on one chain shares — naming, the public graph, registries, chain access, key custody | [new-town runbook](https://github.com/agentictrustlabs/ap-town/blob/master/operations/runbooks/new-town.md) · [publish an estate](https://github.com/agentictrustlabs/ap-town/blob/master/operations/runbooks/publish-an-estate.md) (`ap-town`) |
| **Federation** | letting an agent from one chain prove its standing on another, without authority crossing | designed, not yet runnable: [Chains and estates](https://agenticprimitives.dev/architecture/chains) |

What each scale *is*, as architecture: [Substrate, estate, town, federation](https://agenticprimitives.dev/architecture/scales).

**One rule runs through the ladder: a rung never asks the one below it for anything it should not hold.** An
estate takes packages, never a deployment. A town takes an estate's public facts — its Home, its edge, its name
roots, its heartbeat — never a key, a vault, a delegation or a session; if a step in publishing an estate needs
one of those from the town, the step is wrong. A federation takes evidence, never a mandate.

Each rung is also **one repository and one deployer**. Two deployers must never both believe they own a live
environment, which is why `ap-home` and `ap-town` each carry a `DEPLOYER.md` naming, per Worker, who deploys it.
