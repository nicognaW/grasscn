# Next homepage and chart showcase

Issue #17, under #12. The Next App Router owns `/`, `/charts` and the eleven supported `/charts/<type>` destinations. The old homepage/chart files remain unchanged references for content, layout and behavior; no legacy page, router, raw import or approximate chart-code generator runs inside the new site.

The homepage retains the title/splash, fourteen application panels and their working controls, and the component installation picker. It uses the shared remembered package-manager command control from #15. Navigation/branding/search come from #16. Chart installation/API content belongs to the dedicated `/docs/components/chart` page; the showcase links there.

## Maintained executable examples

`examples/definition.ts` defines a component, its exact source filename relative to `examples/`, title and optional description. Family catalogs compose in `examples/catalog.ts`; adding a family does not require editing `ComponentExample`. That server adapter loads the maintained executable file without a snippet transform. `button-example` keeps its original identity and source.

Twenty self-contained chart examples cover the existing metric, request-volume, profiler, frame-timing and eight analytics presentations with traffic/browser/source data. Their consumer imports match the recipe destinations shipped by the existing chart registry item. Configurations, complete datasets and responsive fitting logic live in the same files that render the previews. In particular, the metric/frame examples display all 240 samples, rather than the old approximate twelve-sample snippet. Recharts and the existing registry APIs remain the rendering engines.

## Original assets and native evidence

The new compositions use the original registry ports, font renderers, title/splash arithmetic, textures and nearest-neighbor sampling. Next Image uses `unoptimized` for the title and grass block. Existing registry bytes and historical captured references are unchanged.

| Original asset | SHA-256 |
| --- | --- |
| `grasscn-title.svg` | `abaca2aab8865f737c076fa82870f36ee5c4c10c8bfe8492b816acefc0c460e1` |
| `grass-block-48.png` | `e8e8f639407df452dee97a1fdf0026f6f9488be7ea4ba317bfc6627aa71920eb` |
| `dirt.png` | `67197d5371efc3ca1638217c38349665dbd5a977b47bfb20075c858dff87d510` |

The new `reference/showcase-frame-timing` family captures the original Minecraft Java 26.2 `FpsDebugChart` with the actual showcase's 240 duration samples, logical width 242, height 69, frame limit 120 and background `#202020`. The pinned JAR SHA-256 is `40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290`; the unchanged retained native harness SHA-256 is `abcbb3b92a631ef54ad433cf55a0db38593918c3001223fbc3bce2c34fbf4b87`. No mods or resource packs are loaded. Two isolated Java 25 launches produced identical decoded RGBA at GUI scales 1, 2 and 3. Both launches' full frames, crops, manifests and source are retained. Capturing three native scales does not select three website cases: the integrated Pixel Perfect Test uses only the default overview's scale 1 case.

The other integrated Pixel Perfect Test checks the homepage's default checked “Remember me” Checkbox at scale 2 against the unchanged `controls/checkbox-checked-normal-s2.png`. Both comparators verify reference hashes and dimensions, compare every decoded RGBA pixel, retain actual/diff/metrics and reject a deliberate one-pixel mutation.

The homepage panels, chart data/compositions, package-manager choice and site layouts are web adaptations. These constituent comparisons do not establish whole-page native identity, all text/dimensions/states, every chart dataset or the Full matrix. Dedicated chart documentation and independent consumer acceptance remain part of the parent integration work.

## Base selection and execution

Five individual cases in `next-showcase.spec.ts` map to the actual homepage/chart default paths before execution: the constituent Pixel Perfect Tests, homepage application/installation interactions, and chart preview/code copy/navigation/data disclosure. Desktop and 390px mobile screenshots document the website compositions. Existing Button example/code-control/foundation checks protect the shared example adapter.

All executions use the shared Windows Job guard, CPU admission, whole-system pause/stop limits and at most 4 GiB. An initial 4% quota stalled the unchanged homepage renderer and interrupted verification. The same production build and case passed in 3.6 seconds at the parent-authorized 10% quota with no pauses, zero differing Checkbox pixels and no source workaround. Final website verification therefore uses the same guarded 10% quota, original 30-second test timeouts and complete gallery.

Scoped Oxlint cannot load the existing GitHub plugin (`TypeFlags.Intrinsic`); this is an explicit configuration-load failure, not a lint pass. The unrelated plugin/configuration is unchanged. No Full tests, public writes or deployments are performed by this ticket.

The chart-card Preview/Code strip uses the same registry Tabs at 120 logical pixels (240 CSS pixels at scale 2), so both controls remain visible inside the existing desktop/mobile chart grid. The default documentation strip remains 303 logical pixels; its prior captured references and Button dimensions are unchanged. `reference/showcase-code-tabs` retains two independently repeatable native launches of the original MenuTabBar for selected Preview and selected Code normal modes at scales 1–3. The integrated comparison selects only scale 2; Code focus is moved into Copy and the pointer outside the strip before comparison. Focused/hovered chart-tab states and other chart-strip dimensions are not newly claimed. The website visibility test first failed on the unchanged 606px strip with only 39.13% of the Code control visible.

Real clipboard checks compare the entire maintained executable source, normalizing only Windows CRLF transfer at the OS boundary. The server adapter does not transform the source. Whole-page screenshots are composition evidence; separate visible Team-panel captures verify that viewport-dependent avatar canvases render when shown. Broad inherited span selectors were narrowed to their intended direct children so glyph spans do not receive announcement borders or team/stat typography.
