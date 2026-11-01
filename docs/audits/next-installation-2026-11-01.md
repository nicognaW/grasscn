# Installation documentation verification (#15)

The Button page offers CLI and Manual installation through shared documentation components. The homepage can use `InstallationCommand({ name })`; component pages use the server `Installation({ name, title?, initialFile? })`. `initialFile` identifies a basename within the actual registry item, including Field → Form and Bubble/Message Scroller → Message. The server wrapper keys the manual browser state by item and initial file.

Verification used the installation implementation through `58db20a`, with integration `fd0c589` merged in `b0d5aef`. `42795d7` only formats the already executed observation assertions. Registry implementation/resource bytes and existing captured references were unchanged.

## Visitor and consumer results

- Frozen Bun 1.4.4 installation, scoped Oxfmt, direct Uncheck typechecks for both workspaces, separate registry generation and Next 16.4.2 production build/start passed. The displayed current-origin `/r/button.json` target returned the real generated Button payload. Repository root Turbo orchestration retains registry generation as a separate prerequisite task.
- Six selected Base documentation cases passed, plus the two affected sidebar/heading and mobile navigation cases. The retained six-case pass is 15.6 seconds; its outputs use `.pixel-perfect-test/browser-installation-15` so a later Playwright invocation does not clear them.
- npm, pnpm, Yarn and Bun commands copy the chosen registry URL exactly. Keyboard selection and persisted manager preference passed. Manual dependency command copying, actual registry-derived file inventory, selection replacement, complete CSS copying and exact 2,079,861-byte font copying/download passed. Opening CLI does not request manual source files. Large resources stay outside CodeView and render at most 4,096 preview characters; clipboard/download content remains complete.
- Fresh independent Vite 8.3.5 and Next 16.4.2 consumers received the files exposed by the HTTP inventory/download interfaces. Each used standard shadcn-ready `@/` source-root aliases and an existing `cn` helper; neither inherited a Grasscn CLI installation or repository fixture alias. The executable Button example was copied through the website's own Code/Copy controls.
- The actual item inventories were Button 13 files, Code Block 30 and Form 35, comprising 49 unique destination files in each consumer. These are observed inventories, not acceptance quotas. UI, hook, lib and explicit block destinations were exercised. Every downloaded file typechecked and each production build passed. Both consumers rendered the copied Button example with zero differing pixels out of 16,000 and no page errors. This proves Button rendering; Code Block and Form have delivery/type/build evidence here, with further composed example rendering retained for subsequent content/final acceptance.

The [consumer report](next-installation-evidence/manual-consumers.json) retains the copied example hash, per-destination source hashes, package/lock hashes, Bun/browser identity and consumer pixel results. The consumers can be reproduced with `packages/tests/scripts/verify-manual-consumers.mjs` against an owned production `GRASSCN_PREVIEW_URL`. Its optional `GRASSCN_MANUAL_CONSUMER_DIRECTORY` resumes only the original independent fixture after comparing its public source/example bytes; successful framework results are checkpointed. Run it through the resource guard, with no server or browser left running afterward.

## Native appearance and composition

Two independent original Minecraft Java 26.2 launches produced 72 decoded-identical captures each: 24 declared inputs at GUI scales 1–3. Their full frames, source, cases, manifests, runtime identity and repeat proof are retained in `packages/tests/tests/reference/docs-installation-controls`. No runtime game directory was copied into the repository.

The actual integrated desktop page matched 23 declared scale-2 control cases: both installation strips; all four package-manager selections after moving focus to the next copy action; all registry-derived Button filename selectors; Download, Load and Copy full file; and loaded-resource disabled Load. The result is **0 / 512,848 differing RGBA pixels**, with a deliberate one-pixel corruption detected by the actual comparator. The [pixel report](next-installation-evidence/integrated-pixels.json) identifies every matched reference. The retained six documentation code-control cases and default Button comparison also passed.

The documentation layout, package-manager purpose and file-list composition are web adaptations. Desktop and 390px mobile screenshots were inspected; the page stays within its viewport while code and the fixed native tab strip overflow within their own containers. These screenshots review the Minecraft presentation; they do not establish a native full-page documentation screen. Captured scale-1/3 and Retry inputs are retained provenance, not additional executed browser coverage. No Full tests ran.

Real integrated checks caught and corrected the following issues rather than altering captured references:

- The default native Tabs root was wider than its responsive documentation wrapper.
- A navigation-only 200px button rule also styled the manual file navigation; it is now scoped to the sidebar and TOC.
- Native ScrollArea's 2px paint inset clipped flush file-button edges. Content receives the corresponding inset, and the browser wheels each compared row fully into view instead of comparing a clipped row against a complete-control reference.
- Generic prose-link ink recolored the native Download button green; rendered native buttons are excluded from prose-link styling.
- A long source path overflowed the mobile viewport; it now uses the documented native paragraph wrapping.

## Limits and interrupted attempts

Scoped Oxlint could not load the existing `eslint-plugin-github` configuration: `TypeFlags.Intrinsic` is undefined in its TypeScript parser dependency. It did not lint these changes. No rules or unrelated tooling debt were changed; the successful resource-wrapper exit does not turn this separate failed check into a lint pass.

An initial fresh Vite harness omitted standard `vite/client` declarations and failed on its own baseline CSS import as well as component CSS. Correcting that ordinary initialized-project prerequisite resolved the failure. A later attempt completed Vite verification but was stopped during Next installation at 76.33% global CPU; Defender accounted for the measured burst. That attempt remained incomplete. The original independently created fixture was verified against the unchanged public file bytes and resumed, using frozen existing locks and network concurrency 1. The completed guarded run passed with peak global CPU 48.30% and RAM 77.91%; the retained-browser run peaked at 35.04% and 74.40%. [Guard results](next-installation-evidence/verification-guard.json) and [retained-browser guard](next-installation-evidence/retained-browser-guard.json) preserve the actual limits/readback.

All owned servers on 5185, 5188 and 5189 and the owned browsers were closed. Expanded Turbopack development stalls, all-item real shadcn CLI installation, broader component/manual example rendering, cross-item client navigation and the final running acceptance preview remain separate integration/#22 work. This audit makes no new universal glyph, state, viewport or version claim.
