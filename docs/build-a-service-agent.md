# Build a service agent

**Build 3 of [five](builds.md).** A *service agent* is a thing other people's agents engage as a peer: a
scripture resolver, a canasta coach, a translation service, a treasury. It is not a microservice with an API key.
It is an account on chain with a typed name, a card that says what it does, records of its own, and a steward who
answers for it.

This guide is the ceremony and the two shapes it comes in. It assumes you can already sign in at an estate's Home
([Build 1](getting-started.md)); if you are standing up your own estate, that is [Build 4](estate-anatomy.md).

## 1. What a service agent is

| | |
| --- | --- |
| **Class** | `prov:SoftwareAgent` — a *Service*. Every Smart Agent is a Person, an Organization or a Service, and nothing else. "Treasury", "registry", "indexer" are service *roles*, not new classes. |
| **Identity** | an ERC-4337 Smart Agent account. The address is the identity; the name, the card, the endpoints are facets pointing at it. |
| **Name** | typed: `<label>.svc` (also `.treasury`, `.workspace`, `.registry`). The suffix names the derived type, the on-chain `atl:agentType` record is the authority, and a suffix that disagrees with the record fails closed. |
| **Custody** | a person or an organization custodies it. The custodian signs its ceremonies. The service never holds a person's key. |
| **Authority** | none, by default. A service agent reaches someone's data only under a delegation that person signed, naming this service as the delegate. |

**The sentence to keep:** a service agent is accountable, not powerful. Everything below makes it accountable.
Nothing below gives it authority over anyone.

## 2. Two shapes — pick before you write code

### Shape A — hosted: no app at all

Your work is already an MCP server (or can be). You publish records that name it, assign the agent a playbook, and
**the estate's agent runtime runs the harness for it**. Nothing of yours listens on A2A; nothing of yours stores a
run. This is the default, and the one to choose unless a line in Shape B applies to you.

```
your MCP server  ◄── the estate's agent runtime (harness, authority, receipts) ◄── A2A ◄── someone's agent
```

### Shape B — self-hosted: you run the door

You run the A2A endpoint yourself, embedding the **Service Host** so that runs, receipts and provenance still land
in *the agent's own* storage and vault. Choose this only when you need something the runtime cannot carry: a
Container, a language that is not TypeScript, a model binding of your own, a long-running local process.

```
your Worker ── Service Host (harness, authority, receipts) ── your work  ◄── A2A ◄── someone's agent
```

**The rule that governs both:** *a service agent's run is a harness run, or it is not a run of that agent.* A
service that answers from its own loop with its own log looks fine from the outside and leaves its steward's Home
showing "No runs yet" after a hundred asks. That is the defect this guide exists to prevent.

> **Honest status.** `@agenticprimitives/service-host` is published early (`0.0.0-alpha.0`) and
> `create-app --kind service` is specified but not yet shipped, so Shape B is assembled by hand today and the
> ceremony below is run as scripts. Shape A needs no scaffold at all and is fully live. Check
> `npm view @agenticprimitives/service-host version` before planning around the package.

## 3. The charter — four birthrights, all of them, at creation

A service agent is **not** finished when the account is deployed and named. It is finished when it can be asked,
can record what it did, and its steward's Home can show it. Four legs, in order:

| # | Birthright | What it is | Skipped ⇒ |
| --- | --- | --- | --- |
| 1 | **Identity + standing** | the account deployed; its typed name claimed; its public records written (`atl:agentType`, `a2aEndpoint`, `atl:cardUri`, `atl:mcpEndpoint` when it serves one); the **stewardship link** recorded in the steward's vault | nobody reaches it by name; its steward's Home does not list it |
| 2 | **Storage** | its **vault key binding** (provision + bind, signed by its custodian) and a standing **interactions grant** to its own door | `vault_key_unauthorized` on every read; nothing it does can be recorded |
| 3 | **Playbook** | an archetype assignment in its vault, **by definition digest** — the default for its kind or the one you name | the bare harness: a service that acts and tells nobody |
| 4 | **Harness** | Shape A: records name its MCP. Shape B: the Service Host embedded **and** a read wire issued to its steward's Home (`harness.read` only), or the Home cannot read its runs | an endpoint that answers and an estate that never saw it |

```
deploy → name + records → stewardship link
      → vault-key bind → interactions grant
      → archetype assignment (by digest)
      → the harness: records name the MCP (A)  │  Service Host + read wire (B)
      → verify: it answers an ask, and its steward's Home lists it with 0 runs — not "not enabled"
```

**A charter that cannot finish a leg says so and stops.** It does not deploy, name, and print a list of things for
the operator to do later. Each leg is idempotent, so a repair is the same script run again.

## 4. Its skills

A service agent's behaviour is authored, not coded: one `SKILL.md` per capability, with an execution contract in
the frontmatter. That is [Build 2](authoring-skills.md) and you should read it before writing invokers — the
contract is what decides the agent's tool set, its published vocabulary, its card's skills, each act's mandate
requirement and risk floor, and what follows the act. Write the contract first and most of the service is decided.

For a service, two contract fields carry most of the weight:

- `capability` — the canonical id, the same string the agent's profile and card publish.
- `authority.mandateRequired` — `false` for a read, `true` for an act, and when true, `resourceArg` and
  `authorityArg` say *which argument* carries the resource a mandate scopes and *whose* authority is spent. A skill
  that does not say which arg is which cannot be gated on one.

## 5. How someone else's agent reaches it

This is the part that distinguishes a service agent from an API, so it is worth stating in full.

1. **Her agent finds yours** — by name resolution, or in the town's registry, or because she named it. Being found
   grants nothing: a resolver returns an endpoint, a registry says only that it lists.
2. **She grants, if your service needs her data.** A coach that reads her study records holds a delegation *she*
   signed, naming your service as delegate, scoped to those record families, revocable by her at any time. Your
   service is the delegate; its custodian is not.
3. **Her agent asks yours over A2A**, presenting that grant. Your door admits the request (admission is not
   authority), the harness verifies the grant against chain state **at act time**, and only then does your work run.
4. **The answer goes back through her agent** and is shown in your service's name. Your service does not speak to
   her screen.
5. **The record lands twice, correctly**: your service's runs and receipts in *its* vault; anything of hers stays
   in *hers*. A service that files a client's records in its own cabinet is refused — and should be.
6. **She revokes.** At the next request your service is simply no longer admitted to her records, with nothing of
   hers left behind. Nobody has to ask you to delete anything.

## 6. What a service agent must never do

- **Hold a person's key, or collect her signature.** An act beyond its grant comes back `authority_required`
  naming where *she* signs.
- **Keep a client's records in its own vault.** Its storage is for *its* work: its runs, its catalog, its receipts.
- **Treat connection, membership or admission as permission.** None of them is a delegation.
- **Run its own loop.** See §2. If it answers outside the harness, it is not accountable, whatever it logs.
- **Infer authority from its own card.** A card is a description. No verifier reads it.

## 7. Verify it, the way a stranger would

| Check | Expect |
| --- | --- |
| resolve its name | the endpoint from the chain, not a hostname you typed |
| `GET <endpoint>/.well-known/agent-card.json` | a card whose skills match the contracts you wrote |
| ask it something it should refuse | a refusal naming the missing authority — not a 500, not an answer |
| ask it something it should answer, as a person who granted it | an answer, and a run |
| open the steward's Home → Activities | **the run is there**, with its steps and provenance |
| revoke the grant, ask again | refused at the first step |

The fifth row is the one that fails in practice. If the Home shows nothing, birthright 2 or 4 was skipped.

## Reference

Developer skills a coding agent can load for this build: `agenticprimitives-a2a-service`, `agenticprimitives-mcp-service`,
`agenticprimitives-delegation-design`, `agenticprimitives-smart-agent-account` ([`skills/`](../skills/README.md)).
Packages: [`@agenticprimitives/a2a`](https://www.npmjs.com/package/@agenticprimitives/a2a) ·
[`service-host`](https://www.npmjs.com/package/@agenticprimitives/service-host) ·
[`mcp-runtime`](https://www.npmjs.com/package/@agenticprimitives/mcp-runtime) ·
[`agent-naming`](https://www.npmjs.com/package/@agenticprimitives/agent-naming) ·
[`delegation`](https://www.npmjs.com/package/@agenticprimitives/delegation). The live rails to develop against are in
[live-endpoints.md](live-endpoints.md).
