# Next/MDX documentation completeness research

Research date: 2026-11-01. This is read-only source research for the Next.js/Fumadocs design interview, not an implementation specification or a claim that any website was exercised. No dependencies, builds, tests, captures or servers were run. Only this report was added.

## Snapshots and agreed constraints

Live GitHub API inspection confirmed these default-branch heads:

- Grasscn: `977f538ddc56c7a432b49f96f41382282a65ff71` (merged Bun/Turbo migration). The canonical checked-out local `main` was older, so Grasscn analysis used `git show origin/main:<path>` without changing the working tree. [Grasscn snapshot][G0]
- shadcn/ui: `c0d63c339d6cd2fc26135590a54cf1f362269451`. [shadcn snapshot][S0]
- 8bitcn-ui: `56066c038165223b8505a344309279ae27757a81`. [8bitcn snapshot][B0]

The accepted direction is headless Fumadocs core + MDX beneath Grasscn's fully Minecraft-styled UI, normal Next server operation under Bun, canonical `/docs/components/...` routes, and Fumadocs ownership of docs processing/navigation/search. Existing registry distribution, public component behavior, captured-reference provenance and Base/Full policy remain separate contracts. Q8 additionally accepts document-text search while retaining component/alias/export discovery; Q10 accepts a Fumadocs-derived page tree and heading TOC. The user explicitly wants this migration to improve the existing preview/code experience, distinguish demo code from installed component source, and provide copyable manual-install source. Other completeness additions below remain candidates for the interview.

## Findings that explain the current problem

1. **The current Source view is not the displayed example.** `components-page.tsx:48-68` selects an installed component source by item/export name, while the preview executes a separate `demos/*.tsx` module. A user toggling Preview/Source therefore sees two different levels of code. `demos/button.tsx`, for example, includes interactive label/width controls and state, whereas Source resolves the button implementation. This is a verified source-level mismatch in the page contract, not an observed browser failure. [Page template][G1], [button demo][G2], [source generator][G3]
2. **Installation is currently a single hardcoded command.** `components-page.tsx:68` emits `npx shadcn@latest add http://127.0.0.1:5173/r/<name>.json`; it has no CLI/Manual split, dependency instructions or package-manager choice. The website's configured port is 5176, while a separate registry host may legitimately have its own address: the issue is that displayed commands embed a fixed endpoint instead of identifying their actual supported delivery route. [Page template][G1], [Vite configuration][G4]
3. **Import and composition documentation is mostly generated labels.** The template takes up to the first four public exports for the generic import snippet and lists export names under Composition. It does not provide component-specific runnable usage or explain required parts, controlled state, callbacks or accessibility. The generator extracts selected exports using regexes and excludes names containing `Skeleton`; this should not silently become the complete public API inventory. [Page template][G1], [generator][G3]
4. **The displayed source is a main-file view, not a manual installation.** The generator maps each source name to its main `.tsx` file using Vite `?raw`; supporting files are not a selectable install closure. Registry definitions show 13 files for button, 47 for sidebar, 41 for date-picker and 27 for chart. Dependencies, destination paths, helpers, CSS and generated assets matter to a working manual installation. [Generator][G3], [registry manifest][G5]
5. **Source loading has no explicit failure state in this template.** The source effect uses an optional loader and `.then(...)` without a rejection handler; missing/failed content has no corresponding actionable source error UI in this code path. The current CopyCode does provide a copy failure message and disables copying its loading placeholder, which should be retained. [Page template][G1]
6. **Page identity and demo identity already differ.** Routing aliases map field to form and bubble/message-scroller to message; chart links go to the chart showcase. A catalog of 67 registry items does not establish 67 independent existing documentation pages. Decide page/group relationships explicitly rather than derive the new docs tree from an assumed one-item/one-page rule. [Router][G6], [site shell][G7], [component groups][G8]

## What shadcn actually provides

The representative sample is Base UI Button, Calendar and Chart documentation, their shared MDX renderers and installation guidance. These establish concrete patterns; they do not establish that every upstream page has every feature.

| Area | shadcn's inspected implementation | 8bitcn's inspected implementation | Grasscn opportunity |
| --- | --- | --- | --- |
| Preview and example code | `ComponentPreview` resolves a named demo and passes that same name to `ComponentSource`; code can be expanded below the live preview. | Button MDX directly renders JSX examples and separately authors their snippets. Preview wrapper provides title, optional full-page link and Open in v0. | One named executable example should drive both the displayed demo and its copyable source; avoid independently maintained duplicate JSX. |
| CLI installation | Command/Manual tabs plus npm/pnpm/yarn/Bun command rendering; preferences are shared through site config. | InstallationCommands offers all four package managers and `@8bitcn/<item>`. | Accurate registry target, selected-command copying and remembered preference; repository Bun policy does not imply visitors must use Bun. |
| Manual installation | Button gives dependencies, destination filename, copyable source and alias-adjustment instruction. Calendar additionally names its Button prerequisite. Chart adds global CSS configuration. | Inspected Button page offers CLI commands, usage and props; no manual-install path is present in that sampled page. | A complete manual path must expose Grasscn's full file/resource closure, not just imitate upstream's common single-file case. |
| Usage and API | Named examples and explanations, import plus JSX usage, component-specific API/reference links or tables. Chart includes a first-chart walkthrough; Calendar explains engine integration and specialized cases. | Button has variants, sizes, fonts, usage and a props table. | Teach actual supported Grasscn usage; do not copy upstream variants or guarantees that Grasscn does not implement. |
| Code readability | Language/title metadata, highlighting, line numbers/emphasis, collapsible long blocks and copy controls. | Custom MDX/code-snippet mappings and overflow handling. | Minecraft-styled code UI with plain complete copied text, file identity, manageable overflow and explicit loading/error states. |
| Navigation and page sharing | Fumadocs page source, generated parameters, not-found handling, canonical metadata, neighbours and heading TOC; page-copy/Markdown and external AI links are additional features. | Fumadocs source loader and custom page/MDX UI. | Core navigation is already agreed; page Markdown/export and AI integrations are separate optional scope. |

Sources for the comparison: [shadcn preview][S1], [preview controls][S2], [source renderer][S3], [command renderer][S4], [installation tabs][S5], [Button MDX][S6], [Calendar MDX][S7], [Chart MDX][S8], [MDX mappings][S9], [docs route][S10], [copy-page features][S11], [8bitcn Button MDX][B1], [8bitcn preview][B2], [8bitcn installation commands][B3], [8bitcn MDX mappings][B4], [8bitcn source loader][B5].

### Details worth adopting deliberately

- **Consumer-ready imports.** shadcn's source pipeline rewrites internal registry paths to consumer aliases and applies style/source transformations before rendering. Grasscn's raw main-file source and demo-relative imports are not automatically consumer-ready. Derive documentation source from authoritative files with a well-defined display/install transformation, preserving any client directives and full code. Do not alter captured reference or component bytes just to beautify docs. [shadcn formatter][S12], [Grasscn generator][G3]
- **Manual installation starts with prerequisites.** Upstream's general manual guide covers Tailwind, shared dependencies, aliases and global styles; per-component pages then add local requirements. Grasscn needs its own short setup contract and per-item instructions from its actual registry metadata. Copying shadcn's exact CSS/engine setup is not equivalent to documenting Grasscn. [General manual setup][S13], [Calendar][S7], [Chart][S8]
- **Multi-file completeness is a Grasscn-specific requirement.** shadcn's inspected `ComponentSource` picks `item.files[0].content` by default. That is not a general multi-file installer. A Grasscn manual-install file list should identify all destination paths and support-file prerequisites without pretending one copied TSX file is sufficient. [Source renderer][S3], [Grasscn registry][G5]
- **Separate readable code from bulk assets.** Grasscn contains `minecraft-unifont-data.ts` at 2,079,861 bytes and `minecraft-unifont-metrics.css` at 1,477,784 bytes in this snapshot. Displaying/highlighting/serializing every full closure into every docs page would be a poor default. Propose lazy file loading with exact full-content copy/download for large resources and a readable entry file first. A grouped download is an optional convenience, not a substitute for a truthful file list. Source sizes were checked with `git ls-tree -r -l origin/main apps/web/registry`. [Font data][G9], [font metrics][G10]
- **Copy semantics matter more than decorative parity.** The upstream copy helper handles clipboard failure/fallback; command controls copy the selected manager's actual command. Grasscn should show success only after copying succeeds, preserve selectable plain text and never copy only the three-line collapsed preview, line numbers or placeholder content. These are proposed observable behavior requirements. [Copy helper][S14], [command renderer][S4], [source renderer][S3]
- **Accessibility is a content and interface requirement.** Representative upstream examples include icon-button accessible labels and specialized notes; that is not proof of exhaustive accessibility coverage. For Grasscn, document relevant labels, keyboard behavior, focus and controlled-state requirements for actual ports. Code expanders/tabs/file selectors must remain keyboard-usable, and horizontal code scrolling should not force whole-page overflow. Existing pixel fidelity does not establish these website interactions. [Button examples][S6], [preview controls][S2], [MDX mappings][S9]
- **Server rendering and client examples have different responsibilities.** shadcn's async source renderer reads/formats/highlights source server-side, while preview controls are client components. This is a useful architecture reference: keep interactive demo hooks/browser APIs in client modules without converting the entire MDX documentation tree to client rendering. [Source renderer][S3], [preview controls][S2], [docs route][S10]

## Proposed completeness tiers for the interview

These are recommendations to choose from, not newly accepted scope or a promise of complete shadcn feature parity.

### A. Migration-critical and already-requested behavior

- Fumadocs owns authored MDX, page-tree/TOC data and docs search; preserve accepted alias/export discovery through appropriate additional search data rather than retaining the bespoke docs generator as a second owner.
- Distinguish live-example code from installed component source. Give every displayed example a stable identity shared with its source, and show complete consumer-ready code when copied.
- Provide CLI and Manual installation; manual instructions expose required dependencies, all relevant destination files, helpers/styles/assets, alias setup and actual usage. Define which supported project setup the instructions assume.
- Preserve registry item identities and valid URLs. Resolve the old hardcoded local endpoint in docs without inventing a registered namespace or production hostname.
- Keep existing demos and their Base mappings intact until any changed default path is explicitly reconciled. Replacing the default demo with a new cleaner example changes the website default path and may require a meaningful Base mapping update; a docs refactor does not authorize Full execution. [Base selection record][G11]
- Handle missing pages, missing example/source identifiers and source/copy failures explicitly. Preserve old links through the agreed route/anchor compatibility.

### B. Recommended completeness expansion to decide explicitly

- A small primary example followed by named, relevant examples for actual supported variants/compositions and controlled/uncontrolled use, instead of only one large playground. Retain the existing interactive playground as a clearly identified example if it remains useful.
- Per-component usage guidance and selective API tables: required composition, key props/defaults/callbacks, ref behavior and links to authoritative engine API docs where appropriate. Avoid an exhaustive duplicate API manual for dependencies.
- Component-specific accessibility and limitations notes, including where a presentation is a web adaptation. Show verified coverage only from the existing map/evidence, with no claim that docs migration expands coverage.
- Package-manager tabs and remembered preference for visitor installation commands; explicit source filenames and file selection; raw/download access for resource-heavy manual installs.
- Consistent code-block titles, highlighting/line emphasis, expand/collapse, keyboard operation and reliable copy feedback across MDX snippets and sourced code.
- A clear documentation page/group mapping that makes every installable item discoverable while allowing intentional grouped docs. Decide whether chart gets a component docs page in addition to `/charts`, and whether field/message subitems get their own pages or stable anchored sections.

### C. Optional later work

- Copy-page/View-as-Markdown and other machine-readable documentation delivery. Upstream provides these, but they are distinct from component-code completeness. [Copy-page features][S11]
- Open in v0/AI-provider links, online playground/export integrations, block galleries, full-screen/resizable previews, localization and additional style/base switchers. The inspected upstreams provide some of these; their presence does not make them migration prerequisites. [shadcn preview][S1], [copy-page features][S11], [8bitcn preview][B2]
- Recreating every upstream example, changing component APIs/engines, adding unsupported Minecraft visual variants, or redesigning homepage/chart presentation.

## Concrete end-to-end page contract to consider

For a Button documentation page, a visitor should be able to:

1. See a small working Button example, choose a named additional example or the existing playground, and copy the exact runnable example source with consumer imports.
2. Choose CLI installation and copy the selected package-manager command for the actual Grasscn registry item.
3. Choose Manual installation, see setup/dependencies and all 13 required files for this snapshot, inspect/copy the main implementation, and retrieve full support CSS/font/sound resources with their destination paths. Large files need not be eagerly highlighted or visible in full before selection.
4. Copy a minimal usage snippet that produces the documented result, then find relevant props/composition/keyboard/label guidance and accurate verification limitations.
5. Navigate by document headings or search terms such as component name and public export, open stable links directly, and receive a meaningful error if a requested example/source/page is unavailable.

This is a proposed acceptance seam: the page should lead to a working consumer, not merely contain headings labelled Preview, Source and Manual. Later validation should exercise copied examples and manual installation in an independent consumer, with representative simple, composed and resource-heavy items. The exact coverage and command/runtime matrix remain interview decisions. Existing CLI installation proof does not establish manual-install correctness.

## Remaining decisions and evidence limits

The interview still needs to choose breadth of authored examples/API documentation, supported manual-install project prerequisites, large-resource delivery, page grouping, and acceptance coverage. Runtime compatibility, browser UX, clipboard behavior, installability of displayed snippets/manual files, and performance were not exercised by this research. Static source establishes configured behavior and identified omissions, not a fresh product acceptance result.

Fumadocs supplies the docs framework and indexing; it does not infer Grasscn's executable demo identity, install closure, destination aliases or captured-reference claims. Narrow MDX components/adapters for those responsibilities are still required beneath the user-facing documentation. Those adapters should consume the registry/evidence truth rather than duplicate it or reintroduce a parallel docs content pipeline. Headless integration remains mandatory; upstream UI primitives are examples of behavior to reimplement with Grasscn controls, not approved dependencies to copy.

[G0]: https://github.com/nicognaW/grasscn/tree/977f538ddc56c7a432b49f96f41382282a65ff71
[G1]: https://github.com/nicognaW/grasscn/blob/977f538ddc56c7a432b49f96f41382282a65ff71/apps/web/components-page.tsx
[G2]: https://github.com/nicognaW/grasscn/blob/977f538ddc56c7a432b49f96f41382282a65ff71/apps/web/demos/button.tsx
[G3]: https://github.com/nicognaW/grasscn/blob/977f538ddc56c7a432b49f96f41382282a65ff71/apps/web/scripts/prepare-preview.mjs
[G4]: https://github.com/nicognaW/grasscn/blob/977f538ddc56c7a432b49f96f41382282a65ff71/apps/web/vite.config.ts
[G5]: https://github.com/nicognaW/grasscn/blob/977f538ddc56c7a432b49f96f41382282a65ff71/apps/web/registry.json
[G6]: https://github.com/nicognaW/grasscn/blob/977f538ddc56c7a432b49f96f41382282a65ff71/apps/web/main.tsx
[G7]: https://github.com/nicognaW/grasscn/blob/977f538ddc56c7a432b49f96f41382282a65ff71/apps/web/site-shell.tsx
[G8]: https://github.com/nicognaW/grasscn/blob/977f538ddc56c7a432b49f96f41382282a65ff71/apps/web/component-groups.json
[G9]: https://github.com/nicognaW/grasscn/blob/977f538ddc56c7a432b49f96f41382282a65ff71/apps/web/registry/ui/minecraft-unifont-data.ts
[G10]: https://github.com/nicognaW/grasscn/blob/977f538ddc56c7a432b49f96f41382282a65ff71/apps/web/registry/ui/minecraft-unifont-metrics.css
[G11]: https://github.com/nicognaW/grasscn/blob/977f538ddc56c7a432b49f96f41382282a65ff71/docs/audits/base-selection.md
[S0]: https://github.com/shadcn-ui/ui/tree/c0d63c339d6cd2fc26135590a54cf1f362269451
[S1]: https://github.com/shadcn-ui/ui/blob/c0d63c339d6cd2fc26135590a54cf1f362269451/apps/v4/components/component-preview.tsx
[S2]: https://github.com/shadcn-ui/ui/blob/c0d63c339d6cd2fc26135590a54cf1f362269451/apps/v4/components/component-preview-tabs.tsx
[S3]: https://github.com/shadcn-ui/ui/blob/c0d63c339d6cd2fc26135590a54cf1f362269451/apps/v4/components/component-source.tsx
[S4]: https://github.com/shadcn-ui/ui/blob/c0d63c339d6cd2fc26135590a54cf1f362269451/apps/v4/components/code-block-command.tsx
[S5]: https://github.com/shadcn-ui/ui/blob/c0d63c339d6cd2fc26135590a54cf1f362269451/apps/v4/components/code-tabs.tsx
[S6]: https://github.com/shadcn-ui/ui/blob/c0d63c339d6cd2fc26135590a54cf1f362269451/apps/v4/content/docs/components/base/button.mdx
[S7]: https://github.com/shadcn-ui/ui/blob/c0d63c339d6cd2fc26135590a54cf1f362269451/apps/v4/content/docs/components/base/calendar.mdx
[S8]: https://github.com/shadcn-ui/ui/blob/c0d63c339d6cd2fc26135590a54cf1f362269451/apps/v4/content/docs/components/base/chart.mdx
[S9]: https://github.com/shadcn-ui/ui/blob/c0d63c339d6cd2fc26135590a54cf1f362269451/apps/v4/mdx-components.tsx
[S10]: https://github.com/shadcn-ui/ui/blob/c0d63c339d6cd2fc26135590a54cf1f362269451/apps/v4/app/%28app%29/docs/%5B%5B...slug%5D%5D/page.tsx
[S11]: https://github.com/shadcn-ui/ui/blob/c0d63c339d6cd2fc26135590a54cf1f362269451/apps/v4/components/docs-copy-page.tsx
[S12]: https://github.com/shadcn-ui/ui/blob/c0d63c339d6cd2fc26135590a54cf1f362269451/apps/v4/lib/format-code.ts
[S13]: https://github.com/shadcn-ui/ui/blob/c0d63c339d6cd2fc26135590a54cf1f362269451/apps/v4/content/docs/installation/manual.mdx
[S14]: https://github.com/shadcn-ui/ui/blob/c0d63c339d6cd2fc26135590a54cf1f362269451/apps/v4/components/copy-button.tsx
[B0]: https://github.com/TheOrcDev/8bitcn-ui/tree/56066c038165223b8505a344309279ae27757a81
[B1]: https://github.com/TheOrcDev/8bitcn-ui/blob/56066c038165223b8505a344309279ae27757a81/content/docs/components/button.mdx
[B2]: https://github.com/TheOrcDev/8bitcn-ui/blob/56066c038165223b8505a344309279ae27757a81/components/component-preview.tsx
[B3]: https://github.com/TheOrcDev/8bitcn-ui/blob/56066c038165223b8505a344309279ae27757a81/components/installation-commands.tsx
[B4]: https://github.com/TheOrcDev/8bitcn-ui/blob/56066c038165223b8505a344309279ae27757a81/mdx-components.tsx
[B5]: https://github.com/TheOrcDev/8bitcn-ui/blob/56066c038165223b8505a344309279ae27757a81/lib/source.ts
