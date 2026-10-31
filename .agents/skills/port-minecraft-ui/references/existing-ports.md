# Existing ports and reusable boundaries

Paths are relative to the Git root. Read the files themselves for current commands and verified coverage. Choose an existing port with the same rendering or interaction needs; component-specific dimensions and cases are not defaults for another port.

## Reuse by boundary

| Boundary | Existing material | Adaptation rule |
| --- | --- | --- |
| Coverage and provenance | `registry/minecraft-map.json`, `tests/reference/` | Start with the selected component's captured references, conditions and limitations. Preserve existing evidence when adding cases. |
| Capture launch | `tests/reference/capture.mjs`, `tests/reference/capture-controls.mjs` | Reuse isolation, source identity, stabilization, exact crops and separate output directories. Each harness and artifact pin has a declared scope. |
| Component-specific capture | `tests/reference/*/source/ControlsReferenceMain.java` | Adapt the relevant original Minecraft element, content and input sequences. Retain source and repeatability evidence. |
| Pixel comparison | `tests/pixels.spec.ts`, `tests/adventure.spec.ts`, `tests/native-expansion.spec.ts` | Reuse strict decoded-RGBA comparisons and failure artifacts; adapt the locator and case schema. |
| Interaction sequences | `tests/advancement-gestures.spec.ts`, `tests/trading-scroll.spec.ts`, `tests/player-custom-skin.spec.ts` | Exercise the public API, transitions, competing gestures, burst input and content replacement. Read `interactions.md` for applicability. |
| Rendering investigations | `tests/reference/label/glyph-probe/`, `tests/reference/player-preview/model-probe/`, `tests/reference/map/atlas-probe/` | Use targeted original-renderer probes to explain glyph, float, atlas and projection disagreements. See `rendering.md`. |
| Generated data | `tests/reference/map/demo-world/` | Verify frozen input, independently repeated generation and renderer output as separate links. See `dynamic-data.md`. |
| Registry installation | `registry.json`, `public/r/`, component installation reports | Build and install through the actual shadcn CLI in a separate consumer. Include every required resource; keep helper guarantees distinct from component guarantees. |
| Integrated preview | `preview/demos.json`, `preview/demos/`, `tests/native-expansion-preview.spec.ts` | Add a realistic working demo and verify surrounding layout and connected controls at desktop/mobile widths. |
| Local verification | `package.json`, `scripts/run-porting.ps1`, `scripts/verify-porting.mjs` | Use guarded local suites and source-bound receipts. See `local-verification.md` for scope and merge checks. |
| Domain and decision | `GLOSSARY.md`, `docs/adr/0001-captured-references.md` | Use the current terms and captured-reference acceptance decision. |

## Useful Button rendering findings

Button remains a reusable component example, with its current case list and guarantees defined by the mapping and evidence rather than this guide.

- Normal/highlighted sprites have 3-pixel nine-slice borders; disabled has a 1-pixel border. Parse each asset's metadata independently.
- Sprite interiors tile and clip. Stretching them changes texture placement at resized widths.
- Enabled hover and focus share a highlighted sprite; disabled takes precedence. Original bitmap advances and integer centering determine text placement.
- `buttonVariants()` is a standalone styling helper with different rendering guarantees. Its web-font fallback does not inherit the component's verified coverage.
- Loading completion alone did not eliminate overlay fades. Capture stabilization includes overlay removal and stable time/frames.
- CSS cascade-layer order affects installed components. Test the real consumer stylesheet order alongside the fixture.

## Versions and environment

Current captured references identify Minecraft Java Edition 26.2 from the artifact's own metadata. The supplied installation includes Fabric/mods; captures launch the original game entry point with controlled resources. These are source-provenance facts, not a restriction of the project's broader supported-version scope.

Capture commands accept the selected version and Java directories through arguments or environment variables. Read the relevant launcher before use. Keep runtime/output directories isolated and preserve the source artifact pin. Extending verified coverage to another version requires inspected resources and new captured references rather than bypassing an existing pin.

Consumer installation and ordinary browser regressions use the packaged assets and committed captured references. They do not require the developer's Minecraft path.

## Specialized tools

Run these directly when needed; they are not routine package commands:

- `node tests/reference/capture.mjs <version-directory> <java-bin>` captures Button reference cases.
- `node tests/reference/capture-controls.mjs <version-directory> <java-bin> [case-file]` captures the selected control corpus.
- `node scripts/verify-reference-repeat.mjs <first-capture-directory> <second-capture-directory>` checks independently captured outputs.
- `node scripts/generate-assets.mjs <extracted-asset-directory>` generates the foundational Button/font assets; it is not a complete registry asset rebuild.
- `node scripts/check-map.mjs --list` lists component mappings.

Read the corresponding script for additional inputs and scope. Capturing or regenerating a particular corpus does not establish verified coverage for the entire registry.
