# Maintainer local verification

GitHub Actions is disabled. Maintainers run this workflow locally before merging pull requests; contributors are not required to reproduce the maintainer workstation setup. Verify the proposed merge result and intended base. Recheck when either changes; receipts apply only to recorded source and environment. These commands do not merge or publish:

- `npm run porting:check`: types, committed evidence integrity, preview preparation, recent-port interaction/integration regressions.
- `npm run check:pr`: prechecks, production builds and the full Playwright suite.

For a focused recent-port pixel audit, run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-porting.ps1 -Suite pixels` directly. This selects the advancement/native-expansion corpora, not every component's pixel tests.

Contributor commands are cross-platform: `npm run dev` starts the website, `npm run registry:serve` builds and serves registry JSON, `npm run check` runs types and evidence integrity checks, and `npm test -- <file-or-filter> --workers=1` selects browser tests. `npm run build` validates and builds both the registry and website. Preparation of generated indexes is included where needed.

Read package scripts for current suite contents. Actual shadcn CLI installation and fresh native captures remain additional gates when relevant; these commands do not perform them. Existing installation receipts apply only to their pinned sources/cases.

The Windows launcher reflects the current maintainer workstation setup: a bounded job, one browser worker, headroom guards and serialized batches. Existing local servers are outside its job: cap them separately, account for their usage and avoid duplicate instances. The workstation's limits are 80% CPU/90% RAM; these are local settings rather than contributor requirements. A resource stop leaves verification incomplete.

Logs, resource summaries and source-bound results live beneath ignored `test-results/porting/`. Run focused checks while implementing and the full suite before merge. Resume unfinished suites only when source/environment match; never reuse a pass after its inputs change.

Require separate fixture, fresh CLI-consumer, and integrated-preview checks. Verify content bounds, all visible rows, long navigation labels, overlays, connected state and keyboard flows at desktop/mobile widths. Fixture pixels cannot catch surrounding CSS failures.
