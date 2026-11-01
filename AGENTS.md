# Grasscn

## Agent skills

### Issue tracker

Track issues and specs in this repository's GitHub Issues. Before issue operations, read `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default triage roles. Before classifying or labeling issues, read `docs/agents/triage-labels.md`.

### Domain docs

Use the single-context layout: root `GLOSSARY.md` and `docs/adr/`. Before codebase exploration, read `docs/agents/domain.md`.

## Workspace commands

Use the pinned Bun package manager and runtime. The website and authored registry live in `apps/web`; shared rendering fixtures, artifact collection, runtime coordination and non-PPT tests live in `packages/tests`; specialized pixel verification, captured references, selection and Full-run policy live in `packages/pixel-perfect`, which consumes the shared interfaces. Run `bunx turbo run generate` before `bunx --bun uncheck` on a fresh checkout. Uncheck owns linting, formatting and typechecking; Turbo owns generation, builds and tests.

## Minecraft UI work

Before porting UI or changing its verified appearance, read `.agents/skills/port-minecraft-ui/SKILL.md`.
Keep the preview local at `http://127.0.0.1:5176/`.
Preserve byte-pinned source and captured references; appearance claims apply only to declared cases.

## Pull request verification

Before reviewing changes, read `CODING_STANDARDS.md`.

Before adding, reviewing or reclassifying Pixel Perfect Tests, read `docs/agents/test-classification.md`.

This project does not use GitHub Actions. Maintainers verify pull requests locally before merging; contributors are not responsible for running the maintainer verification workflow.

Ordinary verification runs non-PPT tests only. Contributors explicitly choose Base PPT checks when appropriate; no automatic rendering-impact detection is used. Non-PPT tests have no Base/Full classification or approval gate. Full PPTs require an individually approved GitHub run issue and an independent execution session; Full results do not block merging. Before planning, dispatching, executing, resuming or reporting a Full run, read `docs/agents/full-test-runs.md`.

Maintainers: before approving a merge, read `.agents/skills/port-minecraft-ui/references/local-verification.md` and verify the proposed merge result locally.
