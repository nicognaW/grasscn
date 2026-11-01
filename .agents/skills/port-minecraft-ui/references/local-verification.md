# Maintainer local verification

GitHub Actions is disabled. Maintainers run this workflow locally before merging pull requests; contributors are not required to reproduce the maintainer workstation setup. Verify the proposed merge result and intended base. Recheck when either changes; receipts apply only to recorded source and environment. These commands do not merge or publish:

- `npm run porting:check`: types, committed evidence integrity, preview preparation and Base browser tests.
- `npm run check:pr`: prechecks, production builds and Base browser tests.

Browser cases are classified individually by `scripts/browser-base-cases.json`. Base entries record an actual website-default path or a pinned shadcn-owned test. Full tests are the remaining cases; choosing one Base case does not select the rest of its file or matrix. The selection is not a sample or a count/time target. Mixed edge/primary cases remain Full and gaps are reported in `docs/audits/base-selection.md` rather than filled with new tests.

`node scripts/browser-suite.mjs list --base`, `list --full`, or `list --all` enumerate cases without executing them; add `--json` for inventory data. Plain `playwright test --list` also permits complete inventory collection. `npm test -- --list` lists the ordinary Base selection. The project Playwright config and its pre-execution guard constrain normal and filtered execution to Base tests.

Full execution requires a dedicated GitHub run issue with human-maintainer-applied `full-tests:approved` authorization and a brand-new independent Codex session. A chat message or executor-applied label is not approval. Use `npm run full-tests -- plan`, then follow `docs/agents/full-test-runs.md` for issue creation, maintainer approval, independent dispatch and execution. The old `-Suite pixels` entrypoint remains disabled. Listing Full cases is not execution. Never substitute a direct raw Playwright command or environment flag to evade the gate.

Contributor commands are cross-platform: `npm run dev` starts the website, `npm run registry:serve` builds and serves registry JSON, `npm run check` runs types and evidence integrity checks, and `npm test -- <file-or-filter> --workers=1` filters within Base browser tests. `npm run build` validates and builds both the registry and website. Preparation of generated indexes is included where needed. Typechecking, production builds and non-browser checks are unchanged by browser classification.

Read package scripts for current suite contents. Actual shadcn CLI installation and fresh native captures remain additional gates when relevant; these commands do not perform them. Existing installation receipts apply only to their pinned sources/cases.

The Windows launcher reflects the current maintainer workstation setup: a bounded job, one browser worker, headroom guards and serialized batches. Existing local servers are outside its job: cap them separately, account for their usage and avoid duplicate instances. The workstation's limits are 80% CPU/90% RAM; these are local settings rather than contributor requirements. A resource stop leaves verification incomplete.

Ordinary logs, resource summaries and source-bound results live beneath ignored `test-results/porting/`. Full receipts and claims live under the shared Git common directory, so they survive worktree cleanup and coordinate executors across worktrees. Run focused Base checks while implementing and ordinary Base verification before merge. Pending, incomplete or failed Full results are not merge blockers. Resume unfinished work only when source/environment match; never reuse a pass after its inputs change. A Base pass establishes only the selected cases, not the Full reference matrix.

Fixture, fresh CLI-consumer, and integrated-preview evidence remain distinct. Fixture pixels cannot catch surrounding CSS failures. Additional content, state, locale, viewport and interaction variants remain Full unless an existing case independently qualifies through the explicit Base rules; do not promote the complete matrix into normal verification.
