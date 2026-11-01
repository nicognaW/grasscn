# Base selection review

The catalogue selects 60 existing cases by concrete default website paths or actual shadcn-owned tests. This is a reviewed selection, not a promised count or a generic sample. All other browser cases remain Full. The 60-case selection leaves the existing case pool unchanged.

The existing dedicated-preview navigation case visits all 67 published default component pages and activates the default Button and Checkbox. Focused entries add default control behavior and exact GUI2 appearances where the current pool has an eligible existing case. A display smoke check is not equivalent to focused interaction or comprehensive appearance verification.

Three entries map to exact test titles in shadcn's pinned Questionnaire and MessageScroller browser sources, including validation/navigation, scoped keyboard shortcuts and the scroll-to-end button. No Base UI, DayPicker or other engine-test substitute is used.

## Focused coverage gaps

These published components currently have only the shared default-page smoke coverage in Base, not a separately selected focused case:

- aspect-ratio
- attachment
- avatar
- badge
- button-group
- calendar
- card
- carousel
- chart
- code-block
- combobox
- command
- drawer
- form
- input-group
- item
- marker
- message
- pagination
- player-list
- player-preview
- scroll-area
- sheet
- sidebar
- sign
- sonner
- table
- trace
- typography

Existing candidates for these components combine CJK edits, multiple scales/orientations, disabled/custom/composed variants, rich-content recipes or additional edge scenarios, or establish native constituent coverage rather than the website's default path. They remain Full. No tests are split, duplicated, rewritten or added to fill these gaps. This list is a selection limitation for maintainers to review, not a claim that the components have no tests.

Legacy Accordion, Hover Card and Navigation Menu suites are not selected through the website rule because they are not published standalone demos in the current 67-item website catalogue. Their existing cases remain Full.

Every catalogue entry identifies its own existing file/title path and mapping reason. The catalogue must resolve each entry to exactly one collected case; stale or ambiguous identities are errors. A renamed or newly added describe-group case does not inherit Base status merely by reusing a leaf title.

## Validation

Use browser-suite inventory commands to check the current counts and partition. Full inventory collection does not execute tests or confer approval. No Full tests were executed to construct this selection.
