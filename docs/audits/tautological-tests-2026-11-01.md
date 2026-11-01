# Tautological-test cleanup: 2026-11-01

## Scope

User-authorized removal of tautological tests under `CODING_STANDARDS.md`. The review covered the current test suite, including working-tree migration changes, rather than only a branch diff. Baseline commit: `440879ca95a45a32e8c0ddfdaa639c8d3c84f524`. Standards and Spec were reviewed independently by two agents; the primary agent also inspected Node tests and scanned assertion syntax.

## Standards findings

Removed 13 test declarations generating 25 tests. Each creates a PNG copy, changes one byte, and asserts a local buffer operation or an inline mismatch loop. None invokes the repository comparison path used to accept its browser screenshot. These tests confirm their own construction and cannot detect bypassing the actual acceptance check. They could still fail on dependency or input-file errors; they are not mathematically incapable of failing.

This violates the standard's Observable outcomes rule. The real pixel comparisons remain in place.

| File | Removed title or generated title pattern | Tests |
| --- | --- | ---: |
| tests/adventure.spec.ts | advancement comparator rejects one altered pixel | 1 |
| tests/attachment.spec.ts | Attachment part/directory comparator detects a changed pixel | 3 |
| tests/carousel.spec.ts | Carousel comparator detects one changed pixel | 1 |
| tests/chart-api.spec.ts | Native chart comparator detects one changed pixel | 1 |
| tests/combobox-behavior.spec.ts | Combobox native comparator detects one changed pixel | 1 |
| tests/data-table.spec.ts | DataTable native comparator detects one changed pixel | 1 |
| tests/marker.spec.ts | Marker directory comparator catches one changed pixel | 2 |
| tests/native-expansion.spec.ts | expansion pixel comparator rejects one altered pixel | 1 |
| tests/native-select.spec.ts | directory comparator catches one changed pixel | 2 |
| tests/questionnaire.spec.ts | Questionnaire part/directory comparator rejects one changed pixel | 8 |
| tests/resizable.spec.ts | Resizable arrow comparator rejects one changed pixel | 1 |
| tests/table.spec.ts | Table pixel comparator detects one changed pixel | 1 |
| tests/toast-assets.spec.ts | Toast/Sonner comparator detects a deliberate one-pixel disagreement | 2 |

Comparator controls that call the same comparison function as the browser acceptance checks remain. Those can detect a regression in repository comparison code.

## Spec findings

No additional high-confidence tautological tests were identified outside these controls. Node cache, launch-guard, serving, and path-resolution tests call production code with independent contract expectations. Splash motion compares production output against retained native rendering evidence. Behavior tests observe production components through selection, focus, refs, events, forms, rendering, and sound.

Duplicate cases, tests with no recorded failures, artifact integrity checks, and fixtures supplying input values are not sufficient grounds for removal. All captured references, pixel-matrix cases, workflow commands, resource defaults and behavior tests are retained. No sampling or infrequent-test profile was introduced.

An assertion syntax scan covered 244 test/fixture modules and 2,835 expect calls. It found no direct self-equality assertions, constant-equality assertions, checks that Locator objects are merely defined/truthy, or assertions that element counts are merely nonnegative. This scan supplements the manual review; it is not a proof that all possible semantic tautologies have been detected.

## Validation

- Browser collection: 30,923 before, 30,898 after, zero collection errors. Set comparison found exactly the 25 comparator removals and no added or other removed test identities.
- TypeScript check passes.
- All 22 Node tests pass, including the independently sourced splash-motion checks.
- The full browser suite was not executed for this deletion-only change. This is not a fresh merge-verification receipt.

No commits or public changes were made.

## Deeper second review

The user requested a deeper pass after the initial cleanup. The reviewers traced tests through fixtures and production components, rather than searching only for assertion syntax or comparator titles.

### Additional Standards finding: setup-only scale assertions

`tests/preview-text-style-repair.spec.ts` contained:

```ts
async function scale(page: Page, value: number) { expect(value).toBe(2) }
```

Four callers supplied the value from a literal `[2]` loop. The helper did not read the page, change its scale, or observe any component. Running the actual helper extracted from the source succeeded with both a null page and a Proxy that throws on every page-property access; the property-read count was zero.

Removed this helper and its four calls. Removed the now-unused single-value loop bindings while retaining their lexical blocks. All five surrounding tests and their real rendering, layout, input, scrolling, and interaction assertions remain. There are no additional whole-test removals in this pass.

### Causal checks of the remaining controls

The Standards reviewer parsed 170 browser spec/helper modules and verified that all remaining 48 comparator declarations call functions also used by screenshot acceptance. These declarations generate 61 controls.

A separate browser-free mutation experiment loaded 56 relevant spec modules and their local helpers from the current source. Test registration and assertions were supplied by a small harness; unrelated production imports were stubbed. The experiment ran only comparator callbacks, not page fixtures or browser tests:

| Experiment | Passed | Failed | Module-load errors |
| --- | ---: | ---: | ---: |
| Actual comparison helpers | 61 | 0 | 0 |
| Same helpers replaced with zero-difference results | 0 | 61 | 0 |

These results establish that the remaining controls can reject a broken comparison function. They do not independently validate the browser capture pipeline or component rendering.

### Expected-output and fixture review

- The fixture-wide search found no reads of expected/captured-reference image files. Actual output is not made by loading the expected screenshot.
- Asset and provenance expectations were traced to native inventory hashes, recorded atlas observations, retained full frames and independent-launch captures. These integrity checks remain.
- Stress and temporal tests were traced through GPU context lifecycle, forced context loss, viewport backdrop capture, opacity, first-frame layout, and actual input changes. Those checks remain.
- The Spec reviewer covered 62 behavior, preview, API, integration and Node files. It traced structural, text/chat, forms, Calendar, Map, Trading, Player List and custom-component routes into real exported components, hooks, callbacks and refs.
- Automatic-versus-explicit player-model checks remain as a normalization contract, not native appearance proof. Shared fixture inputs and browser-derived before/after results alone do not make a test tautological.
- No additional high-confidence whole-test tautologies were identified. Duplicate corpora and ignored-state variants remain separate coverage findings; they were not deleted under this request.

### Second-pass validation and scope

Typechecking passes. Browser discovery before and after this pass contains the same 30,898 test identities with zero collection errors. The four self-confirming assertion calls are gone. The full browser suite was not executed. No test profiles, sampling, reference artifacts, workflow commands, resource defaults, production components or concurrent migration edits were changed by this pass.

Across both authorized passes, the cleanup removed 25 standalone self-fulfilling controls and four setup-only assertion calls. The additional finding is one Standards violation affecting four tests; the Spec review found zero additional whole-test removals.
