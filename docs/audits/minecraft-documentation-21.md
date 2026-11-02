# Minecraft-specific component documentation (#21)

Tested implementation: `d8c2bf7`, including integration `e508c8923271a040a3792260d68cc29ece218ecf` (#18). The adjacent [source receipt](minecraft-documentation-21-source-receipt.json) pins every authored source file, guard result and local artifact hash. This audit-only commit does not change those runtime bytes.

Nine canonical MDX pages now own Advancement Tree, Book, Hotbar, HUD, Sign, Player Preview, Map, Trading and Player List. Each preserves Preview/Usage/Composition/Installation anchors, uses the actual owning Installation/ComponentSource identity, and retains only the individual legacy demo as an additional playground. Fourteen maintained consumer examples bind directly to their exact displayed filename through the Minecraft family catalog. No legacy site/router is mounted, and no registry API, resource or captured-reference byte changes.

The examples have no hidden demo helpers. Map creates all 16,384 palette bytes inline; its two-color tile is illustrative data, not a saved-world capture. Trading embeds the original emerald and Bread PNGs with explicit sizing. Steve/Alex use delivered built-in textures; WebGL2 is required and loading failures are surfaced. Caller URL/64x64/CORS/model requirements and the optional third-party username service are documented. HUD has no invented HUD root. Meters are display pieces; trade callbacks do not mutate inventory. HUD damage controls and locator heading controls explicitly require Button, with shared complete installation exposed on their pages.

## Verification

- TDD: the first Book public-render test failed because its maintained example was absent; after implementation it passed with first-page document semantics and only forward paging available.
- Frozen Bun installation passed at 4% CPU. The initial 10% installation was interrupted by the whole-system CPU guard; it is not a pass.
- Generation, direct Uncheck web/tests typechecks and 19-file scoped formatting passed. Scoped Oxlint could not load the existing GitHub plugin because `TypeFlags.Intrinsic` is undefined. It is a configuration failure, not lint success, and no rule/config was weakened.
- The first build compiled but Next's TypeScript-Go incremental emit failed `VirtualAlloc errno=1455` under the 4 GiB job cap. Global RAM peaked at 82.68%, below the 90% ceiling; this was not a global RAM-ceiling failure.
- Retrying with inherited `GOMEMLIMIT=768MiB`, guard `GOMAXPROCS=1`/`RAYON_NUM_THREADS=1`, 4% CPU and the unchanged 4 GiB job cap passed. The final source build retained Next's checker, compiled, checked types and generated 65/65 pages. Final guard CPU/RAM peaks: 52.65%/75.29%, one pause/resume.
- The final Bun/Next production server on owned loopback port 5191 ran three explicitly mapped Base cases in Edge/DPR1: exact maintained-code clipboard delivery across all nine pages; ordinary primary callbacks/readiness across all nine; and native Hotbar comparison. All three passed in 21.9 seconds. Guard peaks: 63.64% CPU/76.95% RAM, five pause/resumes. Owned server/browser closed afterward.
- The integrated primary empty Hotbar uses scale 2, selection 0 and explicit `#202020`; its retained `hotbar-0-s2.png` digest and native JAR identity were checked, and every decoded RGBA pixel matched. Other selections/scales were not executed.
- Local `.pixel-perfect-test/docs21/{desktop,mobile}.png` show the actual Hotbar documentation at 1440x1000 and 390x844. Inspection caught one unsupported en dash in new prose; the final ASCII wording was rebuilt and all three Base cases rerun. These page layouts are web adaptations, not whole-page native identity. The source receipt hashes both snapshots and the local runtime receipt.

Logs remain in canonical `.native-reference/nx-tools/logs/{red21-retry4,green21,build21retry,finalbuild21,finalbrowser21}.*`. The focused inventory contains exactly three uniquely mapped cases. Broad legacy generated-catalog collection remains #22's integration work; no old pipeline was restored. No Full tests, native Java matrix, public write or push ran.

## Consumer handoff and limits

`apps/web/examples/minecraft/` contains primary `advancement-tree-example.tsx`, `book-example.tsx`, `hotbar-example.tsx`, `hud-example.tsx`, `sign-example.tsx`, `player-preview-example.tsx`, `map-example.tsx`, `trading-example.tsx` and `player-list-example.tsx`. Additional consumer files are `hotbar-tools.tsx`, `sign-hanging.tsx`, `player-preview-alex.tsx`, `map-locator.tsx` and `player-list-scoreboard.tsx`. The catalog and playground wrapper are website glue, not extra files a consumer must copy.

#22 must copy the visitor-delivered files into physically external, independently installed Next/Vite consumers and check their own dependencies/resources. In particular assert Map's Camp marker callback using its inline byte array, Trading's Bread result counter using its embedded icons, and PlayerPreview's WebGL2 `data-ready=true`/Skin ready state with delivered built-in textures. This website run proves none of those independent consumer outcomes.

The new graph, field-guide prose, palette tile and single-offer market differ from legacy captured inputs. Their old gold cannot establish a match for changed data. Native assets and retained case provenance remain authoritative; fresh exact evidence for additional new content, other meter/sign/model/roster cases and whole composition review remain the integration acceptance scope. No universal native fidelity or new verified game version is claimed.
