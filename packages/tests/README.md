# General testing

This package owns shared rendering fixtures, artifact collection, resource coordination, source-bound checkpoints, installed-file resolution and normal tests. The PPT package consumes these public interfaces; general tests do not import PPT selection or Full-run policy.

## Commands

From the repository root, `bun run test` runs normal unit and browser checks; `bun run check:pr` runs guarded normal prechecks, builds and tests. Neither implicitly runs PPTs. Contributors explicitly choose `bun run test:ppt` for Base PPTs or `bun run porting:check` for guarded PPT verification. Full PPTs retain their separate approved-run workflow.

`bun run --cwd packages/tests test --list --reporter=json` collects normal browser cases without executing them. `bun run --cwd packages/tests test:unit` checks the general testing tools. `bun run --cwd packages/tests dev` serves the shared renderer on loopback, and `bun run --cwd packages/tests fixture:build` builds its independent production bundle.

## Layout and interfaces

Normal behavior and compile-time API contracts are grouped together under `tests/components`; website cases and infrastructure unit checks have separate groups. Shared implementation lives in `src`, thin entrypoints in `cli`, and renderer/shared input files in `fixtures`.

Public `@grasscn/tests` subpaths expose the artifact test fixture, owned file accessors, fixture build/host, isolated verification hosts, resource coordination, checkpoint tools and installed-file resolver. Use private `@tests` aliases only for implementation. Preserve the existing shadcn `@/components/ui` consumer meaning. Vite configuration bootstraps through public package interfaces so bundled temporary configs do not lose private alias resolution.

The path facade has one deliberate relative bootstrap to the root repository path helper. Explicit consumer roots remain isolated; retained evidence and historical receipts keep their recorded provenance. The old scripts-directory forwarders are removed. Standalone normal output belongs in `test-results/general`; retained shared oracle inputs preserve their original bytes and recorded relocation map.

Checkpoint schema 3 binds the owning case and definition source independently. Historical records remain source-bound and are rejected when that relationship cannot be established.
