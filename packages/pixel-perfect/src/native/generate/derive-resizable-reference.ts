// Ordered entries preserve generated source and provenance byte order.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { repoRoot, pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type scrollManifest from "../../../tests/reference/scroll-area/manifest.json";

const primary = pixelPerfectFile(path.join("tests/reference/scroll-area"));

const repeat = path.resolve(
  process.argv[2] ??
    path.join(repoRoot, ".pixel-perfect-test/scroll-area-repeat")
);

const dest = pixelPerfectFile(path.join("tests/reference/resizable"));

// SAFETY: the retained Scroll Area capture producer owns these exact frame/case fields; all source hashes and repeat checks remain active.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const manifest = JSON.parse(
  fs.readFileSync(path.join(primary, "manifest.json")).toString("utf-8")
) as typeof scrollManifest;

// SAFETY: the independently captured repeat uses the same native capture manifest schema.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const again = JSON.parse(
  fs.readFileSync(path.join(repeat, "manifest.json")).toString("utf-8")
) as typeof scrollManifest;

const hash = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

fs.mkdirSync(path.join(dest, "captures"), { recursive: true });

fs.mkdirSync(path.join(dest, "repeat-crops"), { recursive: true });

const cases = [];
const repeated = [];
const frames = [];
const derivations = [];

assert.equal(manifest.sourceJarSha256, again.sourceJarSha256);

assert.equal(manifest.captureSourceSha256, again.captureSourceSha256);

assert.equal(manifest.caseDefinitionSha256, again.caseDefinitionSha256);

// Walk backward so duplicate names retain the same first record as Array.find.
const sourceCases = new Map<string, (typeof manifest)["cases"][number]>();

for (let index = manifest.cases.length - 1; index >= 0; index -= 1) {
  const c = manifest.cases[index];

  sourceCases.set(c.name, c);
}

const repeatCases = new Map<string, (typeof again)["cases"][number]>();

for (let index = again.cases.length - 1; index >= 0; index -= 1) {
  const c = again.cases[index];

  repeatCases.set(c.name, c);
}

const sourceFrames = new Map<string, (typeof manifest)["frames"][number]>();

for (let index = manifest.frames.length - 1; index >= 0; index -= 1) {
  const f = manifest.frames[index];

  sourceFrames.set(f.name, f);
}

for (const scale of [1, 2, 3]) {
  const sourceCase =
    // SAFETY: The Scroll Area native capture producer emits scroll-area-c54 at all three GUI scales; the independently captured repeat uses those same case names and schema. Keep existing source and repeat hashes.
    /* oxlint-disable typescript/no-unsafe-type-assertion -- Exact owned producer/API boundary; no additional runtime guard. */
    sourceCases.get(
      `scroll-area-c54-s${scale}.png`
    ) as (typeof scrollManifest)["cases"][number];
  /* oxlint-enable typescript/no-unsafe-type-assertion */

  const repeatCase =
    // SAFETY: The Scroll Area native capture producer emits scroll-area-c54 at all three GUI scales; the independently captured repeat uses those same case names and schema. Keep existing source and repeat hashes.
    /* oxlint-disable typescript/no-unsafe-type-assertion -- Exact owned producer/API boundary; no additional runtime guard. */
    repeatCases.get(
      sourceCase.name
    ) as (typeof scrollManifest)["cases"][number];
  /* oxlint-enable typescript/no-unsafe-type-assertion */

  const sourceBytes = fs.readFileSync(
    path.join(primary, "captures", sourceCase.name)
  );

  const repeatBytes = fs.readFileSync(
    path.join(repeat, "captures", sourceCase.name)
  );

  assert.equal(hash(sourceBytes), sourceCase.sha256);
  assert.equal(hash(repeatBytes), repeatCase.sha256);

  const parent = PNG.sync.read(sourceBytes);
  const parentAgain = PNG.sync.read(repeatBytes);

  assert.ok(parent.data.equals(parentAgain.data));

  const name = `native-scroll-thumb-s${scale}.png`;
  const width = 6 * scale;
  const height = 32 * scale;
  const x = parent.width - width;
  const y = 0;
  const crop = new PNG({ height, width });
  const cropAgain = new PNG({ height, width });

  PNG.bitblt(parent, crop, x, y, width, height, 0, 0);
  PNG.bitblt(parentAgain, cropAgain, x, y, width, height, 0, 0);
  assert.ok(crop.data.equals(cropAgain.data));

  const first = PNG.sync.write(crop);
  const second = PNG.sync.write(cropAgain);

  fs.writeFileSync(path.join(dest, "captures", name), first);
  fs.writeFileSync(path.join(dest, "repeat-crops", name), second);
  assert.equal(hash(first), hash(second));

  const frame = sourceFrames.get(
    `native-controls-p${sourceCase.page}-s${scale}.png`
  );

  assert.ok(frame);
  const frameBytes = fs.readFileSync(path.join(primary, "frames", frame.name));
  assert.equal(hash(frameBytes), frame.sha256);

  const full = PNG.sync.read(frameBytes);
  const fullCrop = new PNG({ height, width });

  PNG.bitblt(
    full,
    fullCrop,
    (sourceCase.x + sourceCase.width - 6) * scale,
    sourceCase.y * scale,
    width,
    height,
    0,
    0
  );
  assert.ok(fullCrop.data.equals(crop.data));
  frames.push(frame);
  cases.push(
    Object.fromEntries([
      ["name", name],
      ["element", "native-scrollbar-thumb-crop"],
      ["state", "normal"],
      ["width", 6],
      ["height", 32],
      ["x", sourceCase.x + sourceCase.width - 6],
      ["y", sourceCase.y],
      ["scale", scale],
      ["background", sourceCase.background],
      ["sourceCase", sourceCase.name],
      ["sha256", hash(first)],
    ])
  );
  repeated.push(
    Object.fromEntries([
      ["name", name],
      ["runOnePngSha256", hash(first)],
      ["runTwoPngSha256", hash(second)],
      ["decodedRgbaSha256", hash(crop.data)],
      ["mismatchedPixels", 0],
    ])
  );
  derivations.push(
    Object.fromEntries([
      ["name", name],
      ["parentManifest", "tests/reference/scroll-area/manifest.json"],
      ["parentCase", sourceCase.name],
      ["parentPngSha256", sourceCase.sha256],
      ["parentRepeatPngSha256", repeatCase.sha256],
      ["parentFullFrame", frame.name],
      ["parentFullFrameSha256", frame.sha256],
      [
        "cropWithinParent",
        Object.fromEntries([
          ["x", x],
          ["y", y],
          ["width", width],
          ["height", height],
        ]),
      ],
      [
        "cropWithinFullFrame",
        Object.fromEntries([
          ["x", (sourceCase.x + sourceCase.width - 6) * scale],
          ["y", sourceCase.y * scale],
          ["width", width],
          ["height", height],
        ]),
      ],
      [
        "operation",
        "Exact bitblt crop of decoded original native pixels; no resampling or recoloring",
      ],
    ])
  );
}

const result = {
  source:
    "Exact scrollbar-thumb crops from the original native AbstractScrollArea capture. Resizable is a web composition; only the reused grip artwork has a native pixel counterpart.",
  minecraftVersion: manifest.minecraftVersion,
  sourceJarSha256: manifest.sourceJarSha256,
  captureSourceSha256: manifest.captureSourceSha256,
  caseDefinitionSha256: manifest.caseDefinitionSha256,
  glyphObservationEnabled: false,
  sourceDirectory: "../scroll-area/source",
  framesDirectory: "../scroll-area/frames",
  frames,
  cases,
  guiScales: [1, 2, 3],
  mods: [],
  resourcePacks: [],
  differenceTolerance: 0,
};

fs.writeFileSync(
  path.join(dest, "manifest.json"),
  `${JSON.stringify(result, null, 2)}\n`
);

fs.copyFileSync(
  path.join(primary, "cases.json"),
  path.join(dest, "cases.json")
);

assert.equal(
  hash(fs.readFileSync(path.join(dest, "cases.json"))),
  manifest.caseDefinitionSha256
);

fs.writeFileSync(
  path.join(dest, "repeatability.json"),
  `${JSON.stringify(
    Object.fromEntries([
      ["sourceJarSha256", manifest.sourceJarSha256],
      ["captureSourceSha256", manifest.captureSourceSha256],
      ["caseDefinitionSha256", manifest.caseDefinitionSha256],
      [
        "method",
        "Exact crops independently derived and compared from two original native Scroll Area launches; both parent crops and original fullframes retained.",
      ],
      ["cases", repeated],
    ]),
    null,
    2
  )}\n`
);

fs.writeFileSync(
  path.join(dest, "crop-derivation.json"),
  `${JSON.stringify(
    Object.fromEntries([
      [
        "scope",
        "Native scrollbar thumb artwork only; no native Resizable widget is asserted.",
      ],
      ["cases", derivations],
    ]),
    null,
    2
  )}\n`
);

console.log(
  "Three native32logicalpixelthumbcrops independently repeat exactly; original fullframes/captureharness/cases pinned."
);
