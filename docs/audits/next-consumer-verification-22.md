# External consumer verification for the Next website

The maintained harnesses exercise two separate distribution journeys. Manual projects receive copied executable examples from the actual documentation clipboard controls and complete files from its public installation manifests/downloads. The CLI project starts separately and receives every current registry item through its own installed real shadcn CLI and the owned Next production origin's `/r` endpoints. The independent Vite fixture remains a separate gate.

Both harnesses create fresh projects through `mkdtemp` outside the repository and every worktree ancestor. They clear `NODE_PATH`, reject ancestor `node_modules`, and require every direct application/toolchain dependency to resolve physically under the consumer's own `node_modules`. Installed byte identities, package/lock hashes, copied source/download hashes, prepared input/build output identities and final artifacts bind the result. Repository Playwright is an observer only. No old nested consumer or report is accepted as an independent pass. Ordinary installation/runtime verification belongs to `packages/tests/src/installed` and has no PPT reference, comparator, catalogue or Base/Full gate.

## Guarded phases

The caller starts a new owned host through `serveNextProduction` in each guarded phase and closes it afterward. Pass `GRASSCN_PREVIEW_URL` without a trailing slash and `GRASSCN_WEBSITE_IDENTITY` as JSON containing the stable `{source,buildId,outputSha256,bun,runtime}` fields returned by that host. Record PID/process metadata separately per phase; a restarted owned host is acceptable only for identical source, production bytes and runtime. The harness recomputes production output identity too.

Choose one fresh artifact directory under `test-results/manual-consumers/<run>` and reuse its path only for these ordered phases:

1. `GRASSCN_MANUAL_CONSUMER_PHASE=collect`, `GRASSCN_MANUAL_CONSUMER_DIRECTORY=<absolute artifact directory>`: run `bun packages/tests/cli/verify-manual-consumers.ts` at the browser's 10% guard. This uses public docs, Code tabs, actual Clipboard API and Copy controls and records complete copied text plus public installation inventories in `public-inputs.json`.
2. `GRASSCN_MANUAL_CONSUMER_PHASE=prepare`: run the same script at the build's 4% guard with inherited `GOMEMLIMIT=768MiB`, `GOMAXPROCS=1` and `RAYON_NUM_THREADS=1`. It downloads every listed supporting file into fresh physically external Next/Vite projects, installs dependencies, checks types, builds and writes `prepared.json`. It does not launch a browser.
3. `GRASSCN_MANUAL_CONSUMER_PHASE=runtime`: run the script at 10%. It requires exact collection/preparation/source/environment/input/build/dependency identity before serving either consumer. It exercises both actual built applications and writes `report.json`. Collection and preparation are explicitly not runtime passes.

Similarly choose a separate fresh `test-results/cli-consumers/<run>` directory. Set `GRASSCN_CLI_CONSUMER_DIRECTORY` and use `GRASSCN_CLI_CONSUMER_PHASE=prepare` at 4%, followed by `runtime` at 10%, running `bun packages/tests/cli/verify-cli-consumer.ts`. Preparation initializes an external shadcn-ready Vite project with its own shadcn 4.23.0, invokes actual `add <all current URLs> --yes --overwrite --cwd <project>`, checks every installed file/import closure, typechecks all installed TypeScript and builds. Consumer-owned `packageBin` supports packages that hide their package.json through exports. Runtime verifies prepared identities, then renders and activates the installed Button. Item/file counts come from current registry payloads rather than historical quotas.

All phases require the approved shared resource mutex and ceilings. No PPT is executed by these ordinary phases. Consumer directories and evidence are retained; these scripts perform no deletion.

## Declared manual runtime coverage

The copied examples exercise distinct installation/composition contracts in both Next and Vite:

- Button: visibly rendered public copied example. Native comparison is separate and explicitly selected below.
- Form: invalid submission, named fields, successful player/world save and reset.
- Code Block: visible complete code and exact successful clipboard payload. Its shipped support files also participate in types/build; this does not claim a new highlighted-code native matrix.
- Resizable: v4 separator keyboard sizing and imperative reset; Sidebar: controlled desktop collapse and actual mobile Sheet portal.
- Data Table: TanStack v9 features pagination, filter, row selection and empty result; Date Picker: actual installed October selection, formatted trigger, portal remaining open and Escape dismissal.
- Message Scroller: bounded history, First, append through the real input/form, stable count and Latest end gap.
- Alert Dialog and Command palette: actual portals, action callback, explicit close and trigger focus restoration.
- FPS, profiler and metric chart recipes: actual installed Recharts compositions, labelled visible chart output and screenshots. Other analytics layouts are not implied by these representatives.
- Map: caller-owned palette data and Camp marker callback; Trading: original embedded item PNGs decoded and trade counter callback; Sign: font/texture canvas readiness.
- Player Preview: built-in wide Steve and slim Alex WebGL2 readiness, actual `Skin ready` callback, model identity, keyboard rotation repaint and Home restoration, with individual canvas artifacts. No custom-skin/CORS or arbitrary raster fidelity is claimed.

The harness fails if any declared runtime observation fails. Page/code presence, side-effect imports, typecheck or successful production build alone do not establish those runtime results.

## Explicit installed Button PPT

The public `@grasscn/tests/prepared-consumers` boundary reads and validates frozen ordinary prepared projects, including the completed ordinary runtime report, retained artifacts, physically independent dependencies, production bytes and source/public-copy identities. Its host helper serves these existing projects without installing or changing them. Neither helper imports PPT policy or native references.

Only after ordinary manual Next/Vite and CLI runtime passes, the caller may explicitly set `GRASSCN_CONSUMER_PPT=button-default` and run `bun packages/pixel-perfect/cli/verify-consumer-button.ts` at 10%. Pass the same stable website identity and both ordinary artifact directories; select a fresh `GRASSCN_CONSUMER_PPT_DIRECTORY` under `.pixel-perfect-test/installed-consumers/<run>`. This specialized entry requires the exact existing Button Base mapping and byte-pinned `normal-w200-s2.png`: Button text, normal state, 200 by 20 logical pixels, GUI scale 2, DPR 1, #202020 background and the retained Minecraft 26.2 JAR. It compares only that case in each of the three frozen consumer applications, writes separate actual/diff images and a PPT receipt, and proves one-pixel corruption rejection with the actual comparator. It does not execute other native cases, a Full matrix or ordinary behavior. The former mixed specialized manual-consumer entry is a thin explicit Button facade.

## Implementation evidence and acceptance status

Historical guarded TDD established external ancestor/descendant rejection and inherited module fallback rejection (2/2), and stale responding public registry payload rejection (1/1). An installed relative import escaping into an existing file outside the consumer was demonstrated red and corrected. These old-layout records do not verify the reconciled package structure. Normal unit contracts now also reject changed preparation source/build identities, old PPT-owned ordinary receipts and a prepared build without a completed ordinary runtime report. Integrated parsing/unit checks and all actual phased consumer runs remain required on the final combined source. No new-architecture consumer, all-item CLI or explicit Button PPT pass is claimed here yet.
