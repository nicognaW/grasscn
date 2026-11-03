import { test } from "bun:test";
import assert from "node:assert/strict";
import { mkdir, cp, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";

import { pixelPerfectTestRoot } from "@ppt/paths";
import { verifyPortingEvidence } from "@ppt/runtime/check-porting-evidence";
import { evidenceFile } from "@ppt/runtime/evidence-paths";
import type {
  TradingTraceRepeat,
  NativeMapRepeat,
} from "@ppt/runtime/porting-evidence-types";

test("evidence chain rejects corrupted inputs, generated outputs and stale trace identity", async () => {
  const scratchRoot = path.join(pixelPerfectTestRoot, "unit");
  await mkdir(scratchRoot, { recursive: true });
  const root = await mkdtemp(path.join(scratchRoot, "grasscn-evidence-"));

  const files = [
    "tests/reference/trading/scrollbar/manifest.json",
    "tests/reference/trading/scrollbar/interaction-repeatability.json",
    "tests/reference/trading/scrollbar/trading-scroll-events.json",
    ...[
      "terrain-provenance.json",
      "map-world-generation.json",
      "generation-repeatability.json",
      "inputs/map-world-input.json.gz",
      "map-world.colors",
    ].map((name) => `tests/reference/map/demo-world/${name}`),
    "preview/demos/map-world-data.ts",
    "tests/reference/player-preview/custom-skins/skin-provenance.json",
    "tests/fixture/dream-skin.png",
    "tests/fixture/steve-skin.png",
  ];

  try {
    for (const file of files) {
      await cp(evidenceFile(file), path.join(root, file), {
        recursive: true,
      });
    }

    await verifyPortingEvidence(root);

    for (const file of [
      "tests/reference/map/demo-world/map-world.colors",
      "tests/reference/map/demo-world/inputs/map-world-input.json.gz",
      "tests/fixture/dream-skin.png",
    ]) {
      const target = path.join(root, file);
      // oxlint-disable-next-line eslint/no-await-in-loop -- Restore each exclusive integrity mutation before probing another field or file.
      const original = await readFile(target);
      const changed = Buffer.from(original);

      // Deliberately flip one frozen-input bit to prove the integrity chain rejects corruption.
      // oxlint-disable-next-line eslint/no-bitwise
      changed[0] ^= 1;
      // oxlint-disable-next-line eslint/no-await-in-loop -- Restore each exclusive integrity mutation before probing another field or file.
      await writeFile(target, changed);
      // oxlint-disable-next-line eslint/no-await-in-loop -- Restore each exclusive integrity mutation before probing another field or file.
      await assert.rejects(verifyPortingEvidence(root));
      // oxlint-disable-next-line eslint/no-await-in-loop -- Restore each exclusive integrity mutation before probing another field or file.
      await writeFile(target, original);
    }

    for (const [file, mutate] of [
      [
        "tests/reference/trading/scrollbar/interaction-repeatability.json",
        (original: Buffer) => {
          // SAFETY: this named fixture is the retained trading-trace repeatability report.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion
          const data = JSON.parse(
            original.toString("utf-8")
          ) as TradingTraceRepeat;

          data.captureSourceSha256 = "0".repeat(64);

          return JSON.stringify(data);
        },
      ],
      [
        "tests/reference/map/demo-world/generation-repeatability.json",
        (original: Buffer) => {
          // SAFETY: this named fixture is the retained native map-generation repeatability report.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion
          const data = JSON.parse(
            original.toString("utf-8")
          ) as NativeMapRepeat;

          data.generationRunTwo.unsupportedRequests = 1;

          return JSON.stringify(data);
        },
      ],
    ] satisfies [string, (original: Buffer) => string][]) {
      const target = path.join(root, file);
      // oxlint-disable-next-line eslint/no-await-in-loop -- Restore each exclusive integrity mutation before probing another field or file.
      const original = await readFile(target);

      // oxlint-disable-next-line eslint/no-await-in-loop -- Restore each exclusive integrity mutation before probing another field or file.
      await writeFile(target, mutate(original));
      // oxlint-disable-next-line eslint/no-await-in-loop -- Restore each exclusive integrity mutation before probing another field or file.
      await assert.rejects(verifyPortingEvidence(root));
      // oxlint-disable-next-line eslint/no-await-in-loop -- Restore each exclusive integrity mutation before probing another field or file.
      await writeFile(target, original);
    }

    const target = path.join(root, "preview/demos/map-world-data.ts");
    const original = await readFile(target, "utf-8");

    await writeFile(
      target,
      original.replace(
        /(?<assignment>worldMapPaletteBase64\s*=\s*")[A-Za-z0-9+/]/u,
        "$1A"
      )
    );
    await assert.rejects(verifyPortingEvidence(root));
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});
