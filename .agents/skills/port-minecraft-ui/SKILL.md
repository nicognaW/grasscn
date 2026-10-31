---
name: port-minecraft-ui
description: Port Minecraft Java UI elements into this shadcn registry using original assets and rendering evidence, then verify pixels against independent vanilla captures. Use when adding a Minecraft-styled component or extending its verified states, sizes, glyphs, or environments.
---

# Port Minecraft UI

Produce a shadcn component whose appearance matches the selected vanilla element in an explicit set of reference cases. Keep shadcn APIs and accessible web interactions. This is a porting and verification workflow, not a claim that any widget can be converted automatically.

Resolve repository paths below from the Git root. Read `GLOSSARY.md`, relevant ADRs, `registry.json`, and current package scripts before changing the component. The repo includes a maintained local-only preview; completing a component also means updating its working demo. The user explicitly prohibited online hosting and publication.

## 1. Define the reference cases

Use existing user decisions first. Record the element, Minecraft edition/version, source artifact, target shadcn primitive/API, and intended default dimensions. A modpack name is not the vanilla version: inspect the JAR's own metadata and identify mods or resource packs that could change the reference.

For each accepted case specify:

- Value/content, visual state, logical dimensions, GUI scale, locale, font settings, and background/compositing context.
- Browser/version, viewport, device pixel ratio, zoom, and theme for the web capture.
- Relevant state dimensions: hover/focus/disabled for controls; selection/check state for toggles; value, thumb position, and drag state for sliders; clipping/scroll position for containers. Include only those applicable to the element.
- For animated or time-dependent elements, a reproducible time/frame and the inputs or seed that determine it.

Carry forward previously verified cases when extending a component. Report unsupported variants or environments explicitly; the Button pilot's dimensions, ASCII scope, and test count are not defaults for other elements.

**Ready when:** every promised appearance maps to a reproducible native case and a matching web case. A missing reference is unresolved coverage.

## 2. Recover assets and rendering rules

Inspect the supplied artifact read-only. Use available REA archive tools for artifact identity/inventory and focused bytecode disassembly or decompilation for Java rendering methods. If REA is unavailable, use available local archive/disassembly tools and record that provenance accurately. Runtime captures remain necessary for runtime claims.

Record the artifact SHA-256, original member paths and hashes, and the classes/methods that establish each rendering rule. Determine:

- State-to-sprite selection, including precedence when states overlap.
- Each sprite's own metadata: scaling mode, dimensions, borders, tiling/stretching, clipping, sampling, tint, and alpha. Parse metadata per asset.
- Layout arithmetic, rounding, minimum dimensions, text placement, glyph advances, shadows, and overflowing-content behavior relevant to the cases.
- Runtime dependencies such as theme, locale, parent screen, GUI scale, and animation timing.

Preserve original texture bytes wherever practical. Separate observations, inferences, and unknowns. Read [the Button pilot evidence and reusable files](references/button-pilot.md) when adapting the existing implementation or investigating pixel mismatches.

Resolve effective resources through the version's asset index as well as the JAR. Indexed fonts and sound definitions can override empty JAR placeholders. Verify object SHA-1 against the index and record SHA-256 for the bytes used. For interaction audio, use the original game's sound asset, resolve its event through effective `sounds.json`, and recover trigger timing, pitch and volume from the widget and sound-instance methods. Do not synthesize replacement clicks or add sound to silent interactions. `scripts/generate-sound-assets.mjs` and `tests/sound.spec.ts` establish this path for `ui.button.click`.

**Ready when:** the chosen appearance can be explained from assets plus rendering rules, with remaining unknowns assigned to native observation.

## 3. Capture an independent native oracle

Run the original vanilla renderer in an isolated game directory with controlled settings and the required Java runtime/libraries. A test-only screen may supply layout, content, and state; the actual Minecraft element, font, and rendering pipeline must produce the expected pixels. Keep the user's game installation and saves intact.

Adapt the existing native harness for the new element rather than replacing it with a hand-painted approximation. Retain full frames as provenance, then crop exact element bounds without resizing or recoloring. For transparent elements, use identical controlled backgrounds in both renderers and identify the comparison as composited pixels.

Wait for loading overlays to disappear and for both stable frames and stable elapsed time after transitions. Validate a known background/sentinel outside the element so a fade or overlay cannot become a baseline. Guards must fit the element: grayscale checks suit the current gray Button, not colorful widgets. Ensure no unrelated pointer, toast, tooltip, or cursor contaminates the crop.

Save a manifest with case inputs, source/harness identities, runtime/settings, image dimensions, and capture hashes. Capture again in a separate native launch and output directory. Require identical decoded pixels per fixed case; keep file hashes for integrity. If results vary, isolate the cause or mark the case unverified before using it as an oracle.

Browser snapshots and reconstructed renderers may supplement debugging, but they cannot establish vanilla fidelity. If the native runtime cannot be exercised, continue useful static work and report native verification as incomplete.

For Unihex text, observe baked glyph UVs in the same native loading context as the reference cases. Atlas allocation depends on earlier text: Label's printable-ASCII cases allocate a different atlas from the Input/Button matrices, producing measurable scale-3 shadow differences despite identical source glyphs. Retain the observation harness and atlas coordinates, and confirm instrumentation preserves the reference pixels. `tests/reference/label/glyph-probe/` records this check; `scripts/generate-label-atlas.mjs` derives Label's coordinates. Scope exact sampling claims to the observed glyphs and loading context.

If independent launches differ at fractional glyph positions, compare glyph UVs observed **after all screenshots** in both launches. Startup/menu font-cache history can change atlas placement even with identical resources; a later observation cannot cause an earlier pixel difference. For new Java 26.2 corpora, the original `FontManager.updateOptions(client.options)` called once after startup/resources settle and before installing the test screen resets font textures and glyph caches while preserving providers/options. Pin that loading context, class/method identities and case order, then require full-corpus repeat equality with observation enabled/disabled. Item's 180 cases and Toast's 528 cases prove this normalization; retain `font-context.json` with each corpus. Keep previously verified references and their font contexts intact.

**Ready when:** independent native captures are valid, repeatable, and traceable to the selected artifact.

## 4. Implement the shadcn component

Keep the public primitive's expected props, controlled/uncontrolled state where applicable, refs, event handling, composition, and accessible semantics. Use React/Radix web behavior; Minecraft supplies the appearance. Keep exported styling helpers usable when the primitive normally exposes them, and distinguish their guarantees from the component's guarantees.

Render using the recovered rules. Use integer coordinate arithmetic and nearest-neighbor sampling where the native renderer does. Browser text rasterization is a measured compatibility question, even with a matching font. When bitmap glyphs are needed, preserve their advances and shadows and retain real text for accessible names. Define the supported glyph set and fallback honestly.

For translucent textures, preserve decoded original RGBA as well as PNG bytes. Browser premultiplication can change low-alpha RGB values: Progress notch pixels `(2,2,2,64)` caused one-level color differences. If needed, upload the original RGBA directly and reproduce the native source-alpha blend order. Retain transparent corners/padding so the painter preserves underlying UI; `minecraft-progress-paint.tsx` and its transparency regression cover this path.

For text-entry primitives, default to `spellCheck={false}` and `autoCorrect="off"`, while preserving explicit consumer overrides. Native browser spelling/correction decorations must not paint over the game glyphs. Supply multiline demo values through JavaScript strings or expressions; quoted JSX attributes preserve literal backslash-n characters. Verify read-only and disabled demos as well as editable ones.

Make the installed item self-contained: include required styles, metrics, and textures/fonts through supported registry files or embedded data. Consumer rendering must not depend on the developer's Minecraft path, test fixture, or a hidden external asset server. Update the registry item and generated JSON together.

**Ready when:** the actual public component renders each agreed case, and all appearance resources are included in its installable registry payload.

## 5. Verify pixels, behavior, and installation

Drive the component through its public interface in the test fixture. Use matching native/web content and geometry; enter hover and keyboard-focus states through browser interaction. Capture the element at the declared environment settings.

Check reference integrity and dimensions, then compare every decoded RGBA pixel with zero tolerance. Save actual image, visible diff, mismatched-pixel count, total-pixel count, and case identity. Correct the rendering or reference-capture defect that explains a failure. Baseline updates must come from a deliberately recaptured native reference, never from the browser output under test.

For a new comparator or capture route, confirm a deliberate one-pixel change fails in a temporary copy. This checks that the test detects disagreement rather than passing by construction.

Test web behavior separately at the public primitive: keyboard operation, focus visibility, disabled behavior, events, and composition as applicable. Stateful controls also need value-change behavior. Green pixel tests do not establish accessibility or interaction correctness.

For audible interactions, verify exact embedded asset hashes, browser decoding, native pitch/volume, one playback per relevant action, and silence for disabled, hover-only or otherwise silent native interactions. Keep audio checks separate from pixel comparisons.

Build the registry, install the item through the actual shadcn CLI into a separate initialized consumer, and verify its types and rendering/assets resolve. Run the relevant component tests during implementation and the full suite after the final change. Read current package scripts for exact commands.

Add each finished component to `preview/demos.json` and provide its interactive module in `preview/demos/`. The preview coverage check rejects missing demos and unfinished items. Run the preview checks, build and browser tests, and keep the loopback preview at `http://127.0.0.1:5176/` current. `.openai/preview-policy.json` records the local-only requirement. The preview imports the actual registry components. Keep all preview changes local: no source uploads, hosted synchronization, Site creation, or deployment. Existing hosting metadata is historical and does not authorize publication.

**Complete when:** every agreed reference case has zero differing pixels, required web behavior passes, the built item installs with its resources, existing verified components still pass, and the local preview contains the new component's working demo. Summarize the exact version/cases/environment proved and any remaining limitations. Keep incomplete work explicitly unverified rather than claiming universal pixel perfection.
