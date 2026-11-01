# Pixel Perfect Tests

This package owns captured Minecraft references, native capture and asset derivation, comparison helpers, PPT cases, installed-consumer pixel verification and the guarded PPT verification harness. Shared renderer, artifacts, generic fixture hosting and runtime coordination are owned by `@grasscn/tests`. PPTs include captured-reference comparisons and the asset/provenance/comparator checks supporting that proof. A case combining native pixel assertions and behavior remains intact here.

Website, component behavior, API and browser-only rendering regression tests live in `../tests`. Those cases run normally, including all variants, without Base/Full labels or approval. Both packages reuse the general package's exported artifact and foreground-coordination seams and rendering fixture.

## Commands

Run from the repository root:

- `bun run --cwd packages/pixel-perfect test`: Base PPTs only.
- `bun run --cwd packages/tests test`: all non-PPT unit and browser tests.
- `bun run test`: all non-PPT cases only. Use `bun run test:ppt` to explicitly select Base PPTs.
- `bun run --cwd packages/pixel-perfect test:unit`: ordinary harness unit checks.
- `bun run --cwd packages/tests dev`: the rendering fixture at `http://127.0.0.1:5174/`.
- `bun run --cwd packages/tests fixture:build`: the independent production fixture.
- `bun run porting:check` / `bun run check:pr`: separate guarded workflows: `porting:check` checks PPT preconditions and Base PPTs; `check:pr` checks normal preconditions, builds and non-PPT tests.

`playwright.config.ts`, the Base catalogue and `src/selection/suite.mjs` operate only on this package's cases. `bun run list --all --json` lists the PPT inventory without executing it. `packages/tests` has its own unfiltered Playwright configuration and runner. A non-PPT outside the catalogue remains ordinary, not a Full PPT.

The Full executor collects only the PPT complement of Base and rejects non-PPT cases. It retains the fixed snapshot, human-applied run-issue approval, independent-session, resource and checkpoint requirements in [the Full-run lifecycle](../../docs/agents/full-test-runs.md). Non-PPT runs have foreground priority like Base PPTs.

Retained reference bytes and historical receipts stay under `tests/reference`. Logical `tests/reference/...` evidence paths resolve through the repository path resolver. Keep historical command and consumer provenance unchanged. PPT temporary files belong under the repository-root `.pixel-perfect-test/`; standalone non-PPT output lives in `test-results/general/`. Durable Full-run receipts remain in the Git common directory.

## Interfaces and retained compatibility

Public workspace imports expose the artifact fixture and PPT selection interface; PPT implementation uses private `@ppt` aliases, while shared interfaces use public `@grasscn/tests` subpaths. General implementation uses private `@tests` aliases. The general package owns renderer hosting, workload budgets, checkpoints and installed-file resolution. Native, CJK and composition cases are grouped by component; normal behavior and API contracts live together in the general package.

The obsolete `scripts` launchers and case-directory fixture adapters are removed. Operational tools live in `cli` and `src`. Two deliberate compatibility mechanisms remain: the root path helper bootstraps repository ownership for both packages and preserves logical paths consumed by retained evidence; historical checkpoint/report readers validate receipts against their recorded source layouts. Archive sources under `tests/reference` retain their original bytes and historical paths. They are not active import conventions for authored tooling.
