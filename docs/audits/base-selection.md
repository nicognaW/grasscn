# Base PPT selection review

Base/Full applies only to PPTs. The earlier 57-case catalogue also classified website and behavior checks. Its 45 non-PPT mappings have been removed; those tests run normally in `packages/tests`, together with every other non-PPT case. No case was deleted or promoted to fill the smaller Base catalogue.

The committed main migration snapshot contained 12 Base PPTs, 30,289 Full PPTs and 598 ordinary non-PPT browser cases: the same 30,899 case identities as before the migration. Counts describe this snapshot, not a quota. Browser-only image regressions and behavior-only cases were separated from mixed PPT files; combined native-pixel/behavior assertions remain intact.

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
| input.spec.ts | Input native pixels: input-w200-normal-c39-s2.png | /components/input |
| textarea.spec.ts | Textarea native pixels: textarea-c18-s2.png | /components/textarea |
| separator.spec.ts | Separator native pixels (div): separator-c6-s2.png | /components/separator |
| separator.spec.ts | Separator native pixels (div): separator-c24-s2.png | /components/separator |
| progress.spec.ts | Progress native pixels: progress-c6-s2.png | /components/progress |

## Coverage gaps

A component without a mapped PPT has no focused Base pixel proof, even if its website and interactions pass ordinary tests. Additional captured-reference scales, states, content and stress matrices remain Full unless an individual existing case qualifies under the importance rules. Preserve those limits; do not manufacture a desired Base count or substitute dependency-engine tests for actual shadcn mappings.

## Validation

Use `bun run --cwd packages/pixel-perfect list --all --json` to validate the PPT partition and `bun run --cwd packages/tests test --list --reporter=json` to inspect ordinary non-PPT cases. Listing Full PPTs is not execution or authorization. No Full PPTs were executed for this migration.

## Next/Fumadocs reconciliation

The `354e372` package split is authoritative: normal website and component behavior tests have no Base/Full classification. New Next documentation behavior cases now live in `packages/tests/tests/website`; pure native comparisons live in `packages/pixel-perfect/tests/integration/website`. Whole case blocks were moved without dropping assertions. The foundation case combines native comparison and shell behavior, so it remains one PPT.

The specialized catalogue now retains 11 of main's mappings and 19 source-bound Next PPT mappings. The old Slider `slider-w200-v500-normal-s2.png` mapping is deliberately absent: its captured label is `iIl! MW@09`, whereas the actual documentation default is `Volume: 50%`. The original reference and test remain unchanged outside Base. The newly captured paired Volume reference supplies the exact default case, as documented in [the input audit](next-inputs-documentation.md).

Earlier #12-#21 audit descriptions of behavior Base mappings record their verification snapshots; they do not classify current normal tests. [The migration map](main354-migration-map.json) records file/case ownership, the preserved removal and SHA-256 for all 386 newly relocated native evidence files. No Full PPT was executed. Current full inventory, package installation, types, integrated runtime and independent consumers remain #22 verification work; the historical counts above are not a fresh merged inventory.

## Final #22 adaptation to the committed package boundaries

The old-layout #22 behavior work is preserved in the nested ordinary website/component suites. In particular, the prior five source-reviewed cases covering Label refs/events, Kbd refs, Progress refs, the Date Picker form/close recipe and Dialog keep-open footer composition have no approval gate: their complete original assertions remain ordinary component tests and must execute in normal verification. Their earlier classification discussion is historical and grants no omission, waiver or claim that the current docs block has those additional form/close semantics.

The documentation inventory lives in `packages/tests/src/checks` with its public type declaration and normal unit contract. It reads authored canonical page identities and authoritative registry/group ownership only; Fumadocs retains body, tree, headings and search ownership. Normal website tests use current canonical `/docs` URLs and explicitly scope retained interactive playgrounds separately from primary MDX examples. They do not require or recreate obsolete generated catalog/search files.

The normal and PPT ownership split remains complete. The four mixed documentation files retain their ordinary assertions in `packages/tests/tests/website` and complete captured-reference cases in `packages/pixel-perfect/tests/integration/website`. Preview pixel cases retain their native oracles and conditions; ordinary preview behavior remains independent. Branding now separates source-native integrity from actual HTTP delivery/layout: the former is PPT, the latter is normal. Dead native-comparison helpers left behind by mechanical extraction were removed only after their complete case/helper counterparts were retained in the PPT owner.

Two additional individual PPT mappings carry forward the final #22 default paths: the actual390px documentation240px Preview/Code strip atGUI2 on#202020, and the unchanged intrinsic176x64 header SVG's48px original grass constituent atGUI3 on#202020. Both compare actual production geometry without DOM rewrites and include exact decodedRGBA comparison plus one-pixel negative controls. The header target already has two fresh matching original-renderer launches; this relocation does not regenerate or reinterpret those bytes. The original black/white branding matrix and obsolete Slider label case remain outside Base. Composite SVG badge and whole responsive header remain web adaptations without whole-composition native identity.

The catalogue therefore currently contains32 prepared Base PPT identities (the authoritative30 plus these2); this is source inventory, not an execution result or quota. Independent normal and PPT collection, meaningful normal behavior execution and explicitly selected Base PPTs must be rerun against the final source/environment. No Full PPT was executed for this adaptation. All seven earlier new native families and the `branding-header` family retain their exact relocated bytes and provenance.

## Redstone Lamp display projected references (#45)

`packages/pixel-perfect/tests/redstone-lamp-display/pixels.spec.ts` adds three PPTs: the corpus integrity check, the masked comparison of glyph `0` against its projected reference, and the one-pixel negative control in a temporary copy. All three are Full. Spec #42 names the display demo value `1234` as the lamp's Base mapping, and no website default path shows `0` yet; the header star count (#49) has not landed. Revisit glyph `0` when the header renders the repository's current count of `0` by default, and add `1234` as Base when #46 captures it.

## Redstone Lamp display registry item (#46)

The projected-reference corpus now holds 13 cases: each glyph `0`-`9` and `k` alone, plus `1234` and `12k` (glyph `0` doubles as the `0` case). `pixels.spec.ts` generates one masked comparison per case. Only `redstone lamp display 1234 matches its projected reference within the geometry mask` is Base, mapped to the website default path `/docs/components/redstone-lamp-display#interactive-playground` (the playground default value `1234`, spec #42). Every other comparison, the corpus integrity check and the one-pixel negative control remain Full. The negative control exercises the same fixture route and comparator as the Base case, so no new comparator route was added. The header star count (#49) will show `0` by default; revisit glyph `0` then.

## Firework explosion projected references (#47)

`packages/pixel-perfect/tests/fireworks/explosion-pixels.spec.ts` adds the corpus integrity check, one masked comparison per tick-aligned explosion frame (partialTick 0) at the fixed particle seed, and the one-pixel negative control in a temporary copy. All of them are Full. Spec #42 maps Base to firework frames at each sound-event tick (the blast at tick 2 and the twinkle at tick 18 of this corpus), but no website default path shows the fireworks yet: the header launch and the fireworks demo arrive with #52. Add those individual frames as Base, with their mappings, when #52 lands. The random source unit check (`packages/pixel-perfect/tests/unit/minecraft-random-source.test.ts`) is a harness unit check and runs in ordinary verification.

## Firework rocket projected references (#48)

`packages/pixel-perfect/tests/fireworks/rocket-pixels.spec.ts` adds the corpus integrity check, one masked comparison per tick-aligned frame of the whole rocket sequence (launch to last spark, partialTick 0) at the fixed seeds, and the one-pixel negative control in a temporary copy. All of them are Full. Spec #42 maps Base to firework frames at each sound-event tick; in this corpus those are the launch (tick 1), the blast (tick 26) and the twinkle (tick 42), recorded in the manifest's `sequenceTicks`. No website default path shows the fireworks yet: the header launch and the fireworks demo arrive with #52. Add those individual frames as Base, with their mappings, when #52 lands. The rocket lifetime and sequence unit check (`packages/pixel-perfect/tests/unit/minecraft-firework-rocket.test.ts`) is a harness unit check and runs in ordinary verification.

## Firework sounds (#51)

#51 adds no PPT. The native sound record (`packages/pixel-perfect/tests/reference/firework-sounds/manifest.json`) confirms the sound-event ticks for the declared listener within 10 blocks of the explosion, where no distance delay applies: launch at tick 1, large_blast at tick 26, twinkle at tick 42 of the rocket sequence. The Base mappings to record when #52 adds the website default path (the header launch from the star button and the fireworks demo) are therefore these three individual cases of `packages/pixel-perfect/tests/fireworks/rocket-pixels.spec.ts`:

- `firework rocket tick 1 matches its projected reference within the geometry mask` (launch sound)
- `firework rocket tick 26 matches its projected reference within the geometry mask` (large_blast sound)
- `firework rocket tick 42 matches its projected reference within the geometry mask` (twinkle sound)

They stay Full until #52 records each with its `website-default` route. The website shows the rocket sequence, not a standalone explosion, so the #47 explosion corpus frames (ticks 2 and 18) have no website default path of their own and stay Full unless #52 shows one. Sound playback checks (`packages/tests/tests/components/fireworks/firework-sound.spec.ts`) and the native sound sequence unit check (`packages/pixel-perfect/tests/unit/minecraft-firework-sound.test.ts`) are non-PPT and harness unit checks and run in ordinary verification.

## Nether star GUI item captured references (#50)

`packages/pixel-perfect/tests/nether-star/glint-pixels.spec.ts` compares the header nether star UI port with ordinary captured references of the original 26.2 GUI item render at GUI scale 2 on `#202020`, at the glint times 0, 1250, 4000 and 9000 ms (two launches each, glint clock fixed by `GlintClockAgent`). Only `nether star GUI item at glint time 0 ms matches its captured reference` is Base, mapped to the website default path `/`: every page header draws the star in its star button, and spec #42 names glint time 0 as the Base case. The other glint times, the corpus integrity check and the one-pixel negative control are Full. Verified coverage is the declared glint times only; interpolated glint times between them are unverified, as the corpus manifest's `verifiedCoverage` records. The glint texture matrix unit check (`packages/pixel-perfect/tests/unit/nether-star.test.ts`) is a harness unit check and runs in ordinary verification.
