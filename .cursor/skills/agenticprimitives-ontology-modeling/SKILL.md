---
name: agenticprimitives-ontology-modeling
description: Use Agentic Trust ontology profiles in application code with canonical IRIs, JSON-LD, RDF, SHACL, SPARQL, provenance, and code mappings. Use when modeling domain data, generating semantic payloads, validating graphs, or linking ontology terms to package and contract surfaces.
metadata:
  version: "0.1.0"
  kind: developer
  status: pilot
---


# Model with Agentic Trust ontologies

1. Start from the selected ontology lock and application profile.
2. Search the term index before inventing a class or property.
3. Use canonical and version IRIs and preserve provenance/source attribution.
4. Load only the profile/import closure required for the task.
5. Use JSON-LD contexts for payload ergonomics, RDF for graph semantics, SHACL for declared constraints, and SPARQL for queries.
6. Use generated TypeScript IRI constants and payload schemas where available.
7. Validate positive and negative example graphs.
8. Link the semantic term to implementation through the ontology bridge.
9. Document reasoning assumptions and whether validation is closed-world or open-world.
10. Treat semantic assertions as policy inputs, never direct authority.

See `references/semantic-boundaries.md`.
