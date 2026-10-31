# Grasscn

## Agent skills

### Issue tracker

Track issues and specs in this repository's GitHub Issues. Before issue operations, read `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default triage roles. Before classifying or labeling issues, read `docs/agents/triage-labels.md`.

### Domain docs

Use the single-context layout: root `GLOSSARY.md` and `docs/adr/`. Before codebase exploration, read `docs/agents/domain.md`.

## Minecraft UI work

Before porting UI or changing its verified appearance, read `.agents/skills/port-minecraft-ui/SKILL.md`.
Keep the preview local at `http://127.0.0.1:5176/`.
Preserve byte-pinned source and captured references; appearance claims apply only to declared cases.

## Pull request verification

This project does not use GitHub Actions. Maintainers verify pull requests locally before merging; contributors are not responsible for running the maintainer verification workflow.

Maintainers: before approving a merge, read `.agents/skills/port-minecraft-ui/references/local-verification.md` and verify the proposed merge result locally.
