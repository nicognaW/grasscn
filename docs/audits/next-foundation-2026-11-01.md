# Next/Fumadocs foundation

Ticket #13 establishes a new website directly on Next.js App Router. The former Vite website files remain reference material for subsequent tickets; no legacy website adapter is mounted in Next.

## Interfaces for subsequent tickets

- Fumadocs `defineDocs` owns authored MDX under the application's content collection; its generated server source is consumed through the headless loader. Generated indexes are rebuildable and ignored.
- The optional docs catch-all resolves pages and metadata through that loader and renders the body with Grasscn's MDX mappings. Later navigation/search work can consume the same source and page tree.
- The shared site frame and MDX mappings use the existing registry Button, Typography and MinecraftText rendering. Plain paragraphs measure available logical width for the existing bitmap renderer. Existing public registry APIs and source bytes are unchanged.
- The first Button document is a foundation case, not the completed documentation experience from #14/#15. Its preview canvas uses the existing native-comparison background `#202020`; the actual Button remains 200 by 20 logical pixels at scale 2. Overflow is contained by the canvas rather than silently resizing the native geometry on mobile.
- Root generation/build entry points coordinate through Turbo. Website generation invokes Fumadocs and Next route type generation; it does not use the old catalog as a documentation owner. Generated route types and `next-env.d.ts` are ignored generation outputs, so direct Uncheck does not rely on a prior build and switching development/production does not dirty an authored environment declaration. Registry generation remains independently runnable. The separate browser fixture remains Vite. Next's automatic agent-rule generation is disabled to preserve repository-owned agent guidance.

## Toolchain selection

The application declares Next 16.4.2, Fumadocs core 16.10.7 and MDX 15.0.13. These follow the inspected upstream major lines and compatible published peer requirements for the existing React and Zod versions. Runtime execution is explicitly Bun-forced. The workspace remains Bun 1.4.4 and Turbo 2.11.10.

The architecture follows the inspected [shadcn source configuration](https://github.com/shadcn-ui/ui/blob/c0d63c339d6cd2fc26135590a54cf1f362269451/apps/v4/source.config.ts), [headless loader](https://github.com/shadcn-ui/ui/blob/c0d63c339d6cd2fc26135590a54cf1f362269451/apps/v4/lib/source.ts), and [Fumadocs Next integration](https://github.com/shadcn-ui/ui/blob/c0d63c339d6cd2fc26135590a54cf1f362269451/apps/v4/next.config.mjs), without adopting stock Fumadocs UI. Bun's [Next guide](https://bun.sh/guides/ecosystem/nextjs) supplies the runtime invocation pattern. The explicit Turbopack and output-tracing root identify the isolated workspace, avoiding an ancestor checkout's lockfile.

## Verification record

- **Red:** The newly classified default-document Base case failed against the original Vite website because the authored MDX content was absent. This exercised the real browser seam rather than asserting configuration text. Guarded baseline frozen installation passed before that run.
- **Dependency policy:** The new Bun lockfile was generated. The resolved-graph primitive check passed with no Radix route outside cmdk and no Vaul; registry closure passed for all 67 items in this snapshot.
- **Frozen installation:** Normal frozen Bun installation passed after the coordinating session warmed the official Next/SWC package cache sequentially with SHA-512 verification. This avoided bursts of concurrent Defender scanning without changing security settings; actual frozen package installation still ran and passed. Peak system CPU 23.16%, RAM 67.16%.
- **Fresh generated inputs:** With previous MDX, Next route-type and environment-declaration outputs moved aside to retained local backups, the public generation workflow, direct Uncheck typechecking of all three projects, primitive policy, registry closure and root production build passed. The new Next site prerendered its home, documentation index and first component document. Final-input run peak CPU 39.15%, RAM 71.18%.
- **Production and Base green:** The public Bun-driven Next production start served the new site on loopback port 5176. The focused default-document Base case passed; the actual integrated Button had **0 differing RGBA pixels out of 16,000** against the retained native case. Home, docs index and built Button registry JSON returned HTTP 200. Peak CPU 32.68%, RAM 68.48%.
- **Composition review:** Full-page artifacts cover desktop 1280x900 and mobile 390x844, DPR 1, Edge 156.0.4314.58. These are review evidence for a website composition, not new native pixel comparisons. The mobile preview scrolls horizontally rather than changing the native Button dimensions.
- **Development:** The public Bun-forced Next development entrypoint served the authored MDX document with HTTP 200. Its final owned-worker inspection run peaked at CPU 14.70%, RAM 69.58%, with no pauses. An earlier resource-interrupted attempt is not counted as a pass.
- **Runtime provenance:** The actual development process-family snapshot includes Next's server worker and Turbopack PostCSS evaluator running through Bun's node-named compatibility executable. Its SHA-256 exactly matches the installed Bun executable (`cb1d8e6564e655e49d30cead359750a1cbbd12f42651caa4b62244d7bd93c244`); executing it reports `process.versions.bun` as `1.4.4`. Process names alone would have incorrectly identified these as a Node fallback. The separate esbuild executable is a native compiler. Logs, process snapshots and composition/native actual/diff/reference evidence remain in the coordinating session's local artifacts.

The first document case is individually recorded in the Base catalogue and selection audit. Its intended integrated native comparison is `normal-w200-s2.png`: normal Button, scale 2, 400 by 40 browser pixels, desktop viewport 1280 by 900, device pixel ratio 1. The constituent pixel result does not establish native identity for the website layout, shell labels, other Markdown content, variants or mobile conditions.

## Remaining integration responsibilities

Mixed MDX child trees still need a deliberate faithful rendering path in the documentation UI work; applying Typography to a React fragment alone does not establish bitmap fidelity. New package-manager/source/navigation controls require their own applicable declared evidence. Whole-site compositions remain web adaptations with the hard Minecraft visual goal, not fictitious native screens.

Existing broad browser inventory files still read the former generated catalog/search metadata. The coordinating final verification ticket must reconcile those readers and old website-serving assumptions with the completed new content system. Preparing those old metadata files for initial inventory collection does not make them a new-site dependency, and an old receipt does not verify Next.

The homepage, chart showcase, full per-component documentation and complete consumer journey belong to subsequent tickets. No Full tests were run for this foundation.
