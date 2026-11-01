# Choosing Base and Full tests

Use this guide when adding, reviewing or reclassifying browser tests. The [accepted decision](../adr/0002-base-and-full-tests.md) defines the policy; [CODING_STANDARDS.md](../../CODING_STANDARDS.md) determines whether a test is worth retaining at all. A tautological or redundant test needs removal or improvement, not a place in Full.

## Decide one case at a time

1. Read the whole case, including helpers, inputs and assertions. Its title alone does not establish coverage.
2. Identify a concrete Base mapping: either the default usage shown in a website demo, or an actual test owned by upstream shadcn. Record the website route and relevant behavior, or a commit-pinned shadcn test URL and test title.
3. Keep cases combining that primary behavior with deliberate edge cases or additional variants in Full. Choose another existing pure primary-path case where available; otherwise record the focused coverage gap.
4. Add qualifying cases individually to `packages/tests/scripts/browser-base-cases.json`, with their exact file/title path and mapping evidence. Every browser case outside that catalogue is Full. Selecting one case does not select its file, component family or generated matrix.

When shadcn has no corresponding test, use only the website-default rule. Base UI, DayPicker and other dependency tests are not substitutes for shadcn-owned tests; avoid recreating coverage already owned by those dependencies.

## Examples

| Case content | Classification |
| --- | --- |
| Default Button activation or Checkbox toggling shown in its website demo | Base, with the specific demo mapping |
| Questionnaire validation/navigation corresponding to an actual pinned shadcn test | Base, with the upstream mapping |
| One existing default GUI-scale pixel case matching the website appearance | Base for that case; additional scales and variants stay Full |
| Default OTP editing combined with overlength-input truncation | Full: the existing case mixes the primary path with an edge case |
| Default Spinner animation combined with custom children and click handlers | Full: additional consumer variants share the case |
| Additional CJK corpora, viewport matrices, disabled/custom states or stress scenarios beyond the mapped primary path | Full |

CJK text or a particular state is not automatically an edge case: if the website default itself uses it, judge the case against that actual demo. Likewise, being fast, historically passing, or useful for a recent fix does not establish a Base mapping.

## Keep the selection reviewable

Select by importance, without a runtime target, count quota or per-component allowance. The current count is an outcome, not a cap. A shared page-navigation smoke case establishes page coverage; it does not replace focused interaction or pixel coverage. Record those limitations in [the selection audit](../audits/base-selection.md).

For this cleanup spec (#1), preserve existing cases: do not add, duplicate, split or rewrite tests to manufacture Base coverage. Future features, components and ports should have meaningful new tests; classify each by the same rules and review distinct coverage under the coding standards.

After a catalogue change, use `bun packages/tests/scripts/browser-suite.mjs list --all --json` to check that every mapping resolves once and Base plus Full preserves the inventory. Listing does not execute Full tests. Type checks, builds and non-browser checks remain outside this classification.

For execution, approval and reporting, use [the Full-run lifecycle](full-test-runs.md). Full results do not block merging.
