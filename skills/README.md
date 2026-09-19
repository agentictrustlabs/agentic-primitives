# Developer skills

Thirteen **build-time developer skills** — procedure for a coding agent working *on* an
integration: choosing packages, designing a delegation, integrating a contract, exposing an MCP or
A2A service, reviewing security, upgrading between releases. They are projected into
`.claude/skills`, `.cursor/skills`, and `.agents/skills` so Claude Code, Cursor, and Codex load the
same text:

```bash
node scripts/sync-skills.mjs          # regenerate the projections
node scripts/sync-skills.mjs --check  # CI: projections match skills/
```

`catalog/skills.json` lists them as the `developer-core` pack in the release manifest.

## These are not the agent's behaviour

Runtime behaviour — what a *person's agent* or an *organization's agent* knows how to do — is a
different kind of artifact and lives in a different repository:
[`agentictrustlabs/skills`](https://github.com/agentictrustlabs/skills), the **skills corpus**.

| | Developer skills (here) | Runtime playbooks (the corpus) |
| --- | --- | --- |
| Reader | A coding agent building an app | The harness running an agent |
| Shape | `SKILL.md` with `name` + `description` | `SKILL.md` whose frontmatter is the **playbook contract**: risk, requirement type, resource and authority arguments, approvals, evidence, effects |
| Identity | A folder name | A canonical id `skill:<namespace>/<name>`, a SHA-256 content commitment, a leaf in an append-only Merkle log |
| Assignment | Loaded by the editor | Compiled into a harness definition **by digest**; assigned to a chartered agent through a ceremony with a diff; never auto-applied |
| Evidence | None needed | Every step receipt carries the digest of the playbook that admitted the run; `skill-provenance/v1` on A2A artifacts is independently verifiable |
| Authority | None | **None.** A playbook changes what an agent knows how to do and grants nothing. The verifier never reads it |

The corpus also holds the **archetypes** (`person-steward`, `org-steward`, `treasury-steward`,
`coordinator`, `household-steward`, `runtime-member`, `content-catalog`, `spec-librarian`, …) and
the **domain libraries** — each vertical's ontology in four layers (T-box · SHACL · C-box · A-box),
its skill folders owned by a domain organization, and its knowledge base. Vertical vocabulary
arrives that way, never through `packages/*`.

Upstream's Developer Kit (`@agenticprimitives/devkit`) resolves developer skills from that same
corpus by canonical id and version, and `ap doctor --rules` reports a drifted projection by digest.
This kit's folder is the pinned, offline copy for this release.

## Adding one

A skill is a folder with a `SKILL.md` whose frontmatter `name:` matches the folder and carries a
`description:`; keep the body under 500 lines and move detail into `references/`.
`pnpm release:validate` checks all of that, then run the sync.
