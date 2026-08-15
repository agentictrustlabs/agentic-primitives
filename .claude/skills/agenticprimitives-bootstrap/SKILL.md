---
name: agenticprimitives-bootstrap
description: Design or create a release-pinned Agentic Primitives application from a solution request. Use when starting a repository, choosing a starter template, selecting features, chain, wallet, ontology profile, and AI harness support.
metadata:
  version: "0.1.0"
  kind: developer
  status: pilot
---


# Bootstrap an Agentic Primitives solution

## Procedure

1. Translate the requested outcome into application shape, actors, trust boundary, authority path, chain behavior, data sensitivity, and domain semantics.
2. Read the current release manifest and compatibility matrix.
3. Select the smallest base template and compatible overlays.
4. Default to local Anvil or the supported reference testnet. Treat mainnet as read-only unless the user explicitly establishes a reviewed production workflow.
5. Select only the ontology profiles needed for the solution.
6. Select developer skills separately from runtime skills.
7. Run the starter generator non-interactively when the choices are known.
8. Inspect the release pins (`release-manifest.json`, or the app's `agentic.lock.json` when present), generated environment variables, and security defaults.
9. Run install, doctor, typecheck, tests, manifest validation, ontology validation, and smoke test.
10. Report the exact release, packages, contract set, ontology profiles, skills, and unresolved production gates.

## Never

- ask for a private key or seed phrase;
- deploy contracts automatically;
- enable mainnet writes by default;
- install all domain ontologies or all runtime skills “just in case”;
- claim production readiness from a successful local build.

## Resources

- See `references/decision-checklist.md`.
- See `../../docs/getting-started.md` and `../../docs/create-app.md`.
