---
name: port-minecraft-ui
description: Port Minecraft UI elements into this shadcn registry using original assets and rendering evidence, then verify pixels against captured references from Minecraft. Use when adding a UI port or extending its verified states, sizes, glyphs, or environments.
---

# Port Minecraft UI

Produce a shadcn component whose appearance matches the selected Minecraft interface element in an explicit set of reference cases. Keep shadcn APIs and accessible web interactions. This is a porting and verification workflow, not a claim that any widget can be converted automatically.

Resolve repository paths below from the Git root. Read `GLOSSARY.md`, relevant ADRs, `apps/web/registry.json`, and current package scripts before changing the component. The repo includes a maintained local-only preview; completing a component also means updating its working demo. The preview stays local; an authorized source push does not authorize website deployment.

## 1. Define the reference cases

Use existing user decisions first. Record the element, Minecraft edition/version, source artifact, target shadcn primitive/API, and intended default dimensions. Identify the game version from the JAR metadata and exclude mods or resource packs that change the interface used for captured references.

For each accepted case specify:

- Value/content, visual state, logical dimensions, GUI scale, locale, font settings, and background/compositing context.
- Browser/version, viewport, device pixel ratio, zoom, and theme for the web capture.
- Relevant state dimensions: hover/focus/disabled for controls; selection/check state for toggles; value, thumb position, and drag state for sliders; clipping/scroll position for containers. Include only those applicable to the element.
- For animated or time-dependent elements, a reproducible time/frame and the inputs or seed that determine it.

For stateful elements, define input sequences as well as screenshots: boundaries, fractional and burst input, controlled/uncontrolled usage, and replacement between incompatible content. Distinguish native behavior, browser-input normalization, and accessible web additions. For dragging, scrolling, selection or asynchronous replacement, read [interaction coverage](references/interactions.md).

Carry forward previously verified cases when extending a component. Report unsupported variants or environments explicitly; each component has its own dimensions, glyph coverage and reference cases.

**Ready when:** every promised appearance maps to a reproducible native case and a matching web case. Every promised interaction also has a sequence and an identified expected result. A missing reference is unresolved coverage.

## 2. Recover assets and rendering rules

Inspect the supplied artifact read-only. Use available REA archive tools for artifact identity/inventory and focused bytecode disassembly or decompilation for native rendering methods. If REA is unavailable, use available local archive/disassembly tools and record that provenance accurately. Runtime captures remain necessary for runtime claims.

Record the artifact SHA-256, original member paths and hashes, and the classes/methods that establish each rendering rule. Determine:

- State-to-sprite selection, including precedence when states overlap.
- Each sprite's own metadata: scaling mode, dimensions, borders, tiling/stretching, clipping, sampling, tint, and alpha. Parse metadata per asset.
- Layout arithmetic, rounding, minimum dimensions, text placement, glyph advances, shadows, and overflowing-content behavior relevant to the cases.
- Runtime dependencies such as theme, locale, parent screen, GUI scale, and animation timing.

Preserve original texture bytes wherever practical. Separate observations, inferences, and unknowns. Read [existing ports and reusable boundaries](references/existing-ports.md) when adapting the existing implementation or investigating pixel mismatches.

Resolve effective resources through the version's asset index as well as the JAR. Indexed fonts and sound definitions can override empty JAR placeholders. Verify object SHA-1 against the index and record SHA-256 for the bytes used. For interaction audio, use the original game's sound asset, resolve its event through effective `sounds.json`, and recover trigger timing, pitch and volume from the widget and sound-instance methods. Do not synthesize replacement clicks or add sound to silent interactions. `packages/pixel-perfect/scripts/generate-sound-assets.mjs` and `packages/tests/tests/sound.spec.ts` establish this path for `ui.button.click`.

**Ready when:** the chosen appearance can be explained from assets plus rendering rules, with remaining unknowns assigned to native observation.

## 3. Capture independent references from Minecraft

Run the original Minecraft renderer in an isolated game directory with controlled settings and the required runtime and libraries. A test-only screen may supply layout, content, and state; the actual Minecraft element, font, and rendering pipeline must produce the captured reference. Keep the user's game installation and saves intact.

Adapt the existing native harness for the new element rather than replacing it with a hand-painted approximation. Retain full frames as provenance, then crop exact element bounds without resizing or recoloring. For transparent elements, use identical controlled backgrounds in both renderers and identify the comparison as composited pixels.

Wait for loading overlays to disappear and for both stable frames and stable elapsed time after transitions. Validate a known background/sentinel outside the element so a fade or overlay cannot become a baseline. Guards must fit the element: grayscale checks suit the current gray Button, not colorful widgets. Ensure no unrelated pointer, toast, tooltip, or cursor contaminates the crop.

Save a manifest with case inputs, source/harness identities, runtime/settings, image dimensions, and capture hashes. Capture again in a separate native launch and output directory. Require identical decoded pixels per fixed case; keep file hashes for integrity. If results vary, isolate the cause or mark the case unverified before using it as a captured reference.

Browser snapshots and reconstructed renderers may supplement debugging, but they cannot establish a pixel-perfect match against Minecraft. If the native runtime cannot be exercised, continue useful static work and report verification against captured references as incomplete.

For glyph-cache, atlas, transparency, projection or float-precision issues, read [rendering investigations](references/rendering.md).

For generated terrain or profile-driven visuals, read [dynamic data](references/dynamic-data.md). Independently verify data generation and rendering; freeze sufficient read-only inputs and preserve source saves.

**Ready when:** independent native captures are valid, repeatable, and traceable to the selected artifact.

## 4. Implement the shadcn component

Keep the public primitive's expected props, controlled/uncontrolled state where applicable, refs, event handling, composition, and accessible semantics. Start from shadcn's Base UI implementation; Minecraft supplies the appearance. Preserve its part structure, `render` composition, positioning, value shapes and change-event cancellation. Check the current upstream source rather than retaining Radix-shaped compatibility wrappers or changing tests to preserve Radix behavior. Keep exported styling helpers usable when the primitive normally exposes them, and distinguish their guarantees from the component's guarantees.

Follow upstream's component engines, including `cmdk` for Command, Recharts for charts, React Day Picker for calendars and Sonner for notifications. Command is the explicit dependency exception: `cmdk` brings transitive Radix packages. Direct Radix primitives and Vaul remain unsupported; other packages must not introduce additional Radix dependency routes. `packages/tests/scripts/check-primitives.mjs` checks source, registry metadata and the lockfile; its `--built` mode also checks generated registry payloads. These checks establish the primitive foundation, not pixel-perfect matches. Charts use Recharts composition and its data/dataKey APIs, including F3 presentations; pixel shapes may reproduce the game renderer without introducing a separate chart root or state engine. Forms use native forms with React Hook Form Controller and Field composition. Data Table and Date Picker are copyable recipes rather than additional primitive APIs.

Render using the recovered rules. Use integer coordinate arithmetic and nearest-neighbor sampling where the native renderer does. Browser text rasterization is a measured compatibility question, even with a matching font. When bitmap glyphs are needed, preserve their advances and shadows and retain real text for accessible names. Define the supported glyph set and fallback honestly.

For text-entry primitives, default to `spellCheck={false}` and `autoCorrect="off"`, while preserving explicit consumer overrides. Native browser spelling/correction decorations must not paint over the game glyphs. Supply multiline demo values through JavaScript strings or expressions; quoted JSX attributes preserve literal backslash-n characters. Verify read-only and disabled demos as well as editable ones.

Make the installed item self-contained: include required styles, metrics, and textures/fonts through supported registry files or embedded data. Consumer rendering must not depend on the developer's Minecraft path, test fixture, or a hidden external asset server. Update the registry item and generated JSON together.

**Ready when:** the actual public component renders each agreed case, and all appearance resources are included in its installable registry payload.

## 5. Run Pixel Perfect Tests and verify behavior and installation

Drive the component through its public interface in the test fixture. Use matching native/web content and geometry; enter hover and keyboard-focus states through browser interaction. Capture the element at the declared environment settings.

Pixel Perfect Tests check reference integrity and dimensions, then compare every decoded RGBA pixel with zero tolerance. Save actual image, visible diff, mismatched-pixel count, total-pixel count, and case identity. Correct the rendering or reference-capture defect that explains a failure. Baseline updates must come from a deliberately recaptured captured reference, never from the browser output under test.

For a new comparator or capture route, confirm a deliberate one-pixel change fails in a temporary copy. This checks that the test detects disagreement rather than passing by construction.

For complex stateful ports, recover native event traces as well as pixels and repeat those traces in an independent launch. Drive boundary and burst sequences through the actual public component. Thresholds and browser normalization must be labeled as web adaptations unless native evidence establishes them.

Test web behavior separately at the public primitive: keyboard operation, focus visibility, disabled behavior, events, and composition as applicable. Stateful controls also need value-change behavior. Passing Pixel Perfect Tests do not establish accessibility or interaction correctness.

For audible interactions, verify exact embedded asset hashes, browser decoding, native pitch/volume, one playback per relevant action, and silence for disabled, hover-only or otherwise silent native interactions. Keep audio checks separate from pixel comparisons.

Build the registry, install the item through the actual shadcn CLI into a separate initialized consumer, and verify its types and rendering/assets resolve. Run focused Base tests during implementation and the ordinary local verification before approving a merge. Full tests require an approved GitHub run issue and execute independently; their results do not block merging. Read [local verification](references/local-verification.md) for the selection policy, guarded commands and source-bound receipts. GitHub Actions stays disabled by user choice. A resource interruption is incomplete verification. Read current package scripts for exact commands.

Add each finished component to `apps/web/demos.json` and provide its interactive module in `apps/web/demos/`. The preview coverage check rejects missing demos and unfinished items. Run the preview checks, build, Pixel Perfect Tests and applicable website and component behavior tests, and keep the loopback preview at `http://127.0.0.1:5176/` current. The preview imports the actual registry components. Treat fixture, independently installed consumer, and integrated website as three separate gates. In the website, exercise realistic content, connected controls, long labels, all visible rows and desktop/mobile bounds; fixture pixels cannot catch surrounding CSS conflicts. Keep the preview hosted on loopback only; source publishing requires its own user authorization.

**Complete when:** every agreed reference case has zero differing pixels, required web behavior passes, the built item installs with its resources, existing verified components still pass, and the local preview contains the new component's working demo. Summarize the exact version/cases/environment proved and any remaining limitations. Keep incomplete work explicitly unverified rather than claiming universal pixel perfection.
