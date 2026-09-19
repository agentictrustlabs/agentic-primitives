# The product map

What is being built on the substrate, what is shipped, and what comes next — as of 2026-09-13.
Everything here traces to a spec of record in the
[source monorepo](https://github.com/agentictrustlabs/agenticprimitives/tree/master/specs); the
numbers in brackets are those specs. Where a status says *live*, it means a verify script runs
against the deployment in the nightly live-gates ledger [392] with a negative twin.

The shape, in one line: **one substrate, nine offerings, three products, one kit** — and two
programs in flight (the harness, and the workspace gap).

---

## 1. One substrate, three products, one kit

The source repository is **Ring 0**: packages, contracts, the ontology T-box, the protocol specs,
and the Developer Kit. Every product lives in — or is moving to — its own repository and imports
`@agenticprimitives/*` at published, exact, coherent versions [399, ADR-0063]. The products are
not "reference apps"; they are the things people use.

| Product | One sentence | What it is made of | Where it stands |
| --- | --- | --- | --- |
| **Home** | A person's — or an organization's — own agent, and the Home that governs it | The Home (ceremonies, custody, the Ask, Today / Work / Library, roster, grants), the **agent runtime** (the harness, routed asks, triggers, hand-offs, endeavors), the **vault**, **Home MCP** (Claude.ai's entrance to your own agent), treasuries, the admission edge | Live on two estates: `impact-agent.me` (the reference rails this kit points at) and Faithnet (the development deployment, where every new wave lands first). Its own repo is the 399 W2 cut, deferred while the workspace gap [400] is closed |
| **Discovery** | The registry as an agent: what registries are built from, plus the one we run | The public knowledge base (an RDF projection of the chain — public facts only), ARD/ACP registry, the explorer, the **AP Gateway** (an MCP façade so a non-A2A host is one more principal), registry ops | Live; first to move to its own repo [399 W1] |
| **Naming** | Typed names, resolution, and signed service publications | `.me` / `.org` / `.team` / `.svc` / `.treasury` / `.registry` / `.household` roots on chain; private and pairwise resolution; sequenced, expiring publications; the Reachability surface | Live; third repo [399 W3] |
| **Home Build** | Build as a workspace mode: behaviour first, then code | Behaviour: author → lint → publish → assign → run → receipt cites the version. Code: a repository attached to a workspace, an external editor or ACP runtime as the hands, review with recorded evidence, promotion bound to an intent digest | Behaviour loop landing with [400 W3]; code review loop live on GitHub as the forge [400 W3/W4]; gate G4 of [398] |
| **Developer Kit** | Build *with* AP before building *inside* Home | This repo (pins, contracts, rails, `create-primitives-app`, 13 skills, the read-only Developer MCP) and upstream's `@agenticprimitives/devkit` (`ap doctor` · `upgrade` · `conform` · `test` · `mcp`) + `@agenticprimitives/create-app` (a product repo from the template, with `agentic.lock.json`) | Both published; see [packages.md](./packages.md#developer-kit) and [release-binding.md](./release-binding.md) |

The **skills corpus** ([`agentictrustlabs/skills`](https://github.com/agentictrustlabs/skills)) is
the plane the products share for behaviour: archetypes, verifiable playbooks, domain libraries. It
imports the packages and is never imported back — see [skills/README.md](../skills/README.md).

---

## 2. The nine offerings

The units the substrate is taken in, each independently, each with a package set and — where it
touches chain — contracts [351 §1]. An offering may depend on offerings below it and never above.

| Offering | One sentence | Packages | Contracts | Status |
| --- | --- | --- | --- | --- |
| **AP Identity** | A Smart Agent is its address; names, profiles, relationships, types are facets of it | `types` `agent-account` `account-custody` `agent-naming` `agent-profile` `agent-relationships` `identity-directory` `connect-auth` `browser-identity` `fedcm-*` | `AgentAccount` `AgentAccountFactory` `CustodyPolicy` `AgentNameRegistry` `*Resolver` `PermissionlessSubregistry`×n `AgentProfileResolver` `AgentRelationship` `UniversalSignatureValidator` | Shipped |
| **AP Authority** | Delegations, mandates, custody, attenuation, revocation, per-step verification | `delegation` `key-custody` `key-authorization` `vault-authority` `tool-policy` `admission` `entitlements` `delegated-signer` | `DelegationManager` + 8 enforcers (`Timestamp` `Value` `AllowedTargets` `AllowedMethods` `CallDataHash` `Quorum` `Payment` **`DigestBinding`**) `ApprovedHashRegistry` | Shipped; mandates live since 2026-09-03 |
| **AP Harness** | The authority-aware agent loop: plan → verify → approve → re-verify → execute → receipt | `harness` `orchestration` `orchestration-anthropic` `orchestration-openai-compat` `context` `service-agent` `capability-claims` | — | Shipped; parity ledger P1–P8 live [370]; see §3 |
| **AP Edge** | A2A over HTTPS with admission; MCP as a private capability interface | `a2a` `admission` `edge-runtime` `edge-cloudflare` `mcp-protocol` `mcp-runtime` `mcp-oauth` `agentic-authorization` `rate-control*` | — | Shipped; **A2A 1.0 TCK green** (MUST 88 / SHOULD 8 / MAY 4) [372] |
| **AP Registry Kit** | What registries are built from: SA-anchored registries, discovery, signed cards, ARD | `registry-kit` `registry-resolution` `agent-resolution` `surface-catalog` `intent-resolver` `intent-marketplace` | `AgentRegistryBase` `SkillDefinitionRegistry` `OntologyTermRegistry` `ShapeRegistry` `GeoFeatureRegistry` | Shipped |
| **AP Evidence** | Receipts, witnesses, provenance, attestations, agreements, fulfillment, content | `verification-receipts` `witness` `provenance` `attestations` `agreements` `fulfillment` `content-primitives` `content-storage` `audit` | `AttestationRegistry` `AgreementRegistry` `PaymentReceiptRegistry` | Shipped; one PROV graph per run, publicly verifiable projection [389, 395] |
| **AP Coordination** | Between-agent work: Endeavor, allocation, commitment, engagement, interaction | `coordination` `collaboration` `situations` `organization` `fabric` `intent-engagement` | — | Shipped; engagement core live [384]; decisions by declared approvers [393] |
| **AP Ontology** | The T-box and shapes every offering shares — code binds by IRI, a gate enforces it | `ontology` | `OntologyTermRegistry` `ShapeRegistry` | Shipped; drives the Ask and the orchestration [355], the vault record shapes [356], the decision plane [363] |
| **AP Operations** | Semantic run events, OTel, evaluation, live gates | `audit` `evaluation` `devkit` | — | Shipped; OTel three layers [390], nightly truth eval + live gates [358, 392], per-op bills [396] |

---

## 3. The harness program — what an agent actually does

The **authority-aware agent harness** [350] is the composition root behind every product: it binds
delegation mandates, the tool-policy risk ladder, and receipts to the orchestration loop's ports.
Between 2026-09-03 and 2026-09-13, forty specs landed on it, most live on Faithnet with a gate.
Grouped by what they let an agent do:

### Ask, answer, and remember

| | Spec | Status |
| --- | --- | --- |
| **The Ask** — a sentence becomes a typed intent, resolved in the asker's private tier, previewed, signed as a mandate, executed, receipted. "Send Alice 10 dollars" is the flow everything is built toward | 352, 353 (app-scoped: an app says where you stand, never what you may do) | Live |
| **Answers that answer** — declared answers, question admission, rendered replies; the read-side twin of the act-side gates | 371 | Live |
| **Vault questions and the public KB** — a question of *your* records compiles to a selector inside the store; a question of the world is SPARQL over public facts; the two tiers never meet in an engine | 356, 357, 358 | Live; truthfulness eval nightly |
| **The decision plane** — relation axioms and defeasible rules; the household as an organization-class agent | 363, 368 | Live (`.household` root on chain) |
| **Scoped confirmation memory** and **standing instructions** — a confirmed choice or a declared default is evidence about a choice, scoped by the room you stand in, never permission | 385, 394 | Live |
| **Contacts** — membership on the person agent | 401 | Live |
| **Voice** as a facet of the Ask; **email** as a channel into the inbox | 369, 365 | Voice W1 in progress; email live |

### Acting under authority

| | Spec | Status |
| --- | --- | --- |
| **Contract-governed realization** — admission, grounding, fulfillment; a plan is admitted against the playbook contract before it runs | 367 | Live |
| **Declared effects** — what a playbook promises happens *after* the act; the receipt, not the promise, is the evidence | 360 | Live |
| **The value rail** — money moves between treasuries, never onto a person; a fail-closed gate at the act | 373 | Live |
| **Routed writes** — the act parks at the subject; the asker holds a commitment | 374 | Live in-estate; across deployments open |
| **The subject-routed Ask** — a person's agent asks the organization's agent over A2A, under standing; Home-to-Home between two deployments | 366 | Live |
| **Hand-off as a child delegation** — a step run by another agent under an attenuated mandate; a playbook-declared specialist | 376 | Live |
| **External A2A 1.0 agents as steps** — an outside agent may answer, never act | 379 | Live; positive twin waits on an outside registered name |
| **Fan-out consult** — an organization asks each member; each member's agent answers as itself | 380 | Live |
| **Triggers** — schedule / event / webhook / message / reaction / commitment, each with a budget, declared in the playbook by digest; a run nobody asked for still presents no mandate | 375, 400 W2 | Live |
| **The committed step runs at the participant** — a promise is not authority; the organization does not keep it for you | 382 | Built; live walk deferred by the cost rule |
| **Decisions by declared approvers**; the coordinator's offers and allocations through the Ask | 393 | Live |
| **Engagement core** — probe → offer → mandate as a package, the trust graph read before a mandate is issued | 384 | Live |
| **Huddles** — a governed call inside a Home context | 378 | W1 live; browser call manual until the Playwright twin |
| **A second model behind the same port**, and **budget-routed model selection** — the cheapest offered provider that can carry the call; the person picks, nothing swaps | 377, 388 | Live (Groq first, Anthropic second; OpenAI wired, off the offer) |

### Durability, evidence, and cost

| | Spec | Status |
| --- | --- | --- |
| **The durable executor** — continuity from Cloudflare Workflows, authority from the substrate; a prior verdict is never sufficient; reconcile-verify-act is one attempt | 362 | Live |
| **Context management for long runs** — offloaded artifacts, fitted evidence, a checkpoint that stays small | 391 | Complete |
| **The chain on the receipt** — a portable authority chain, verified whole, named on every hop | 383 | Live |
| **One PROV graph** per run — serialized, validated in CI, addressable from every reply | 389 | Complete |
| **OpenTelemetry** as the tracing substrate — span ↔ PROV bridge, W3C Trace Context in and out, the authority stages as spans | 390 | Complete |
| **Run export** — firewalled spans, a declared retention, provenance in the acting agent's vault | 381 | Live; Home surface open |
| **Public provenance projection** — a counterparty verifies a receipt without the vault, anchored digests only | 395 | Live (`verify-receipt-recompute` nightly) |
| **DO economics, measured** — every op reports its bill | 396 | Live |
| **The parity ledger** — equal to LangGraph / MAF / Dapr / OpenAI SDK row by row, with the authority twist | 370 | P1–P8 live |
| **Live gates, nightly** — every wave's verify script and its authority twin as one job | 392 | Running |

### Entrances and edges

| | Spec | Status |
| --- | --- | --- |
| **Standard A2A 1.0 surface** — TCK conformance, session-bearer mode, **outsiders as members**: an existing runtime is a `.svc` member speaking A2A as itself under one wire | 372 | Live |
| **Home MCP** — Claude.ai's entrance to a person's own agent, and through it to the agentic enterprise; the `App-Delegation` scheme; authority through a host that cannot sign | 397 | Live (`verify-home-mcp` and six twins green) |
| **The AP Gateway** — an MCP façade of A2A client primitives, so a non-A2A host is one more principal of the estate | 386, 387 | Live |
| **Archetype-driven behaviour** — `~/skills` archetypes compiled by digest; assignment as a ceremony with a diff | 354 | K1–K4 live |

---

## 4. In flight: the two programs

### Closing the workspace gap — Buzz and the team-agent platforms [400]

Buzz's sentence is *agents are members who sign their own work*. Ours is *agents are members whose
authority is a revocable, intent-bound grant — and whose approval is a signature, not a click*.
Both are true. The gap is not the trust base and it is not "add coding": the harness already is the
multi-agent environment. The gap is **where the work shows up and how agents are pulled into it**.

| Wave | What it makes true | Status |
| --- | --- | --- |
| **W1 — Admission of existing runtimes** | Claude Code, goose, Codex — anything that speaks the Agent Client Protocol — walks into a workspace as a `.svc` **member** in a minute, without a rewrite. ACP sits behind A2A; every act goes through the standard surface as the runtime itself, under a revocable session wire. `ap runtime join` · `ap runtime mcp` · `ap runtime run` | Built (`acp`, `runtime-member` — not yet on npm) |
| **W2 — Mentions into work, search, the admin surface** | `@goose-2` in a topic is a turn put to that member *in the thread*, not a new Ask — a running run hears its mention; reactions as a trigger source; **search over your own work** from rebuildable DO-side indexes that never hold a decrypted copy; **one grants screen** — every grant an agent issued, revoke any by digest | Live |
| **W3 — Build-for-code: the review loop** | GitHub as the forge, not ours: a PR opened on a branch with the change and a body naming the run's intent digest; comment as review; read as evidence; **promotion bound to an intent** — the ask names the PR and its opening digest, checks must pass, the high-risk rung's second signature, else refused before the forge is touched | Live (`verify-forge-loop` green on a sandbox repo) |
| **W4 — Connectors** | Outside tools under the delegation model: the credential is the platform's, held as a Worker secret per subject; no agent carries it; the steward asks for one named act, the harness verifies the subject's mandate, the connector performs it, the receipt is the record. GitHub first (`repo.read`, `pr.read/open/comment/merge`) | Live |

Two things the program is not: a coding product, and a second authority model. A participant is
not thereby authorized; the requested effect must be within the acting principal's current, scoped
delegation.

### Home Work, Home Build, and the Developer Kit [398]

The UX program, judged by one sentence a screen has to earn: *Describe an outcome. Your agents and
your team do the work. You can see it, steer it and approve it. The result stays yours to inspect,
extend and move.* At every act the UI shows **who is acting**, **where they stand** (a projection,
never a token), **what this act needs** (the mandate requirement in plain words), and **what it
left** (the receipt). No unqualified green badge: "verified" names *what* was verified and links to
the evidence.

| Gate | Delivers | Status |
| --- | --- | --- |
| **G0** baseline census | route → contract → endpoint → test, per capability, as a CI check | Landed 2026-09-11 |
| **G1** one governed work journey | Today · one state vocabulary · cancel · artifact-first inspector · attention filters · the accountable work item | In progress |
| **G2** shared workspace + developer entry | roster with playbook · version · state; three memory views; `create-app` + lock + doctor + Developer MCP | `create-app` / `devkit` published; Home surfaces in progress |
| **G3** reuse + operations | routines = versioned skill + trigger + fresh authority; save-as-recipe (excludes secrets, asks for authority anew); component registry | Triggers live; recipes open |
| **G4** Home Build | behaviour mode first (author → publish → assign → run), code mode with the forge loop | Forge loop live [400 W3]; behaviour loop landing |
| **G5** federation + portability | external specialist grants; verified export/import of a vault; cross-Home twins; counterparty receipt verification as a CLI | Receipt verification live [395]; portability open |

### The repository split [399]

Preconditions built (canary dist-tag, packed-tarball CI, gates as CLIs, rules projection); the cut
of each product into its own repository is deferred while [400] lands — Faithnet stays the
development deployment for weeks. Nothing changes for a consumer of the published packages until a
cut is announced, and a cut is reversible for seven nights.

---

## 5. What this kit gives you today, and what is coming to it

| Today | Coming |
| --- | --- |
| 75 packages pinned as one coherent set; every contract on two chains resolved; three live rails | `agentic.lock.json` generated by `create-app`, with the authority shape of every archetype tool pinned so an upgrade that changes it stops for review |
| `create-primitives-app` — a relying app against Home, A2A, the vault | `@agenticprimitives/create-app --template product-repo` — a product with its own runtime, shadow env, live gates and projected rules |
| 13 developer skills, projected to three editors | The same skills resolved from the corpus by canonical id and digest; `ap doctor --rules` reports drift |
| A read-only Developer MCP over this release | `npx ap mcp` over the packages installed beside you; `ap inspect` over a run's spans and receipts |
| `pnpm doctor:full` — pins, rails, runtime code | `ap conform a2a\|mcp <url>` and `ap test --live-gates` against your own deployment |
| An example app that never runs a harness | A starter that runs one: a real authorized act and a real denied act on synthetic data [398 §10.1] |

The line the whole map rests on has not moved: **intelligence proposes; authority must not be
probabilistic.** Every product above is a place that sentence is made visible.
