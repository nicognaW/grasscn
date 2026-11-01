# Rendering investigations

Use intermediate native probes to explain edge disagreements before tuning constants.

## Glyph loading context

For Unihex text, observe baked glyph UVs in the same native loading context as the reference cases. Atlas allocation depends on earlier text: Label's printable-ASCII cases allocate a different atlas from the Input/Button matrices, producing measurable scale-3 shadow differences despite identical source glyphs. Retain the observation harness and atlas coordinates, and confirm instrumentation preserves the reference pixels. `packages/pixel-perfect/tests/reference/label/glyph-probe/` records this check; `packages/pixel-perfect/src/native/generate/generate-label-atlas.mjs` derives Label's coordinates. Scope exact sampling claims to the observed glyphs and loading context.

If independent launches differ at fractional glyph positions, compare glyph UVs observed **after all screenshots** in both launches. Startup/menu font-cache history can change atlas placement even with identical resources; a later observation cannot cause an earlier pixel difference. For new captured-reference corpora, the original `FontManager.updateOptions(client.options)` called once after startup/resources settle and before installing the test screen resets font textures and glyph caches while preserving providers/options. Pin that loading context, class/method identities and case order, then require full-corpus repeat equality with observation enabled/disabled. Item's 180 cases and Toast's 528 cases prove this normalization; retain `font-context.json` with each corpus. Keep previously verified references and their font contexts intact.

## Alpha and compositing

For translucent textures, preserve decoded original RGBA as well as PNG bytes. Browser premultiplication can change low-alpha RGB values: Progress notch pixels `(2,2,2,64)` caused one-level color differences. If needed, upload the original RGBA directly and reproduce the native source-alpha blend order. Retain transparent corners/padding so the painter preserves underlying UI; `minecraft-progress-paint.tsx` and its transparency regression cover this path.

## Precision and texture atlases

Player Preview required JOML float operation order and cosFromSin; direct cosine left an Alex seam at exactly 180 degrees. Map decorations needed half-pixel placement, a vertical texture flip and native atlas padding. Inspect projection, quaternion construction, per-part transforms, blend/depth order, atlas bounds and nearest sampling. Probe vertices/UVs before comparing entire images. Include exact half-turns and extrema.

Retain probe source and prove instrumentation preserves native output. See tests/reference/player-preview/model-probe/, player-preview/custom-skins/, and map/atlas-probe/. Scope conclusions to the actual raster environment.
