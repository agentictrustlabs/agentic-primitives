# Five builds — pick the one you are doing

Agentic Primitives is one substrate at four scales ([the architecture](https://agenticprimitives.dev/architecture/scales)).
What you *build* on it falls into five shapes. They are ordered by how much of the stack you run yourself: the first
needs nothing but an app and somebody else's Home; the last needs a chain.

Each row names one guide. Follow that guide; ignore the other four.

| # | You are building | You run | Start here |
| --- | --- | --- | --- |
| **1** | **An application** — a web app, a CLI, an assistant client that acts for a person who already has a Home | your app | [Getting started](getting-started.md) → [Register at a Home](register-your-app.md) |
| **2** | **A behaviour** — what a person's, organization's or service's agent knows how to do: skills, playbooks, a domain's vocabulary | nothing; you author documents | [Authoring skills](authoring-skills.md) |
| **3** | **A service agent** — a real A2A service other people's agents engage, with its own account, name, card, skills and records | one Worker (or nothing at all) | [Build a service agent](build-a-service-agent.md) |
| **4** | **An estate** — a Home, agent runtime, vault and edge for a population of your own, on a chain that already has a town | five Workers + a Home | [What an estate is made of](estate-anatomy.md) → [new-estate runbook](https://github.com/agentictrustlabs/ap-home/blob/master/docs/runbooks/new-estate.md) |
| **5** | **A town** — the shared services for every estate on a chain: naming, the public graph, the registry, chain access | a chain and its services | [new-town runbook](https://github.com/agentictrustlabs/ap-town/blob/master/operations/runbooks/new-town.md) |

## How to tell which one you are doing

Answer these in order; the first "yes" is your build.

1. **Do the people using this already have an agent somewhere?** → Build 1. You are a *relying app*: they connect
   with their Home, you hold a bearer bound to their agent, acts park for their signature. You never hold a key.
2. **Are you describing what an agent should do, not writing a service?** → Build 2. A skill is a document with a
   contract in its frontmatter. It is compiled, assigned by digest, and run by a harness you do not write.
3. **Will other people's agents call this thing as a peer?** → Build 3. That is a service agent: an account, a
   typed name, a card, and — this is the part that gets skipped — a charter that leaves it able to be asked,
   able to record what it did, and visible at its steward's Home.
4. **Do you need your own people, whose keys and records are yours?** → Build 4. That is an estate. The people in
   it are different Smart Agents from anyone else's, because the custody root differs.
5. **Do you need your own chain?** → Build 5. A town is a chain's estates plus the services built on that chain's
   state. Everything else can live in somebody else's town.

## What is true in every one of them

- **The person signs at her own Home.** No build collects a signature on her behalf. An act your code cannot
  authorize comes back `authority_required` with the page where *she* signs.
- **Being listed, connected, admitted or a member is never permission.** The effect you want must be inside the
  acting principal's live, scoped delegation at the moment the act runs. Every other check is an envelope.
- **Behaviour is generated; authority never is.** A coding agent can write builds 1–3 almost entirely. It cannot
  write the authority — that is a contract on chain it can only call.
- **The record belongs to its owner.** Your app's database, your service's Durable Object and your estate's cache
  are serving planes. The record is the owner's vault, and they can take it with them.

## Running one of these for real

Builds 4 and 5 are operations as much as code; the ladder that places them, and what each rung may and may not
ask of the one below, is [Operating it yourself](operating.md).

## If you get stuck

Every guide here ends with a verification you can run. If a step refuses, read the refusal before changing code:
most refusals in this substrate are ceremonies, not bugs — something has not been signed yet, and the message
says by whom. [Troubleshooting](troubleshooting.md) lists the ones people hit twice.
