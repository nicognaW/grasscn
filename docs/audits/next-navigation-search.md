# Next documentation navigation and discovery (#16)

The website uses the Fumadocs loader's actual page tree for its sidebar and each compiled MDX document's TOC for section links. Missing canonical documents retain Next's `notFound()` outcome. The root homepage and chart showcase are outside this tree.

Documentation text and headings are indexed by Fumadocs and served by the Next search route. Registry public-export metadata is a separate input: the pinned TypeScript compiler resolves the public entry modules declared by the registry, including type exports and re-exports. This metadata does not generate documentation pages, parse prose, extract headings, or own a second search engine. Generation fails if a declared entry cannot be resolved. Formerly grouped source modules retain their existing installable registry identities.

## Focused public-boundary verification

Each new browser case is individually mapped in the Base catalogue before execution. These checks exercise the integrated production application, rather than a helper's expected-value transformation. No Full browser tests were executed.

- The first navigation test failed on the foundation's missing documentation sidebar. The implementation subsequently passed the production journey from the Fumadocs sidebar to Button, selected-page semantics, and its actual Usage heading link.
- The first prose-search test failed on the missing search control. The implementation subsequently passed searching newly authored Button prose and following the matching paragraph's heading destination with arrow and Enter keys.
- Public-export and alias discovery each had an observed failing first case, then passed through the production search interface. Public exports come from registry source; optional `aliases` and `exports` frontmatter only adds intentional search terms.
- Ordinary legacy Button query/Import links and the prior default FieldLabel search result each failed before compatibility was implemented, then reached their actual canonical page/section. Field remains part of the Form registry item and is a real independently discoverable MDX page; its fuller documentation belongs to #18.
- The mobile default path at 390x844 failed before its disclosure existed, then passed opening the actual page tree, choosing Button, closing navigation and retaining the viewport width. Desktop and mobile composition PNGs are retained by the verification artifact fixture.
- Composed Base UI buttons require explicit link semantics for navigation: `nativeButton={false}` otherwise supplies `role="button"` even when the render element is an anchor. The navigation and header preserve real links.

The temporary `nx-tools` resource-guard logs distinguish failed/interrupted attempts from completed checks. The initial browser red attempt was interrupted by the whole-system CPU guard. Development attempts stalled under Turbopack, including a fixed-source attempt that never returned its initial `/docs` request. Owned jobs were stopped and their logs retained. Production builds, startup, and the above browser journeys completed normally; this does not resolve the development-workflow gap, which needs separate investigation under #22.

## Visual acceptance boundary

The sidebar, TOC, header and search reuse Grasscn's original Button, Command, input and bitmap-text implementations. Navigation, a documentation grid and multi-line contextual search results are web adaptations. Reuse alone does not establish zero differing RGBA pixels for new content, dimensions, states, or the integrated presentation. The established header logo is copied from its original SVG without byte changes.

The separate `tests/reference/next-docs-navigation` family retains two independent original-renderer launches, full frames, native sources, case definitions and repeat proof for five header/search inputs at scales 1/2/3. All 15 independently repeated captures have identical decoded RGBA. The selected scale-2 integrated comparisons passed for Components (0/8000), empty search placeholder (0/16000), and focused prose-query typing (0/16000). Other captured scales/content are not browser coverage. The first focused observation froze before the input painter's next frame and correctly failed with 452 differing pixels; advancing one 16ms paint frame in the same caret-on phase corrected the observation without changing the application, port or reference pixels.

Sidebar/TOC Button rows at scale 1/logical width 200 have a textured compositing context that this solid-#202020 family does not establish. Their exact native comparison, mobile control dimensions/new disclosure label, additional header link states and suggestion-result constituent comparisons remain explicit acceptance gaps. Additional old bare/path hash syntaxes are implemented but lack a qualifying default-path mapping and were not promoted into Base. No Full cases were executed and no whole-page native identity is claimed.

Since #43 the header Components link is a text link rather than a Button, so its scale-2 comparison was retired and removed from Base. The `docs-header-components` captures remain only as part of this family's unchanged native capture and provenance (`cases.json` is hash-pinned by both manifests); they are no longer browser coverage.

## Final integrated checkpoint

The branch merged integration `b503368` (including #14) as `0057144`. The sole MDX conflict retained the complete Button exemplar, the authored alias and its actual Usage search sentence. The following checks completed against that combined application plus the scoped source formatting changes:

- Forced Turbo generation, including the Fumadocs pipeline and registry-only symbol metadata, passed. Direct Uncheck typechecking passed all three projects. Scoped Oxfmt passed 18 changed source/config/test files.
- Resolved primitive policy and registry closure passed. No registry implementation/resource bytes or existing captured references were changed.
- Browser inventory resolved every catalogue entry once: 70 Base + 30,842 Full = 30,912 cases. This was listing only; Full was not executed. Legacy metadata was prepared only for old inventory readers, never for Next runtime discovery.
- Production build/start under Bun passed. Thirteen individually catalogued Base cases passed in 37.7 seconds: the ten navigation/search/compatibility/mobile/native cases plus the existing example, code-control and default Button journeys.
- Header Components matched 0/8000 pixels; normal search placeholder and focused `hear` each matched 0/16000. The retained default Button matched 0/16000 and #14's six declared code-control/text constituents also matched zero. The actual integrated header comparator rejected a temporary one-pixel corruption with exactly one mismatched pixel; the precise original formatted test bytes were restored before the final run.
- HTTP checks observed proper 404 responses for missing canonical and legacy docs, 308 redirects preserving repeated query parameters, grouped FieldLabel redirection, an empty search response and discovery of FieldLabel on the newly authored real Field page. The original logo returned 200.
- Desktop 1280x900 and mobile 390x844 composition images were inspected. They show website compositions, not native whole-page identity. Existing local overflow around wide code/example content remains contained; mobile page width stayed 390.

The full Uncheck command is **not clean**: the existing GitHub lint plugin fails to load against TypeScript 7 (`TypeFlags.Intrinsic`), and the repository-wide formatter reports existing source debt and byte-pinned capture artifacts. Frozen evidence was not reformatted to satisfy it. This is distinct from the passing all-project type checks and scoped source formatting.

Local evidence is under `.pixel-perfect-test/next-navigation-final/`, `.pixel-perfect-test/next-navigation-negative-control/` and `.pixel-perfect-test/browser/`; guard logs are `nx-tools/logs/final16.*` and `probe16.*` in the parent's temporary coordination directory. The final guarded job exited 0, with a 4% owned CPU cap, peak system CPU 42.19% and RAM 77.47%. The temporary 5186 server was stopped. A running final acceptance preview at 5176 remains the integration owner's responsibility under ADR 0004.

Two mistakenly copied native runtime caches remain local and narrowly ignored after automatic approval review rejected deletion. Only the declared capture cases, sources, manifests, frames, repeat proof and runtime receipt are committed.
