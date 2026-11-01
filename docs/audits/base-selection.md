# Base selection review

The catalogue selects 57 existing cases by concrete default website paths or actual shadcn-owned tests. This is a reviewed selection, not a promised count or a generic sample. All other browser cases remain Full. The 57-case selection leaves the existing case pool unchanged.

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
- data-table
- drawer
- form
- input-group
- input-otp
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
- spinner
- table
- trace
- typography

Existing candidates for these components combine CJK edits, multiple scales/orientations, disabled/custom/composed variants, rich-content recipes or additional edge scenarios, or establish native constituent coverage rather than the website's default path. They remain Full. No tests are split, duplicated, rewritten or added to fill these gaps. This list is a selection limitation for maintainers to review, not a claim that the components have no tests.

The InputOTP keyboard case also checks length overflow; the DataTable recipe includes rich cells and caller-owned state; the Spinner case includes custom children and events. These mixed cases remain unchanged in Full. The current partition is 57 Base and 30,842 Full out of 30,899 existing cases.

Legacy Accordion, Hover Card and Navigation Menu suites are not selected through the website rule because they are not published standalone demos in the current 67-item website catalogue. Their existing cases remain Full.

Every catalogue entry identifies its own existing file/title path and mapping reason. The catalogue must resolve each entry to exactly one collected case; stale or ambiguous identities are errors. A renamed or newly added describe-group case does not inherit Base status merely by reusing a leaf title.

## Validation

Use browser-suite inventory commands to check the current counts and partition. Full inventory collection does not execute tests or confer approval. No Full tests were executed to construct this selection.

## Next/Fumadocs foundation

Spec #12 adds one independently classified Base case: `next-foundation.spec.ts` / `the default MDX component page renders within the Minecraft website shell`. Its website-default mapping is the new `/docs/components/button` route: authored MDX content, the shared navigation, Minecraft typography and the displayed default Button at its retained `normal-w200-s2.png` reference conditions. The case compares the actual integrated Button against that independent captured reference; it does not promote further Button variants, scales or the rest of the file into Base.

This is new feature coverage outside cleanup spec #1. Earlier partition counts above describe that cleanup snapshot; use the current inventory for the new total. New or revised primary examples elsewhere must receive their own case-by-case mapping review.

## Matching example and source experience

Ticket #14 adds two individually mapped Base cases on `/docs/components/button`: `docs-examples.spec.ts` / `Button documentation connects its executable example, complete code and implementation source`, and `docs-example-pixels.spec.ts` / `default documentation code controls match their Minecraft reference cases`.

The first follows the ordinary primary example through keyboard Preview/Code selection, complete example copying and the separately labelled implementation's collapsed Copy and Expand/Collapse controls. The second selects only six scale-2 native constituents encountered by that default journey: normal Preview strip, keyboard-focused Code strip, normal Copy, the actual highlighted client directive, normal Expand and normal Collapse. Other captured scales/states are not selected by these entries.

The existing foundation case now scopes its retained normal Button comparison to the primary example because the playground remains as an additional example. Its existing 390px mobile composition also asserts that code overflow remains inside the code view rather than extending the page. These changes preserve an actual default path and its native geometry without promoting a component matrix. See [the evidence record](docs-examples-2026-11-01.md) for exact cases and remaining integration gates.
# Next/Fumadocs website migration (#22)

Canonical component navigation now uses `/docs/components/<name>`; the page inventory reads authored MDX page identities and authoritative registry/group ownership only. Fumadocs continues to own documentation rendering, tree, headings and search. Import-time legacy generated catalog/search files are no longer collection prerequisites. The formerly grouped Field, Bubble and Message Scroller are independent documentation pages while retaining their Form/Message installation identities.

Existing preview interaction and pixel cases target the retained additional interactive playgrounds, scoped separately from each copied primary MDX example. Their recorded dimensions/content/states are preserved; migrating a route does not establish pixel coverage for the new primary example or whole documentation page. The old assertion that grouped public parts must not have pages has been replaced by independent discoverability and truthful installation ownership. Native source assets/captured references remain byte pinned.

One new Base case covers the actual390px Button documentation Preview/Code default and normal selected states. Production compact240px geometry matches the existing independently captured120logical GUI2 Preview/Code cases on#202020. The test checks both controls are visible without sideways scrolling, uses actual interaction and compares exact decoded RGBA while retaining actual/diff/metrics and a rejected one-pixel mutation. Other viewport/state/content combinations remain outside this mapping. All unmapped cases remain Full; collection is not Full execution.

The following five inherited Base entries were reviewed against their entire assertions and the actual current examples, then corrected to Full under classification-guide step3. This decision preceded browser execution and is not a failure waiver. Their test files, titles and assertions remain intact; no Full execution is authorized:

| Existing case | Extra consumer variant beyond actual website default | Actual default coverage retained |
| --- | --- | --- |
| `dialog-behavior.spec.ts` / `Dialog footer actions and close preserve their public behavior` | Fixture Continue increments its action count while leaving the dialog visible, followed by Done to close. Actual `demos/dialog.tsx` Continue calls setSaved and setOpen(false), with Cancel/Continue footer; the primary controlled example also closes explicitly. | `overlay-documentation.spec.ts` checks actual primary confirmation callbacks, one update, close and focus return. The keep-open footer composition remains Full; no pinned shadcn-owned mapping was found. |
| `calendar-behavior.spec.ts` / `DatePicker opens by keyboard, selects value, submits form text and restores focus` | Requires immediate popup closure on day selection and `input[name=date]` submission. The installed `registry/blocks/date-picker.tsx`, the primary `examples/overlays/date-picker-example.tsx` and retained `demos/date-picker.tsx` neither create that hidden form field nor automatically close on selection. | `overlay-documentation.spec.ts` checks actual DayPicker10 selection, persistent popup, Escape and focus return. Hidden form submission and automatic close remain separate consumer variants. |
| `label.spec.ts` / `Label associates its input, forwards its ref and preserves events` | Clicks fixture `#read-ref` and asserts `Root ref=LABEL` plus `Activations=1`. Primary Label and retained `demos/label.tsx` expose associated fields and label editing without ref/event inspection controls. | `docs-inputs.spec.ts` verifies real primary label association and editing. Ref/event probes remain Full. |
| `text-components-behavior.spec.ts` / `Kbd exposes keyboard semantics and refs without inventing button semantics` | Includes fixture `#read-ref` to inspect `#tag=KBD`; primary and retained `demos/kbd.tsx` show passive key/chord labels without this probe. | Layout documentation covers the actual Kbd page/example/source, whose authored usage explicitly describes passive keyboard labels; the existing fixture ref variant remains Full. |
| `progress-behavior.spec.ts` / `Progress exposes controlled values and completion semantics` | Starts at25 rather than actual default50 and combines completion with fixture `#read-ref`/`Root ref=DIV`. Retained `demos/progress.tsx` has value, color and notch controls without a ref inspector. | `layout-documentation.spec.ts` checks actual primary completion and its default half-filled native pixels. Ref inspection and the25-value recipe remain Full. |

All remaining inherited website-default fixture mappings were checked against the current primary examples or retained playground controls. Historical `/components` citations now identify canonical docs and the retained interactive-playground section where that is the actual justification. Explicit legacy-link tests retain their old URL because compatibility itself is their subject. No shadcn-owned mapping or fixture case identity changed.


### Branding boundary and remaining visual gap

`preview-branding.spec.ts` remains wholly outside Base. Its source-asset check independently compares the SVG-embedded48px grass image composited on the original black background with the retained scale3 Minecraft capture, separately from production DOM. The header check observes the actual132x48 logo, keeps a screenshot and checks exact served SVG/favicon bytes; it never rewrites element geometry or background. The authored SVG intrinsic size is176x64 with48x48grass at(0,8), so the current132x48header displays36pxgrass (fractional2.25scale). Retained native branding cases cover scales1/3 onblack/white, not this geometry/context. Actual integrated-header zero-RGBA coverage therefore remains an explicit acceptance gap. Preserved source bytes and native asset provenance do not establish that missing integrated match, and the hard visual goal is not lowered. No Full execution was performed for this correction.

### Intrinsic branding geometry correction (#22)

The earlier132x48 header downscale is replaced in production by the unchanged byte-pinned SVG at its intrinsic176x64 dimensions, with `flex:none` so narrow headers cannot shrink it. Its grass image therefore occupies48physical pixels (16logical atGUI3), with integer bounds. Existing Full branding delivery/layout expectations follow this actual geometry and remain unexecuted under the Full policy.

A new pure Base case, `docs-header-branding.spec.ts` / `default header grass at intrinsic SVG size matches original Minecraft GUI3`, selects only the actual default1536x900/DPR1 header grass constituent on#202020. The independent native family `branding-header` adapts the historical original renderer harness (originalsourceSHA256587402ae9e021df94109c3db697d7e52eba13c63a9f5f42abc83eca9c77dde25) to that oneGUI3/backgroundcase; it preserves original and adapted source, case definition, two isolated launches, complete frames, crops and SHA256/decodedRGBA identities. The browser uses actual unchanged SVG crop bounds, preserves actual/diff/metrics and rejects a deliberate one-pixel mutation through the same comparator. No old Full black/white/scalematrix case is promoted.

Until the two fresh native launches, exact integrated browser comparison and desktop/mobile layout review have completed on the final snapshot, these are prepared acceptance inputs rather than a pixel-perfect pass. Even after a grass constituent pass, the composite grass/cn badge and complete responsive header remain web adaptations without whole-composition native pixel identity; screenshots and truthful scope remain required.

Native preparation completed: both fresh launches passed with identical full-frame and crop decodedRGBA (see `packages/tests/tests/reference/branding-header/manifest.json` and `execution.json`). OriginalJAR remains40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290; adaptedJava sourceaeb1b8a04a40d6edd5179c49313e362cbce38bea65737ade2a1efceb3cceb814; case68b5be3e64155bbeebce15e4874c08acb9b27a1acdc24b32166523b62d1205c9. Guard10% completed withCPU62.32%/RAM76.53%peaks and8 automatic headroom pauses; owned Java exited. SVG source/publicSHA256 remains78576f26114a3f83b72d81e698979e140d2331d2946ae4f6411adc2ed8e78888. This establishes the new native target and repeatability only. Actual integrated browser pixels and responsive layout are still pending final verification.
