# General testing infrastructure and normal tests

This package owns shared rendering fixtures, artifact collection, fixture hosting, resource coordination, installed-consumer mechanics and normal tests. The PPT package depends on these public interfaces; this package does not import PPT selection or Full approval.

- `bun run test` from the repository root runs normal unit and browser tests only.
- `bun run check:pr` runs guarded ordinary prechecks, builds and normal tests.
- `bun run test:ppt` and `bun run porting:check` are explicit PPT workflows owned by the specialized package.

Normal component behavior and compile-time API cases live together under component groups. Website cases and infrastructure unit checks have separate groups. Reusable implementation lives in source modules; CLI entrypoints select and launch it. Public imports use `@grasscn/tests` subpaths; private implementation uses `@tests` aliases. Shared renderer imports the actual authored registry through narrow web-package exports.

The public fixture, artifact, coordination, checkpoint, paths, installed-consumer and resource-runner interfaces are consumed by both normal and PPT workflows. Checkpoint schema 3 records owning case and definition source independently; legacy records remain source-bound and are rejected when their source relationship cannot be established.

Reference and fixture access is owner-aware and independent of the shell's current directory. Historical evidence keeps its original bytes and provenance; `fixtures/reference/relocations.json` maps shared inputs relocated from the earlier layout.
