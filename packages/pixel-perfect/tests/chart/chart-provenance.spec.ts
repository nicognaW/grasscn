import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import type { CapturedReferenceCase } from "@ppt/installed/reference-case";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

interface ChartProvenanceCase extends CapturedReferenceCase {
  page: number;
  x: number;
  y: number;
}

interface ChartFramePin {
  name: string;
  sha256: string;
}

interface ChartProvenanceManifest {
  sourceJarSha256: string;
  captureSourceSha256: string;
  caseDefinitionSha256: string;
  cases: ChartProvenanceCase[];
  frames: ChartFramePin[];
}

interface ChartRepeatedCase {
  name: string;
  mismatchedPixels: number;
  decodedRgbaSha256: string;
}

interface ChartProvenanceRepeat {
  sourceJarSha256: string;
  captureSourceSha256: string;
  caseDefinitionSha256: string;
  cases: ChartRepeatedCase[];
}

const hash = (b: Buffer) => createHash("sha256").update(b).digest("hex");

for (const kind of ["fps", "pie"]) {
  test(`Chart ${kind} expected pixels come from pinned original full frames and source snapshots`, () => {
    const dir = `tests/reference/chart-${kind}`;

    // SAFETY: Both retained Chart FPS/Pie manifests supply the consumed identity strings, positioned/page cases and frame name/hash pins; all original provenance checks remain.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact retained producer boundary; preserve the existing fresh runtime read/parse phase.
    const m = JSON.parse(
      readFileSync(pixelPerfectFile(`${dir}/manifest.json`), "utf-8")
    ) as ChartProvenanceManifest;

    // SAFETY: Both retained Chart FPS/Pie repeatability artifacts contain these identity strings and per-case numeric mismatch/string decoded-digest records; original checks remain.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact retained producer boundary; preserve the existing fresh runtime read/parse phase.
    const r = JSON.parse(
      readFileSync(pixelPerfectFile(`${dir}/repeatability.json`), "utf-8")
    ) as ChartProvenanceRepeat;

    expect(
      hash(
        readFileSync(
          pixelPerfectFile(`${dir}/source/ControlsReferenceMain.java`)
        )
      )
    ).toBe(m.captureSourceSha256);
    expect(hash(readFileSync(pixelPerfectFile(`${dir}/cases.json`)))).toBe(
      m.caseDefinitionSha256
    );
    expect(r.sourceJarSha256).toBe(m.sourceJarSha256);
    expect(r.captureSourceSha256).toBe(m.captureSourceSha256);
    expect(r.caseDefinitionSha256).toBe(m.caseDefinitionSha256);

    for (const c of m.cases) {
      const bytes = readFileSync(pixelPerfectFile(`${dir}/captures/${c.name}`));
      const expected = PNG.sync.read(bytes);
      const frameName = `native-controls-p${c.page}-s${c.scale}.png`;

      const frameBytes = readFileSync(
        pixelPerfectFile(`${dir}/frames/${frameName}`)
      );

      const frame = PNG.sync.read(frameBytes);
      const pixels = Buffer.alloc(expected.width * expected.height * 4);

      expect(hash(bytes)).toBe(c.sha256);
      expect(hash(frameBytes)).toBe(
        // SAFETY: Each retained FPS/Pie case page/scale has exactly one frame pin in its paired manifest; this bounded retained relation preserves the original lookup and raw failure path.
        // SAFETY: Each retained FPS/Pie case page and scale has exactly one matching original frame-name/hash pin; preserve the existing lookup and complete PNG crop verification.
        /* oxlint-disable typescript/no-unsafe-type-assertion -- Exact owned producer/API boundary; no additional runtime guard. */
        (
          m.frames.find(
            (f: { name: string }) => f.name === frameName
          ) as ChartFramePin
        )
          /* oxlint-enable typescript/no-unsafe-type-assertion */
          .sha256
      );

      for (let y = 0; y < expected.height; y += 1) {
        const start = ((c.y * c.scale + y) * frame.width + c.x * c.scale) * 4;
        frame.data.copy(
          pixels,
          y * expected.width * 4,
          start,
          start + expected.width * 4
        );
      }

      expect(pixels.equals(expected.data)).toBe(true);

      // SAFETY: Each retained FPS/Pie case has exactly one paired repeat record with the consumed mismatch/digest fields. Preserve this bounded retained lookup and its raw failure path.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact paired retained capture/repeat relation; no new success check or fallback.
      const repeated = r.cases.find(
        (v: { name: string }) => v.name === c.name
      ) as ChartRepeatedCase;

      expect(repeated.mismatchedPixels).toBe(0);
      expect(repeated.decodedRgbaSha256).toBe(hash(expected.data));
    }
  });
}
