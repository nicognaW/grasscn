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

Final verification after merging the current integration tip is pending at this implementation checkpoint.
