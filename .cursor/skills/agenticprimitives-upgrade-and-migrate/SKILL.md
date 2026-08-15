---
name: agenticprimitives-upgrade-and-migrate
description: Upgrade an application between Agentic Primitives releases while reconciling package APIs, contract deployments, ontology profiles, skills, and generated templates. Use for version upgrades, deprecations, deployment replacements, or ontology migrations.
metadata:
  version: "0.1.0"
  kind: developer
  status: pilot
---


# Upgrade and migrate

1. Compare old and target release manifests.
2. Categorize changes: package API, runtime requirement, contract source, deployment address/status, storage/proxy, EIP-712/typehash, ontology term/profile, SHACL/context, skill, template, security advisory.
3. Read all package and contract migration notes.
4. Never assume semantic version equivalence across package, contract, deployment, and ontology layers.
5. Run codemods only after producing a change plan and clean checkpoint.
6. Update the package lock and the release pins (`pnpm.overrides`, `agentic.lock.json` when present) together.
7. Re-resolve and verify all live deployments.
8. Migrate ontology data with explicit old/new IRIs and provenance.
9. Run complete unit, fork, integration, negative, ontology, and starter smoke tests.
10. Report behavior changes and any action requiring governance, custody, or user approval.
