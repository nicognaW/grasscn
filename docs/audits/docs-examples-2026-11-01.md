# Matching documentation examples and source

Ticket #14, under spec #12. The new Next/Fumadocs Button document uses an executable example identity, separately labelled implementation source, and the retained interactive Button playground. Public registry component APIs, source and asset bytes are unchanged.

## Authoring and consumer contract

- `ComponentExample({ name })` associates the actual imported example with its maintained executable `.tsx` file. `button-example.tsx` itself uses the consumer import `@/components/ui/button` and includes its client directive; the viewer reads that same file without a second authored snippet or hidden consumer wrapper.
- `ComponentSource({ name, title? })` finds the main implementation through maintained registry metadata. It identifies the consumer filename and explicitly points to complete manual installation for supporting files. This main implementation viewer is not a replacement for ticket #15's complete installation closure.
- `CodeView({ code, filename, language?, label?, collapsible? })` provides bitmap syntax highlighting, native Button controls and a focusable scrolling code view. Collapsed presentation renders the first twelve lines while Copy uses the complete original string. Success follows the Clipboard API promise. Failure expands the file, selects its text and offers Select; manual copy events also write complete plain code, excluding decoration.
- Missing example/source names and file-read failures produce explicit alerts. There is no unresolved loading state. Bulk font/resource presentation belongs to the deferred viewer in #15; it must not create millions of glyph DOM nodes through this readable-code viewer.
- Documentation text traverses mixed inline children while preserving links and heading attributes/IDs. ASCII paragraph wrapping uses the native glyph advances and last-space/overlong-word rule across inline boundaries. Token shadows use integer channel division (`>> 2`), including green strings and white punctuation.

## Verification

The first public Base journey failed against the foundation because the matching example experience was missing. Its production green exercises keyboard Preview/Code switching, consumer-ready example code, complete copying, separately identified implementation, full raw implementation copying while collapsed, and Expand/Collapse.

A separate responsive red caught a real issue: the 390px page had a 876px document width although its code view scrolled internally. Absolutely positioned accessible bitmap text escaped an unpositioned scrolling ancestor. Documentation text/code containers now establish their positioning context, and the same mobile assertion passes with a 390px document width. Original registry bytes were preserved.

The focused production gate passed all three individually mapped Base cases, direct Uncheck typechecking of all three projects, generation and the Next production build/start under Bun. The source viewer's filesystem read is statically scoped to `registry/`, avoiding whole-project output tracing. Scoped Oxfmt passed. Oxlint could not load the existing `eslint-plugin-github` configuration (`TypeFlags.Intrinsic`); this is not a lint pass.

Native controls and the code directive were captured twice in independent isolated Minecraft launches. Both reference families retain cases, original-renderer harnesses, manifests, full frames, repeated captures and repeat proof. Existing captured references were not replaced. Native capture at 4% was incomplete; the permitted 10% cold native budget completed both launches with identical decoded pixels. Browser checks use the ordinary 4% guard.

Minecraft Java 26.2, pinned JAR SHA256 `40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290`, Java 25.0.1, GUI scale 2, `en_us`, default font and `#202020` background. Browser: Edge 156.0.4314.58, 1280×900, DPR 1, zoom 100%.

| Integrated reference case | Browser pixels | Differing RGBA pixels |
| --- | --: | --: |
| Preview/Code strip, Preview selected, normal | 29,088 | 0 |
| Preview/Code strip, Code selected and keyboard focused | 29,088 | 0 |
| Copy, normal, 60×20 logical | 4,800 | 0 |
| Actual `"use client";` line, green literal and white semicolon | 3,600 | 0 |
| Expand, normal, 60×20 logical | 4,800 | 0 |
| Collapse, normal, 60×20 logical | 4,800 | 0 |
| Retained default Button, 200×20 logical | 16,000 | 0 |

The actual comparison function rejects a deliberate one-pixel reference corruption. Actual/diff images and metrics are written below `.pixel-perfect-test/browser/`. Desktop and 390×844 mobile full-page screenshots provide composition review; they do not establish a native whole-page identity. The local test server on 5184 is owned and stopped by each guarded task.

## Remaining integration acceptance

The website layout, Preview/Code choice and copy/source functions are web adaptations composed of Minecraft elements. The table proves only its listed reference cases. Extra native capture scales/states were not promoted into browser Base coverage or executed as a Full matrix. Broader mixed-paragraph layout, Unicode wrapping and native bold/italic treatment do not inherit a pixel-perfect claim from the directive case.

Fresh Turbopack development-browser attempts stalled, while the same meaningful production journey passed. Preserve this contributor-workflow gap for #22 rather than claiming a development-browser pass. Clipboard rejection and unavailable/read-failure branches have explicit implementations; the production Base journey establishes successful default copying, not every failure environment.

Ticket #15 supplies complete manual installation and deferred bulk-resource delivery. Independent copied-example Next/Vite consumer acceptance, final merged website verification and a live user acceptance preview remain required by #12/#22. This ticket's checks do not complete those separate gates. No Full tests, pushes, issue changes or deployment were performed.
