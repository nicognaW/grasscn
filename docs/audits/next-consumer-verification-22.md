# External consumer verification for the Next website

The maintained harnesses exercise two separate distribution journeys. Manual projects receive copied executable examples from the actual documentation clipboard controls and complete files from its public installation manifests/downloads. The CLI project starts separately and receives every current registry item through its own installed real shadcn CLI and the owned Next production origin's `/r` endpoints. The independent Vite fixture remains a separate gate.

Both harnesses create fresh projects through `mkdtemp` outside the repository and every worktree ancestor. They clear `NODE_PATH`, reject ancestor `node_modules`, and require every direct application/toolchain dependency to resolve physically under the consumer's own `node_modules`. Installed byte identities, package/lock hashes, copied source/download hashes, prepared input/build output identities and final artifacts bind the result. Repository Playwright/pngjs are observers only. No old nested consumer or report is accepted as an independent pass.

## Guarded phases

The caller starts a new owned host through `serveNextProduction` in each guarded phase and closes it afterward. Pass `GRASSCN_PREVIEW_URL` without a trailing slash and `GRASSCN_WEBSITE_IDENTITY` as JSON containing the stable `{source,buildId,outputSha256,bun,runtime}` fields returned by that host. Record PID/process metadata separately per phase; a restarted owned host is acceptable only for identical source, production bytes and runtime. The harness recomputes production output identity too.

Choose one fresh artifact directory under `.pixel-perfect-test/manual-consumers/<run>` and reuse its path only for these ordered phases:

1. `GRASSCN_MANUAL_CONSUMER_PHASE=collect`, `GRASSCN_MANUAL_CONSUMER_DIRECTORY=<absolute artifact directory>`: run `bun packages/tests/scripts/verify-manual-consumers.mjs` at the browser's 10% guard. This uses public docs, Code tabs and Copy controls and records complete copied text plus public installation inventories in `public-inputs.json`.
2. `GRASSCN_MANUAL_CONSUMER_PHASE=prepare`: run the same script at the build's 4% guard with inherited `GOMEMLIMIT=768MiB`, `GOMAXPROCS=1` and `RAYON_NUM_THREADS=1`. It downloads every listed supporting file into fresh physically external Next/Vite projects, installs dependencies, checks types, builds and writes `prepared.json`. It does not launch a browser.
3. `GRASSCN_MANUAL_CONSUMER_PHASE=runtime`: run the script at 10%. It requires exact collection/preparation/source/environment/input/build/dependency identity before serving either consumer. It exercises both actual built applications and writes `report.json`. Collection and preparation are explicitly not runtime passes.

Similarly choose a separate fresh `.pixel-perfect-test/cli-consumers/<run>` directory. Set `GRASSCN_CLI_CONSUMER_DIRECTORY` and use `GRASSCN_CLI_CONSUMER_PHASE=prepare` at 4%, followed by `runtime` at 10%, running `bun packages/tests/scripts/verify-cli-consumer.mjs`. Preparation initializes an external shadcn-ready Vite project with its own shadcn 4.23.0, invokes actual `add <all current URLs> --yes --overwrite --cwd <project>`, checks every installed file/import closure, typechecks all installed TypeScript and builds. Runtime verifies prepared identities, then renders the installed Button and compares its existing Base native case with zero RGBA tolerance and a one-pixel negative control. Item/file counts come from current registry payloads rather than historical quotas.

All phases require the shared `nx-tools/run.ps1` mutex and resource ceilings. No Full browser matrix or positive Full execution is performed by these harnesses. Consumer directories and evidence are retained; these scripts perform no deletion.

## Declared manual runtime coverage

The copied examples exercise distinct installation/composition contracts in both Next and Vite:

- Button: existing `normal-w200-s2.png` native comparison with retained provenance, actual/diff images and one-pixel corruption rejection.
- Form: invalid submission, named fields, successful player/world save and reset.
- Code Block: visible complete code and exact successful clipboard payload. Its shipped support files also participate in types/build; this does not claim a new highlighted-code native matrix.
- Resizable: v4 separator keyboard sizing and imperative reset; Sidebar: controlled desktop collapse and actual mobile Sheet portal.
- Data Table: TanStack v9 features pagination, filter, row selection and empty result; Date Picker: actual installed October selection, formatted trigger, portal remaining open and Escape dismissal.
- Message Scroller: bounded history, First, append through the real input/form, stable count and Latest end gap.
- Alert Dialog and Command palette: actual portals, action callback, explicit close and trigger focus restoration.
- FPS, profiler and metric chart recipes: actual installed Recharts compositions, labelled visible chart output and screenshots. Other analytics layouts are not implied by these representatives.
- Map: caller-owned palette data and Camp marker callback; Trading: original embedded item PNGs decoded and trade counter callback; Sign: font/texture canvas readiness.
- Player Preview: built-in wide Steve and slim Alex WebGL2 readiness, model identity, keyboard rotation repaint and Home restoration, with individual canvas artifacts. No custom-skin/CORS or arbitrary raster fidelity is claimed.

The harness fails if any declared runtime observation fails. Page/code presence, side-effect imports, typecheck or successful production build alone do not establish those runtime results.

## Implementation evidence and acceptance status

During implementation, guarded TDD established external ancestor/descendant rejection and inherited module fallback rejection (2/2), and stale responding public registry payload rejection (1/1). An installed relative import escaping into an existing file outside the consumer was then demonstrated red and corrected. Contract/parsing verification is queued behind the shared guard at this handoff; its final result and the actual phased consumer runs must be recorded against the final integrated source. No consumer runtime or all-item CLI acceptance pass is claimed by this document yet.
