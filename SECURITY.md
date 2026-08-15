# Security policy

## What this repository is

A developer kit against **testnet** reference deployments (Base Sepolia). Sessions are demo-grade
by design; production custody is the job of the KMS backends in
`@agenticprimitives/key-custody`. Do not put real value through the reference rails, and do not
report "the demo session is not production-grade" — that is documented, deliberate, and stated in
the README.

## Reporting a vulnerability

**Do not open a public issue.** Use GitHub's private vulnerability reporting on this repository
(Security → Report a vulnerability), or email the maintainers listed on the GitHub organization.

Include: the affected surface (CLI, a wrapper package, the example app, a doc that induces an
unsafe pattern), reproduction steps, and impact. Reports about the live rails or the published
`@agenticprimitives/*` packages are forwarded upstream.

You can expect an acknowledgement within a few days. Please allow a reasonable disclosure window
before publishing.

## In scope

- `packages/create-primitives-app` — anything the scaffold writes that weakens a generated project
  (a credential that reaches the browser, a widened issuer allowlist, a secret in a tracked file).
- `packages/home-connect`, `packages/interactions-client` — verification logic, issuer policy,
  wire validation.
- `apps/commons` — patterns the docs tell people to copy.
- Docs that instruct an unsafe pattern.

## The security model, in one paragraph

A token proves **who** and authorizes nothing; authority is an on-chain delegation the person
signed, verified per call and revocable without the app's cooperation. Apps are delegates, never
custodians — the worst case for a compromised app credential is a one-transaction revoke, never a
lost identity. A report that shows a path from "compromised app" to anything larger than that is
exactly what we want to hear about.
