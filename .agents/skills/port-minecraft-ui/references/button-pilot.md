# Button pilot: evidence and reusable boundaries

Paths in this reference are relative to the repository root. Consult the files themselves for current commands, manifests, and implementation details.

## Reuse by boundary

| Boundary | Existing files | Adaptation rule |
| --- | --- | --- |
| Native capture | `tests/reference/ReferenceMain.java`, `tests/reference/capture.mjs` | Reuse isolation, source identity, stabilization, cropping, and output-directory support. Add the actual native element and its state/value inputs. The current harness is pinned to one JAR and Button cases. |
| Reference provenance | `tests/reference/manifest.json`, `tests/reference/asset-provenance.json` | Preserve existing Button references. Give other elements distinct case identities and provenance; extend the manifest/loader deliberately or use an element-specific directory. |
| Pixel comparison | `tests/pixels.spec.ts` | Reuse strict decoded-RGBA comparison and actual/diff/metrics artifacts. The current fixture locator and case schema are Button-specific. |
| Web behavior | `tests/button.spec.ts`, `tests/fixture/` | Exercise the new primitive's public interactions. The fixture is test infrastructure, not a product website. |
| Asset conversion | `scripts/generate-assets.mjs` | This generator consumes extracted Button textures, their metadata, and ASCII font assets. Its asset names, dimensions, and provenance are specific to the pilot; inspect and adapt them before using it for another source. |
| Installed component | `registry/ui/button.tsx`, `registry/ui/minecraft-button.css`, `registry/ui/minecraft-assets.css`, `registry/ui/minecraft-font.ts` | Reuse the techniques that match native evidence. Shared styling must retain existing verified output. |
| Registry payload | `registry.json`, `public/r/` | Update item files/dependencies and rebuild. Verify via actual CLI installation, including stylesheet imports and embedded resources. |
| Scope decisions | `GLOSSARY.md`, `docs/adr/0001-native-pixel-oracle.md` | Existing Button scope stays in force unless the user changes it. |

## Discoveries that changed the implementation

- The artifact's own `version.json` identifies Minecraft Java 26.2. The surrounding Everything Voxy installation includes Fabric/mods, so native reference capture launches the vanilla entry point with controlled settings.
- Normal and highlighted Button sprites use 3-pixel nine-slice borders; the disabled sprite uses a 1-pixel border. Applying one sprite's metadata to every state produced real pixel failures at resized widths.
- These sprites tile and clip their interiors. Stretching the center changes texture placement, especially beyond the source width.
- Enabled hover and focus share the highlighted sprite; disabled wins. Enabled text/shadow are `#FFFFFF` / `#3F3F3F`, disabled are `#A0A0A0` / `#282828`, with shadow offset one logical pixel.
- Native text uses integer centering and original bitmap advances. A matching outline font still acquired browser rasterization differences. `Button` therefore uses original bitmap glyph masks plus real accessible label text.
- `buttonVariants()` is also a public shadcn styling helper. It needs a usable standalone skin. Its web-font and resized-background fallback is outside the exact pixel guarantee; the component supplies the verified rendering path.
- Initial native screenshots included a loading-overlay fade despite the game reporting loading complete. The harness now waits for overlay removal and stable time/frames and rejects contaminated captures. Repeated clean native launches reproduced the reference pixels.
- CSS loaded before Tailwind can establish the wrong cascade-layer order. The component stylesheet declares the layer ordering so resets do not override its font and colors; consumer utilities can still customize it.

## Scope of the established evidence

The pilot established exact comparisons for the default Button variant at integer scales 1–3 in Edge with device pixel ratio 1. The matrix includes normal/hover/focus/disabled cases at several widths and printable ASCII coverage. The manifest, browser config, and test results are authoritative for the current case list and environment.

This evidence does not prove outline/destructive/other variant fidelity, arbitrary rich children, non-ASCII glyphs, fractional scaling, or another browser environment. Extend the relevant native cases and web tests before expanding a claim.

## Running the existing harness

Read the current scripts in `package.json`. The existing capture script takes the selected version directory and Java bin directory as positional arguments, or `MINECRAFT_VERSION_DIR` and `MINECRAFT_JAVA_BIN`. `MINECRAFT_REFERENCE_WORK_DIR` isolates runtime files; `MINECRAFT_REFERENCE_OUTPUT_DIR` redirects both captures and manifest for repeatability checks. Pass absolute paths for these inputs.

The source-JAR digest check is intentional. A new Minecraft version needs its own inspected assets/rendering rules and reference identity; bypassing the pin does not establish compatibility. Native capture needs the matching local assets/libraries and Java runtime. Consumer installation and ordinary browser regression tests use the embedded registry assets and committed references, without a Minecraft installation.
