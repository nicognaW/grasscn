# Pixel Perfect Tests

This package owns captured Minecraft references, native capture and asset derivation, comparison helpers, rendering fixtures, PPT cases, installed-consumer pixel verification and the guarded verification harness. PPTs include captured-reference comparisons and the asset/provenance/comparator checks supporting that proof. A case combining native pixel assertions and behavior remains intact here.

Website, component behavior, API and browser-only rendering regression tests live in `../tests`. Those cases run normally, including all variants, without Base/Full labels or approval. They reuse the exported artifact and foreground-coordination seams and rendering fixture.

## Commands

Run from the repository root:

- `bun run --cwd packages/pixel-perfect test`: Base PPTs only.
- `bun run --cwd packages/tests test`: all non-PPT unit and browser tests.
- `bun run test`: both packages through Turbo, serialized to share local fixture ports; failure in one test package does not suppress the other.
- `bun run --cwd packages/pixel-perfect test:unit`: ordinary harness unit checks.
- `bun run --cwd packages/pixel-perfect dev`: the rendering fixture at `http://127.0.0.1:5174/`.
- `bun run --cwd packages/pixel-perfect fixture:build`: the independent production fixture.
- `bun run porting:check` / `bun run check:pr`: guarded maintainer verification of Base PPTs and all non-PPT tests, plus prechecks and applicable builds.

`playwright.config.ts`, the Base catalogue and `scripts/browser-suite.mjs` operate only on this package's cases. `scripts/browser-suite.mjs list --all --json` lists the PPT inventory without executing it. `packages/tests` has its own unfiltered Playwright configuration and runner. A non-PPT outside the catalogue remains ordinary, not a Full PPT.

The Full executor collects only the PPT complement of Base and rejects non-PPT cases. It retains the fixed snapshot, human-applied run-issue approval, independent-session, resource and checkpoint requirements in [the Full-run lifecycle](../../docs/agents/full-test-runs.md). Non-PPT runs have foreground priority like Base PPTs.

Retained reference bytes and historical receipts stay under `tests/reference`. Logical `tests/reference/...` evidence paths resolve through the repository path resolver. Keep historical command and consumer provenance unchanged. PPT temporary files belong under the repository-root `.pixel-perfect-test/`; standalone non-PPT output lives in `test-results/general/`. Durable Full-run receipts remain in the Git common directory.
