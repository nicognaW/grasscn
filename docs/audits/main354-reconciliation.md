# Committed main and Next integration reconciliation

This merge joins committed main `354e37203e81838ff4a44ee1ea62c0c30779260b` to Next integration `4a23ad451edd11c830ca3d0587a243b1f4247a40`. Canonical main's uncommitted work and the rejected `nx-16` runtime caches were untouched.

Main's package split, policy, root commands, package manifests and shared host/fixture/paths interfaces are authoritative. Normal tests have no Base/Full gate. Base PPTs are explicitly selected; Full PPTs retain their approved-issue and independent-session requirements. The website retains Next/Fumadocs scripts and dependency versions, adds main's public web exports, and retains Next generation/build outputs with the relocated owner inputs. The lockfile merged without conflict; no installation, lock regeneration or upgrade was performed.

The mechanical migration preserves whole test case blocks. Four mixed files now separate ordinary website cases from native comparison cases; the foundation's combined shell/native case remains a PPT. The consumer verifier includes a native Button comparison, so it belongs in specialized `src/installed`; its obsolete behavior-classification assertion was removed. The older Slider mapping remains absent because its captured text differs from the actual Volume default. Its original test/reference remain outside Base without execution.

[The migration map](main354-migration-map.json) records destinations and SHA-256 for all 386 new native evidence files. Those bytes were checked before and after relocation. Existing main reference files and registry bytes were unchanged. The specialized catalogue contains 11 retained main mappings plus 19 existing source-bound Next mappings, with unique identities. These are catalogue contents, not a new executed inventory.

Static verification checked the main policy/interfaces against their committed bytes, confirmed that website changes against the pre-merge integration are limited to package exports and Turbo inputs, verified whole-case preservation, and parsed all 20 migrated files using Bun's syntax transformer. The guarded merge and file migration completed within the resource ceilings. No Full PPT, browser journey, build or typecheck was executed for this combined result.

## Remaining integration work for #22

- Install the reconciled worktree before runtime verification. It has no local dependency installation; ancestor-workspace resolution can otherwise select canonical-main packages.
- Adapt shared normal verification, specialized verification and host orchestration to the Next production/dev lifecycle. Main's current website build/host steps still describe Vite; do not restore the retired website or old test scripts to satisfy them.
- Collect independent normal and PPT inventories through the new interfaces; validate every new PPT mapping exactly once, without executing Full.
- Wire the retained `packages/tests/tests/unit/component-source.test.tsx` contract into the appropriate unit entrypoint; main's existing unit glob selects `.test.mjs` files.
- Complete worktree typechecking, builds, normal verification, explicitly applicable Base PPTs, fresh independent consumers, and final running loopback acceptance preview. Historical authoring receipts do not verify this merged runtime.
