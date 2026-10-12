# Authoring skills — what an agent knows how to do

**Build 2 of [five](builds.md).** A skill is a Markdown document with an execution contract in its frontmatter.
You author it; a compiler turns it into the agent's behaviour; a harness you did not write runs it. No invoker,
no UI handler and no vocabulary table is written by hand if the contract is doing its job.

This is the highest-leverage thing to build on this substrate and the least like ordinary programming. Read §1
before you write anything.

## 1. Two different things are called a skill

| | **Developer skills** | **Runtime skills (playbooks)** |
| --- | --- | --- |
| Reader | a coding agent building an integration | the harness running somebody's agent |
| Lives in | [`skills/`](../skills/README.md) in this repository, projected to `.claude/`, `.cursor/`, `.agents/` | the skills corpus, published and version-pinned by digest |
| Shape | `SKILL.md` with `name` + `description` | `SKILL.md` whose frontmatter is an **execution contract** |
| Example | "how to expose an A2A service" | "how Carol's coaching service answers a question about a hand" |

This guide is about the second. The first are just procedure documents — add one, run the sync script, done.

## 2. Define the capability once

The rule that makes this worth doing: **one semantic definition produces the agent surfaces and the UX
behaviour.** The Ask in a Home can do what the buttons do because both are projections of the same three things:

- the **ontology** — how the domain is shaped (classes and relationships, bound by IRI, never invented in a prompt);
- the **capability** — the canonical id and label the agent advertises;
- the **execution contract** — this file's frontmatter: risk, authority, inputs, evidence, effects.

If adding a feature means writing an invoker **and** a vocabulary entry **and** a UI handler, the model is not
doing its job and you are about to maintain three truths.

## 3. The contract, field by field

Frontmatter is YAML; the body is prose for the model. The fields that carry weight:

```yaml
---
name: canasta-advise
description: What this does, in one paragraph, for a reader deciding whether to call it.
namespace: card-room
capability: cardroom.advise        # the canonical id — the SAME string the profile and card publish
risk: R0                           # the risk floor for this act
inputs:  { table: Text }           # input name → an ontology class (a T-box term, resolved by the compiler)
required: [table]                  # which inputs the harness must ASK for rather than proceed without
knowledge: { requires: [TableRead, StyleRecord] }   # the record classes it reads
tools: [cardroom.advise]           # the MCP tool ids a plan may use
answers: [what should i do, play this hand]         # fact words a question uses — for a READ
answer: "{{line}} — {{because}}"   # the author's sentence for the result; rendered, never composed
establishes: lookup                # lookup | submission | authoritative — what a success CLAIMS
utterances:
  - says: "what would you do here"
  - says: "play the round for me"
    isNot: "a move — this service advises; it never takes a turn"
---
```

For an act that spends someone's authority, add:

```yaml
verbs: [send, pay]                 # imperatives that name this act
authority:
  mandateRequired: true
  requirement: { type: "urn:ap:rar:payment", actions: [transfer] }
  resourceArg: asset               # WHICH arg carries the resource a mandate scopes
  authorityArg: payer              # WHICH arg names whose authority is spent — never inferred
evidence: { produces: [PaymentReceipt] }
effects:                           # HOW the evidence is discharged
  - kind: notify
    to: payee
```

Four of these repay study:

- **`establishes`** — a reply may claim only what its class allows. An invitation recorded is a `submission`, not
  a membership. This is how a truthful agent stops saying "done" about something that was merely accepted.
- **`resourceArg` / `authorityArg`** — the verifier compares the mandate's resource to *that* argument. A skill
  that does not name them cannot be gated on them.
- **`evidence` + `effects`** — evidence names the artifact; effects say how it is discharged. Evidence with no
  effect is a promise nothing executes. This pairing exists because a treasury playbook once promised "every
  payment leaves a receipt" into a field nothing read: money moved and neither party was told.
- **`isNot` utterances** — the negative examples are worth more than the positive ones. They are what keeps a
  plan from being admitted for a sentence this skill must not answer.

## 4. Archetypes — a bundle per kind of agent

An **archetype** is the set of skills an agent of some kind is born with: a person's agent, an organization's, a
coaching service's. It is assigned to an agent **by definition digest**, so "what this agent can do" is a specific
compiled version, not a moving target. Changing an archetype does not silently change every agent already running
it; re-assignment is an act with a record.

A service agent gets its archetype as birthright #3 of its [charter](build-a-service-agent.md#3-the-charter--four-birthrights-all-of-them-at-creation).

## 5. The corpus — published, versioned, provable

Skills are content, and this substrate treats content the way it treats everything else: identified canonically,
versioned append-only, and independently verifiable.

- **Canonical id** `skill:<namespace>/<name>`, stable across versions; the version is a separate axis.
- **Append-only log** — each `(skill, version)` is one immutable leaf; every publish cuts a snapshot whose Merkle
  root commits the whole prefix, so old versions never lose their proofs.
- **Verify inclusion** — a validator re-derives the commitment, rebuilds the root itself, and re-checks inclusion.
  It trusts nothing the producer says.
- **Provenance on the answer** — when an agent uses a skill to shape a reply, it can attach a `skill-provenance`
  manifest to the artifact, and the receiver can verify the skill was *actually used* rather than merely claimed.

Browse and verify at **[skills.faithnet.io](https://skills.faithnet.io)**.

## 6. The rules a skill is held to

- **Behaviour is generated; authority never is.** The agent surfaces come from this document. No verifier reads
  it. A skill cannot widen what its principal may do, and saying `mandateRequired: false` on an act does not make
  the act permitted — it makes the skill wrong, and the harness refuses.
- **Domain relationships live in the ontology, not in your prose.** "A treasury belongs to the agent that holds
  it" is a T-box claim bound by IRI, not a sentence in a playbook. A prompt is the most tempting place to put a
  domain rule and the worst place to keep one: prompts say how to *behave*, the ontology says how the world is
  *shaped*. (The failure this prevents: an Ask that looked for a treasury whose *name resembled* its owner's, so
  paying "alice" dead-ended because hers was `alice2.treasury`.)
- **Say what it is not.** Scope a skill by the asks it refuses as much as the asks it answers.
- **One capability, one contract.** If two skills claim the same `capability` id, the surfaces they generate
  disagree and something downstream picks one.

## 7. Verify it

| Check | Expect |
| --- | --- |
| frontmatter parses, contract validates | no unknown field, no IRI the ontology does not declare |
| the compiled definition | your skill present, with the risk and authority you wrote |
| ask the agent a sentence from `utterances.says` | a plan that includes this skill |
| ask it an `isNot` sentence | **refused**, and for the stated reason |
| an act with `mandateRequired: true` | parks for a signature — it does not run |
| the published version | verifies inclusion against the corpus root |

Row four is the one to insist on. A skill that answers things it should refuse is not a smaller version of a good
skill; it is the defect.

## Reference

The contract type is `SkillExecutionContractV1` in
[`@agenticprimitives/capability-claims`](https://www.npmjs.com/package/@agenticprimitives/capability-claims);
`parseSkillFrontmatter` is the only correct way to read one. Developer skills for this build:
`agenticprimitives-ontology-modeling`, `agenticprimitives-delegation-design`.
