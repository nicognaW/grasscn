# Base PPT selection review

Base/Full applies only to PPTs. The earlier 57-case catalogue also classified website and behavior checks. Its 45 non-PPT mappings have been removed; those tests run normally in `packages/tests`, together with every other non-PPT case. No case was deleted or promoted to fill the smaller Base catalogue.

The current inventory contains 12 Base PPTs, 30,289 Full PPTs and 598 ordinary non-PPT browser cases: the same 30,899 case identities as before the migration. Counts describe this snapshot, not a quota. Browser-only image regressions and behavior-only cases were separated from mixed PPT files; combined native-pixel/behavior assertions remain intact.

## Retained Base mappings

Each entry retains its existing default-website mapping and reference conditions. Every file/title path must resolve exactly once.

| File | Existing case | Mapping |
| --- | --- | --- |
| preview.spec.ts | Tabs preview preserves native tab bar at scale 2 | /components/tabs |
| preview.spec.ts | Select preview preserves native cycle button at scale 2 | /components/select |
| preview.spec.ts | Radio Group preview preserves native widget pixels at scale 2 | /components/radio-group |
| preview.spec.ts | Switch preview preserves native on/off pixels at scale 2 | /components/switch |
| pixels.spec.ts | vanilla pixels: normal-w200-s2.png | /components/button |
| controls.spec.ts | Control native pixels: checkbox-unchecked-normal-s2.png | /components/checkbox |
| slider.spec.ts | Control native pixels: slider-w200-v500-normal-s2.png | /components/slider |
| input.spec.ts | Input native pixels: input-w200-normal-c39-s2.png | /components/input |
| textarea.spec.ts | Textarea native pixels: textarea-c18-s2.png | /components/textarea |
| separator.spec.ts | Separator native pixels (div): separator-c6-s2.png | /components/separator |
| separator.spec.ts | Separator native pixels (div): separator-c24-s2.png | /components/separator |
| progress.spec.ts | Progress native pixels: progress-c6-s2.png | /components/progress |

## Coverage gaps

A component without a mapped PPT has no focused Base pixel proof, even if its website and interactions pass ordinary tests. Additional captured-reference scales, states, content and stress matrices remain Full unless an individual existing case qualifies under the importance rules. Preserve those limits; do not manufacture a desired Base count or substitute dependency-engine tests for actual shadcn mappings.

## Validation

Use `bun packages/pixel-perfect/scripts/browser-suite.mjs list --all --json` to validate the PPT partition and `bun run --cwd packages/tests test --list --reporter=json` to inspect ordinary non-PPT cases. Listing Full PPTs is not execution or authorization. No Full PPTs were executed for this migration.
