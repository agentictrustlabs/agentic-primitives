# @starter/catalog

Every published `@agenticprimitives/*` package, in one dependency list. **It exports nothing.**

It exists so `pnpm install` in this repo pulls the entire published surface, and
`pnpm check:packages` can then import each entry point *for real* rather than asserting from a table
that it would work.

```sh
pnpm check:packages                      # registry versions + a live import check for all 66
pnpm --filter @starter/catalog test      # import check only, offline
```

```
66 packages · 65 installed and importing · 0 broken
```

## Why this is worth a package

The substrate ships ~66 libraries with a dense peer graph. The failure most third-party developers
hit first is not "the API is wrong" — it is **"this package does not resolve in my runtime"**: an
ESM-only entry point, a missing peer, a package that publishes only subpaths.

A harness that installs all of them and imports each one turns that into a ten-second check instead
of a mystery you hit in week two.

## What the check knows

- **Not published** — the package is in the catalog but not on npm yet. A fact about the upstream
  release train, noted and never fatal. `vault-authority` is currently the one.
- **Subpaths only** — installed, deliberately has no default entry. `contracts` is the case: it
  ships ABIs and deployment JSON under explicit subpaths and nothing at `.`. Reporting that as
  broken would be wrong.
- **Broken** — published, installed, and the entry point throws on import. The only condition that
  exits non-zero.

The resolver reads each package's own `package.json` rather than using `require.resolve`, because
these are ESM-only with `exports` maps carrying no `require` condition — the CJS resolver reports
"no exports main defined" for a package that is installed and perfectly fine.

## Keeping it in step

Three lists must agree:

| List | Purpose |
| --- | --- |
| `packages/catalog/package.json` | What npm actually installs |
| `scripts/check-packages.mjs` | Grouped for humans; drives the check |
| `docs/packages.md` | The prose catalog |

The script reconciles the first two: a package in its groups but absent from the install shows as
"not installed here". Adding a package means touching all three.
