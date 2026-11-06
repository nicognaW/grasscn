Tautological tests considered harmful.

Pixel Perfect Tests must have an explicit Base or Full classification, decided case by case under the [test-classification rules](docs/agents/test-classification.md) and [accepted policy](docs/adr/0002-base-and-full-tests.md). Review new or changed cases against those rules: Base cases require a recorded qualifying mapping in the Base catalogue; all other PPT cases are Full. Non-PPT tests remain outside this classification and run in ordinary verification, independently of explicitly chosen Base PPTs. Type checks, builds and harness unit checks also retain their ordinary execution.

Follow the [Ultracite skill](.agents/skills/ultracite/SKILL.md) for JS/TS code standards and Uncheck-based linting, formatting and typechecking.

A change that shows a UI port, overlay or effect on the website carries screenshots of the integrated preview (video for motion) at desktop and 390 px widths. Review checks that the element is fully on screen, legible, and recognisable for what it does. Fixture pixel matches do not establish placement.

## Tooling scope and retained evidence

`tooling-scope.ts` records exact reviewed paths. `generatedCode` contains proven generated outputs; their authored producers remain checked and their consumers remain typechecked. `retainedSourceInputs` contains immutable historical copies of authored capture code, not generated code. `retainedEvidenceData` contains reviewed historical machine-observation and proof JSON, plus authored-origin capture inputs whose exact current bytes are bound by retained evidence. Historical layout, glyph and independent-launch records retain their original bytes even when no per-file digest validator exists; listing them does not invent a hash contract or new native coverage. The copied source is outside lint and formatting; the data is outside formatting only. Existing type coverage and integrity validators remain unchanged.

Keep maintained capture runners, fixtures, specs, configuration, documentation and live evidence-transition policy in tooling scope. Do not infer exemptions from a reference/native directory or filename. Format new or changed authored capture inputs before capturing them, then follow the [UI-port workflow](.agents/skills/port-minecraft-ui/SKILL.md) to freeze their evidence. The retained-input list is not a waiver for future case authoring or permission to overwrite captures, rewrite reports or refresh hashes to satisfy a tool. Review exact-list changes against their producer or enforced byte binding; no blanket prefixes or output relocation.
