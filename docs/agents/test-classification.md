# Choosing Base and Full PPTs

Use this guide when adding, reviewing or reclassifying Pixel Perfect Tests. The [accepted decision](../adr/0002-base-and-full-tests.md) defines the policy; [CODING_STANDARDS.md](../../CODING_STANDARDS.md) determines whether a test is worth retaining. A tautological or redundant test needs removal or improvement, not a place in Full.

## Decide the purpose first

PPTs compare UI ports with captured Minecraft references or verify the integrity of that comparison: original asset bytes, provenance, repeatability and comparator negative controls. Keep those cases and their harness in `packages/pixel-perfect`.

Website navigation, search, copying, component interactions, API contracts and browser-only rendering regressions belong in `packages/tests`. Using Playwright, taking a screenshot or decoding a PNG does not make a case a PPT. These non-PPT tests run normally alongside Base PPTs, including variants and stress cases; they require neither Base mappings nor Full approval.

A case checking both a captured reference and behavior remains a PPT. Separate behavior-only cases from mixed files without duplicating or dropping assertions. Classify each PPT by purpose and importance, never its filename alone.

## Select individual PPT cases

1. Read the whole case, including helpers, inputs and assertions.
2. Identify a concrete Base mapping: the default appearance shown in a website demo, or a corresponding actual test owned by upstream shadcn. Record the route and reference conditions, or a commit-pinned shadcn test URL and title.
3. Keep PPTs combining the primary path with deliberate edge cases or additional variants in Full. Choose another existing primary-path PPT where available; otherwise record the coverage gap.
4. Add qualifying cases individually to `packages/pixel-perfect/src/selection/base-cases.json`, with their exact file/title path and mapping evidence. Every other PPT is Full. Selecting one case does not select its file, component family or generated matrix.

When shadcn has no corresponding test, use only the website-default rule. Base UI, DayPicker and other dependency tests are not substitutes for shadcn-owned tests. Avoid recreating dependency-owned behavior coverage.

| Case | Treatment |
| --- | --- |
| Existing default GUI-scale captured-reference comparison matching the website appearance | Base PPT, with its mapping |
| Additional captured-reference scales, states or CJK matrices | Full PPT unless the individual case independently qualifies |
| Comparator mutation or reference-integrity check | PPT suite; apply the same individual Base mapping rules |
| Website search, copying or component keyboard interaction | Ordinary non-PPT test, including its variants |
| Comparison between browser states without a captured Minecraft oracle | Ordinary non-PPT regression test |

Judge CJK text and states against the actual default demo. Being fast, historically passing or useful for a recent fix does not establish a Base mapping. Select by importance without runtime targets, count quotas or sampling. Navigation smoke coverage does not establish pixel coverage; record limitations in [the selection audit](../audits/base-selection.md).

The original cleanup spec (#1) prohibited manufacturing Base coverage with new or rewritten cases. This later package/policy migration preserves the complete inventory while moving behavior-only cases out of PPT files. Future features and ports should add meaningful tests under the coding standards.

After catalogue changes, use `bun packages/pixel-perfect/src/selection/suite.mjs list --all --json` to verify every mapping resolves once and Base plus Full covers the PPT inventory. Use `bun run --cwd packages/tests test --list --reporter=json` for the independent non-PPT inventory. Listing never executes Full PPTs. Type checks, builds and harness unit checks remain ordinary prechecks.

For execution, approval and reporting, use [the Full-run lifecycle](full-test-runs.md). Full PPT results do not block merging.
