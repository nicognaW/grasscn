# Grasscn website design QA history

Historical record of the website reviews below. Release numbers, component counts, resource ceilings and pending checks describe those runs, not current project status. Use `AGENTS.md` and the porting skill for current working instructions.

## Recorded scope

Release polish for the local website: shared navigation and footer, shadcn-style component documentation, a chart collection, complete component/export search, original Minecraft dirt texture background, and removal of internal progress/version/verification copy. Canonical routes are /components, /components/:name and /charts/:type. Earlier hash links remain supported.

The user-supplied shadcn landing screenshots are layout references. Minecraft typography, original game assets, square controls, native F3 charts and grasscn branding remain intentional differences. No registry renderer, captured reference image or public registry JSON changed in this iteration. The staged 0.1 index remains intact; new website work is unstaged.

## Evidence

Directory: C:/Users/admin/Documents/Codex/2026-10-28/hel/work/site-release-polish

- before-home.jpg and before-components.jpg: initial state.
- button-release.jpg: final desktop documentation structure, native preview, installation, import, composition and shared shell.
- charts-mobile-release.jpg: final 390px F3 browser-share example, collapsible navigation, installation and shared footer.
- final-checks.json: static index coverage and current manual validation.

Responsive checks included 320, 390, 768 and 1440 CSS pixels. Full-page captures retain the screenshot pixels without scaling; viewport overrides were reset after checks. Some earlier viewport captures clipped to the physical browser surface and are not final visual evidence.

## Findings and fixes

- Components and charts were detached galleries. Both now share the website header, search, footer and canonical navigation. Components use a sidebar, breadcrumbs, preview/source tabs, installation/import/composition and adjacent links. Charts use a type sidebar, working examples, code and installation.
- The plain background lacked Minecraft identity. The original dirt PNG is tiled at an integer scale, with dark tinting for readable page content. Asset provenance and SHA256 are recorded in preview/background.provenance.json.
- Search hid results after six matches and missed nested exports. The generated index covers all 62 published items and 370 named exports. Field produces 11 matches; CardHeader opens the Card import. Unicode queries retain their characters rather than matching everything. Keyboard selection, Escape and Ctrl+K remain available.
- Internal game version, completion totals, native-case counts and local-preview labels were removed from visible production content. Realistic example data and working local installation commands remain.
- Mobile navigation stayed expanded after selecting a page. Hash and popstate navigation now close the rail. Checked after selecting an F3 breakdown chart at 390px.
- Native F3 charts could exceed narrow cards at scale 2. A measured integer scale selects 1 or 2; the original renderer remains intact. The F3 browser-share example fits at 390px.

## Fidelity and interactions

Original font, button/input/card textures, grass logo, click sound and chart renderers are reused. Typography, wrapping, contrast, page spacing, sidebar density and native preview insets were inspected in screenshots. Desktop documentation and mobile chart pages have no document overflow at the checked widths. Realistic API latency, browser share and visitor examples preserve the F3 chart appearance.

Manually verified in the existing in-app browser: shared shell, canonical component and chart URL reloads, browser back/forward, component/export search, source loading, clipboard success, chart code toggling and mobile rail collapse. Visible home/components/charts content was checked for removed internal-status copy. Static checks confirm published index coverage and source-file availability.

## Verification limits

Earlier typechecks passed before the final route and test edits. Final production build, typecheck and automated suite are not confirmed. Resource-guarded builds were stopped when total machine load exceeded the user ceiling, and later launches were deferred because RAM was already above 80 percent. No additional test browsers were launched; the stale frozen-site test server was stopped. Manual checks used the existing preview tab. New release-site tests cover shared layout, search completeness, responsive navigation, canonical reloads and legacy routes, but are pending execution.

final result: visual checks complete; release verification incomplete under the current resource ceiling


## Minecraft UI visual audit - 2026-10-31

Evidence: C:/Users/admin/Documents/Codex/2026-10-28/hel/work/vanilla-site-audit. audit-result.json records scope and checks. Desktop captures and contact sheets cover all 62 published previews plus 11 chart detail pages at 1280x900; mobile captures and contact sheets cover the same list at 390x844. No document overflow was observed in those sweeps. The three repaired compact demos were separately checked at 320px and 390px.

1. Captured and inspected the homepage, component index, every published preview and every chart type before fixes. Found olive/green website chrome, hand-styled action controls and inconsistent text shadows.
2. Replaced site navigation actions, preview/source controls and chart actions with the actual registry Button renderer. Current/selected states use the original highlighted sprite rather than a substitute outline. Applied the Minecraft white/gray/yellow/green palette and color-correct, glyph-scale text shadows. Menu and separator resources remain original game assets.
3. Opened dialogs, drawers, sheets, menus, calendar, tooltip, select/combobox, notification, collapsible and trace content. Scrolling screenshots exposed content bleeding through the sticky header; an opaque neutral base now sits behind its original menu texture. Keyboard tooltip appearance was retained, including its original transparent margins.
4. Inspected every mobile preview. Button Group concealed Load, Table clipped its action column, and Pagination wrapped unnecessarily. Their demos now size native controls and native text to the available space. Load, Join and page selection were exercised successfully at 320px. Pixel dimensions remain integer based; original widget renderers and references were not edited.
5. Checked native chart presentation and code toggling, complete search results (11 Field matches), mobile search bounds, alternate tabs, mobile sidebar and Questionnaire steps including CJK submission.

Accepted representative screenshots: button-desktop-final.jpg, charts-final.jpg, responsive-fixes.jpg, search-mobile-after.jpg, questionnaire-step-3.jpg and sidebar-mobile-open.jpg. Contact sheets are review aids with resized thumbnails, not captured references for pixel comparisons. Full-page GPU-backed captures can omit offscreen content before it is visited; opened states and focused interactions supplement those captures. native-button-comparison.png pairs an existing independent captured reference with a JPEG website crop for visual inspection only; it is not a zero-tolerance comparison.

NativeSelect deliberately remains a real HTML select. Its platform popup was not captured as a valid comparison against a captured reference; its existing native appearance guarantee covers the closed control. Do not claim universal pixel-perfect matches against Minecraft for system-managed picker UI or untested state/locale/prop combinations.

Added regression coverage for native site control markup, the opaque sticky header and reachable compact-demo actions. These new tests, the final typecheck, build and full suite remain unrun: observed total RAM was 80-88 percent, above the user's ceiling. No new test browser or build worker was launched for this audit. Browser checks used the existing local preview tab. The staged 0.1 index and registry/captured reference files remain unchanged.

final result: visual audit completed for the recorded website surfaces; automated release verification remains incomplete under the resource ceiling
