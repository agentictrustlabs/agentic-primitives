// @starter/catalog — every published @agenticprimitives package, in one dependency list.
//
// This package exports nothing on purpose. It exists so that `pnpm install` in this repo pulls
// the ENTIRE published surface, and `pnpm check:packages` can then import each entry point for
// real rather than asserting from a table that it would work.
//
// Why that is worth a package: the substrate ships ~66 libraries with a dense peer graph, and the
// failure most third-party developers hit first is not "the API is wrong" — it is "this package
// does not resolve in my runtime". A harness that installs all of them and imports each one turns
// that into a check you run in ten seconds instead of a mystery you hit in week two.
//
//   pnpm check:packages            # registry versions + import check for everything installed
//   pnpm --filter @starter/catalog test    # import check only, offline
//
// The list in `scripts/check-packages.mjs` is the one grouped for humans (and mirrored in
// docs/packages.md). The list HERE is the one npm resolves. They are checked against each other
// by the script: a package in the docs but not installed shows as "not installed", and a package
// that is installed and fails to import is a hard failure.

/** Kept so the module has a value export and the file is not tree-shaken to nothing. */
export const CATALOG_NOTE =
  'Dependency-only package. See scripts/check-packages.mjs and docs/packages.md.' as const;
