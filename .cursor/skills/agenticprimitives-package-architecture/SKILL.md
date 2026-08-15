---
name: agenticprimitives-package-architecture
description: Select and compose public @agenticprimitives packages while preserving package boundaries and runtime compatibility. Use when deciding dependencies, replacing stitched third-party components, or preventing imports from demos and internal source paths.
metadata:
  version: "0.1.0"
  kind: developer
  status: pilot
---


# Select Agentic Primitives packages

1. Query the package catalog for the requested capability and runtime.
2. Identify the minimum package set and dependency direction.
3. Confirm each package version belongs to the selected release manifest.
4. Confirm browser/Node/Worker/edge support and required peer dependencies.
5. Prefer public exports. Never import `src/`, demo apps, test fixtures, or workspace-only aliases.
6. Check compatible contract and ontology releases.
7. Explain which responsibility each package owns and which it intentionally does not own.
8. Add a package-boundary test or dependency check for reusable code.
9. Record the package selection in the application lock.

See `references/package-selection.md`.
