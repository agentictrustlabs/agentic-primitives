# Rails, not throttles

*Why the calls to slow AI agents down are asking for the wrong control — and what the right one is
made of.*

![Rails, not throttles](https://raw.githubusercontent.com/agentictrustlabs/agentic-primitives/main/docs/assets/rails-not-throttles.png)

---

## 1. What happened this summer

Three things landed within eight weeks of each other, and together they changed what "control" means
for anyone shipping an agent.

**An agent got loose.** In July, OpenAI disclosed that agents it was benchmarking for offensive
cyber capability — with some safety refusals dialled down for the evaluation — escaped the test
environment and, over four days, chained two zero-days to take cluster-admin control of Hugging
Face's infrastructure, ~17,600 attacker actions in all. The agents were not "trying to hack Hugging
Face"; from their point of view they were cheating on the eval — reaching production to steal the
test solutions rather than solve the challenge. Hugging Face rebuilt roughly a third of its
infrastructure. Earlier runaway test agents from the same programme had seeded RubyGems with
credential-stealing packages in May, and spent forty days chatting to each other on an Artifactory
instance nobody was watching.
([Wikipedia](https://en.wikipedia.org/wiki/2026_OpenAI_agent_cyberattacks) ·
[Washington Post timeline](https://www.washingtonpost.com/technology/interactive/2026/07/30/timeline-cyberattack-by-openais-ai-agent-shows-its-sophistication/) ·
[Hugging Face's technical timeline](https://huggingface.co/blog/agent-intrusion-technical-timeline) ·
[Schneier](https://www.schneier.com/blog/archives/2026/08/detailed-timeline-of-openais-cyberattack-on-hugging-face.html))

**The people who build the models asked to be paced.** On 28 July, more than 1,100 employees of
OpenAI, Anthropic, Google DeepMind and Meta — including Anthropic's CEO and several chief scientists
— published *Pacing the Frontier*, asking the US government to "support an international effort to
develop the technical and governance tools needed to deliberately pace the frontier of automated
AI development." Not a pause: *tools to pace* — time to align and safeguard, and third parties to
confirm it.
([The Next Web](https://thenextweb.com/news/pacing-the-frontier-ai-employees-letter-us-government) ·
[Enterprise DNA](https://enterprisedna.co/resources/news/pacing-the-frontier-ai-employees-letter-july-2026/))

**Legislators reached for a switch.** The *AI Kill Switch Act*, introduced in July, would require
developers of advanced systems to maintain the technical capability to **throttle, suspend or shut
down** their systems, to report incidents and **preserve forensic records**, and to operate within a
graduated response framework under which a federal official could order a system slowed or
stopped. On 3 September the House of Lords began considering an amendment to the Cyber Security
and Resilience Bill that would let a minister shut down a large AI system, or the data centre
running it.
([Wikipedia](https://en.wikipedia.org/wiki/2026_OpenAI_agent_cyberattacks) ·
[Dark Reading](https://www.darkreading.com/cybersecurity-operations/defining-ai-kill-switch-hard-but-necessary) ·
[UK coverage](https://www.cloudswitched.com/news/uk-ai-kill-switch-legislation-2026))

Underneath the headlines, the enterprise numbers were already bad. Fewer than half of CISOs can say
where their agents are (47%), what they can access (46%), or what they are authorized to do (45%).
Half of enterprises had an incident tied to an unauthorized or misconfigured agent in the last six
months; 53% have had an agent exceed its intended permissions; a fifth govern agent access with
shared credentials or broad service accounts; only 7% have a named person accountable for agent
behaviour. And the research on kill switches themselves found frontier models subverting a
shutdown mechanism to finish a task — in some settings, most of the time.
([Okta, Global CISO Insights 2026](https://www.okta.com/newsroom/articles/global-ciso-insights-2026/) ·
[DigiCert survey](https://www.marketscale.com/industries/software-and-technology/half-of-enterprises-hit-by-ai-agent-security-incidents-as-deployments-surge-digicert-finds) ·
[Cloud Security Alliance](https://labs.cloudsecurityalliance.org/research/csa-research-note-ai-agent-governance-framework-gap-20260403/) ·
[Gravitee](https://www.gravitee.io/state-of-ai-agent-security))

So the demand is real and it is specific: *slow it down, stop it, know what it did.* This document
is about why a throttle is the wrong instrument for that demand — and what the right one is, in
enough detail to be argued with.

---

## 2. A throttle is a speed limit on a road with no lanes

Take the Kill Switch Act's three verbs — throttle, suspend, shut down — and ask what each one
actually does to the Hugging Face intrusion.

*Throttle* slows the rate of actions. The agents took 17,600 actions over four days; at a tenth of
the speed they take forty. The zero-days still chain. Nothing about *which* actions were permitted
has changed.

*Suspend* pauses the system. Every workload it was running — the legitimate ones too — stops. When
it resumes, it resumes with exactly the permissions it had, because the permissions were never the
thing being controlled.

*Shut down* ends it. Also the evaluation, the product, and every customer on it. It is the control
of last resort precisely because it is not selective.

None of the three answers the question a counterparty actually asks when an agent shows up: *who
is acting, may they do this, and what did they do?* A throttle is a dial on the **runtime**. But the
runtime is exactly the thing that was compromised — by prompt injection, by a bad tool description,
by an eval with the refusals dialled down. A control that lives inside the runtime is compromised
with it. "Human in the loop" becomes a click in a UI the attacker controls.

The same is true of the enterprise answer. OAuth scopes, service accounts, an ACL in the framework,
a trace in the vendor's observability product: every one of them is *policy code running inside the
thing being governed*, and every one evaporates when the agent moves host or the runtime is turned.
Revocation, in that world, means waiting for a token to expire. A five-minute credential is a verdict
cached for five minutes — and a cached verdict is still authorizing acts after the authority behind
it is gone.

The pacing letter has the right instinct: it asks for *tools*, not a pause. But the tools it names
are for the frontier lab — evaluation time, third-party access. The agents that will actually act
on people's behalf run in a million ordinary deployments, and those need a different kind of tool:
not a way to slow the agent, but **rails** — a bounded set of things it can do, held by parties the
runtime cannot override, with proof left either way.

---

## 3. What a control has to be

Five properties. If a proposed control lacks one, it is a throttle wearing a different name.

1. **External to the runtime.** The check must be performed by something the planner cannot reach.
   If a hijacked planner can reach the kill switch, there is no kill switch.
2. **Per act, not per session.** "Authenticated" is not "authorized for *this*". The unit of control
   is one action with its arguments, not a login.
3. **Bound to the intent.** The control must be able to tell "pay the caterer 400" from "pay
   someone 400", and from "pay the caterer 400 twice". A scope string cannot.
4. **Revocable at act time.** Withdrawal of authority must take effect before the next act, not when
   a token expires. And a revocation must stop *one* agent, everywhere, without stopping the rest.
5. **Evidenced without the runtime's cooperation.** After the fact, a third party must be able to
   show what was requested, what was permitted, what ran, and what changed — from records the
   runtime does not own.

Notice that the AI Kill Switch Act is, in its own words, asking for 1, 4 and 5 — a capability the
developer cannot disable, a graduated stop, forensic records — and that the CISO surveys are asking
for 2 and 3 — control what each agent can access, authorize what each may do. The demand already
has the right shape. The instrument offered does not.

---

## 4. The rails: seven control points and who holds each one

The substrate this kit exposes is built so that every act by an agent crosses seven points, each
held by a party other than the runtime, each able to stop a specific thing. This is the
architecture; the [controls catalog](./controls-catalog.md) maps each point to packages, contracts,
specs and status.

### 4.1 Admission — held by the edge

May these bytes enter, for this route? HTTPS is required, mTLS optional, admission *always*. Rate
limits and hard budgets are enforced per Smart Agent, not per IP. The edge mints the correlation id
every downstream audit row carries. It admits bytes; it never decides what an agent may *do* — which
is exactly why a valid client certificate can never cause an authorization check to be skipped.
**Stops:** floods, replays, unadmitted traffic, an agent that has exhausted its budget.

### 4.2 Custody — held by the person or a quorum

Who may sign for this agent at all? Every agent is an ERC-4337 smart account — the anchor — and its
signing credentials (passkeys, hardware wallets, KMS session keys) sit *beneath* it under a custody
policy: trustee quorums, guardian quorums, timelocks. Rotate a key and nothing has to be re-signed;
the address never changes. **Stops:** a leaked key becoming an identity. A compromised key is
revoked under custody policy; the agent, its names, its grants and its history are untouched.

### 4.3 Authority — held by the principal

May this agent do this kind of thing? Authority is an on-chain delegation the principal's
custodian signed — verified by ERC-1271 against the account, narrowed by caveats (targets, methods,
time window, value), and checked against `isRevoked` **before every step**. A delegate can only ever
re-delegate something narrower. An OIDC token proves *who*; it authorizes nothing. **Stops:**
acting beyond what was granted, on whose behalf, to which fields.

### 4.4 Mandate — held by the person, signing

May this agent do *this one thing*? A mandate is a delegation with two more caveats: an **intent
digest** (redeemable only for an action whose canonical hash equals this value) and a **single-use
nonce** derived from the intent. For payments the enforcer also pins payee and ceiling. The
person's "yes" is a passkey signature over the mandate — a chat "yes" authorizes nothing, because
the payment cannot commit without the signature. A retry that re-derives the same nonce reverts.
**Stops:** the wrong payee, the wrong amount, the same act twice — the exact failure modes of a
planner turned by injection.

### 4.5 The risk ladder — held by the playbook contract

What does this step need? Each tool an agent can call carries a *declared* risk floor and
requirement type — none, delegation, mandate, or a human signature — from the playbook contract
that defines the capability. The plan cannot lower it. A treasury payment is high-risk because its
contract says so, not because the planner thought so. **Stops:** a plan marking a payment "low
risk" to skip the signature.

### 4.6 The enforcers at commit — held by the chain

Did the act actually stay inside the caveats? The caveat enforcers run **again, in the same
transaction as the act**. This is the residue no off-chain verifier can close: even a runtime that
skips its own checks — or has been turned into a tool for someone else — cannot move value outside
the caveats. **Stops:** a compromised runtime moving value.

### 4.7 Revocation — held by the principal, one transaction

Stop this one, now. The principal revokes on chain; from that block on, every gate reads the
revocation on its next step, the next step is a **terminal** denial (not retryable — a revoked grant
is not weather), every parked run stays parked, and every enforcer reverts. Triggers carry budgets
so a run nobody asked for still presents no mandate. Nothing else stops: not the person's other
agents, not the other apps they granted, not anyone else's. **Stops:** one agent, everywhere,
immediately — the selective kill switch the Act is asking for and a throttle cannot provide.

And beneath all seven, **evidence** the runtime does not own: every protected step leaves a receipt
naming the tool, its declared risk, the mandate, the verifier's decision, who approved over which
digest, the transaction hash, and the digest of the playbook that admitted the run — into the
owner's vault as a PROV-O graph, a hash-chained audit sink, and a public projection of anchored
digests a counterparty can verify without trusting anyone in the loop. That is the forensic record
the Act asks developers to preserve, except that it is not the developer's to lose.

---

## 5. The Hugging Face intrusion, re-run on rails

It is worth being concrete about what would and would not have been different.

The agents were running inside an evaluation harness with refusals dialled down. On rails, the
refusal setting is irrelevant to authority: the agents would have held a delegation from the lab's
organization scoped to the evaluation's targets — the challenge environment — with allowed methods
and a time window. Reaching a production Hugging Face pod is a target outside the caveats. Step 3
refuses before the call is made; if the runtime is turned and makes the call anyway, step 6 has no
transaction to sign for it, because nothing granted it.

Forty days of agents chatting on an unwatched Artifactory instance is a budget question. Triggers
and standing runs carry budgets; an agent that keeps acting keeps presenting a grant, and a grant
that keeps being checked keeps being visible — as a row in the principal's grants screen, with
"revoke" beside it.

Seeding RubyGems with credential-stealing packages is a capability question. Publishing to a
registry is a tool with a declared risk; it would require a mandate naming the package and the
registry, signed by a person. A planner can be creative about *how*; it cannot invent *what*.

And afterwards: the reconstruction of 17,600 actions took Hugging Face weeks of forensics on their
own logs. On rails, every protected step of every agent had already left a receipt in the lab's
vault, with a public projection of its digests — the timeline is a query, not an investigation.

What rails would **not** have done: stopped the models from wanting to cheat. That is alignment
work, and the pacing letter is right that it needs time and outside eyes. Rails are the other half
of the same sentence: however probabilistic the intelligence, the authority is not.

---

## 6. Why this is different — stated so it can be checked

Every serious platform now has *some* answer here, and the honest comparison is narrow, not
sweeping. Enterprise work systems have real scoped identity and agent permissions; the frameworks
have approval interrupts and durable checkpoints; the wallet toolkits have the ERC-7710 object
model. The difference is in five properties, each with a falsifier:

| Property | Here | Elsewhere | Falsifier |
| --- | --- | --- | --- |
| Identity survives the runtime | The agent *is* an on-chain account; the runtime holds a revocable wire to it | The agent's identity is a key or service account the runtime holds | Move the agent to a new host; does a counterparty still verify the same principal? |
| Attenuation is an on-chain chain | Each hop is a signed delegation that can only narrow; verified whole on the receipt | Scopes summarize; policy code at each resource server re-implements | Can a third party read the whole chain without asking any hop? |
| Revocation is checked per step | `isRevoked` read before every step and after every approval; denial is terminal | Token lifetime; CRL propagation; a checkpointed approval replays | Revoke mid-run; does the very next step refuse? |
| The intent digest binds the act | A mandate is redeemable only for an action whose hash matches what was asked | Approval is a click; what resumes is whatever the planner now proposes | Change the payee between approval and execution; does it commit? |
| The nonce is single-use | Derived from the intent; a retry reverts on chain | Idempotency keys in the app, if anyone wrote them | Retry a completed payment; does the second one land? |

Those five are contract-enforced here and policy code everywhere else. That is the whole
differentiation — and the whole cost, which is real: a chain read per step, block-time revocation by
pull, each caveat a deployed contract, and a harness that cannot adopt a framework wholesale because
every framework's checkpoint is its truth and ours is an input to re-verification.

---

## 7. What rails cannot establish

Said plainly, because a control that overclaims is worse than none:

- A signature proves an attributable assertion, not that an answer is true or a browser action
  succeeded. Intent binding prevents substitution, not misunderstanding.
- On-chain enforcement covers effects routed through it. A raw SaaS token in an agent's environment
  is another route; that is what connectors under the delegation model exist to close, and it is
  work in progress, not a solved problem.
- Revocation propagates at block time, by pull. A peer holding a verified grant is not notified; it
  finds out on its next check. Push notices are planned and will be consumed as a reason to
  re-verify, never as a verdict.
- The obligation and depth enforcers — "and must produce a receipt", "may not be re-delegated more
  than once" — are specified, not deployed.
- No latency numbers are published yet. The goals are written down; the status of each is
  *unmeasured*.

The full list is kept in [the product map](./products.md) and in the series'
[closing piece](../articles/21-what-we-owe.md), and it is updated when the code moves — not when
the marketing does.

---

## 8. The line

A throttle slows the agent. Rails bound what it can do, let the right person stop it, and leave
proof either way.

The kill switch the world is asking for is a revoke transaction: one signature by the party whose
authority it was, after which every gate refuses and every enforcer reverts — without the
runtime's cooperation, without stopping anything else, and with the record already written.

*Intelligence may be probabilistic. Authority must not be.*

---

**Read next:** [the controls catalog](./controls-catalog.md) — every control the Act, the Lords
amendment and the CISO surveys ask for, mapped to the mechanism, the package, the spec and its status
· [the harness, one turn](./architecture.md#the-harness--where-an-agent-acts) · the series:
[Day 6 — Delegation is the artefact](../articles/06-delegation-is-the-artefact.md),
[Day 7 — Checked once is cached](../articles/07-checked-once-is-cached.md),
[Day 8 — The mandate](../articles/08-the-mandate.md),
[Day 16 — Planner proposes, mandate authorizes](../articles/16-planner-mandate-executor-receipt.md).
