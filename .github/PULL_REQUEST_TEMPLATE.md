## Why

<!-- One or two sentences. The diff says what; this says why. -->

## Checklist

- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (includes the CLI smoke test)
- [ ] `pnpm check:endpoints` passes, and any doc it contradicts is fixed here
- [ ] If a wrapper changed: `pnpm --filter create-primitives-app sync-templates` was run
- [ ] No principle is violated (no app-side user content store, no credential in JS reach,
      no fallback chains, no hand-rolled signature code, no widened issuer allowlist)
