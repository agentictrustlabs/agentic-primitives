---
name: agenticprimitives-release-verification
description: Verify that an Agentic Primitives Developer Kit release is internally consistent and derived from the expected package, contract, deployment, ontology, skill, documentation, and provenance sources. Use before publishing or trusting a release.
metadata:
  version: "0.1.0"
  kind: developer
  status: pilot
---


# Verify a release

1. Verify signed tag/manifest/checksum provenance.
2. Confirm source commits and generated-diff cleanliness.
3. Confirm npm tarballs, versions, integrity, exports, and SBOM.
4. Confirm ABI/build/typehash/selector/storage-layout consistency with Solidity source.
5. Confirm every released deployment runtime code hash and proxy implementation.
6. Confirm ontology modules, version IRIs, import closure, contexts, shapes, term index, examples, and mappings.
7. Validate all developer skills and harness projections.
8. Generate and test every supported starter combination from packed/published artifacts.
9. Run documentation snippets, MCP contract tests, skill evals, and security scans.
10. Produce a signed verification report containing all digests and failures.

A release is not valid when only the package tests pass; every bound layer must match the same manifest.
