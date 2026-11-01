import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { repoRoot, resolveRepositoryPath } from "@ppt/paths";
import { PNG } from "pngjs";
const repo = repoRoot,
  primary = resolveRepositoryPath(path.join("tests/reference/scroll-area")),
  repeat = path.resolve(
    process.argv[2] ??
      path.join(repoRoot, ".pixel-perfect-test/scroll-area-repeat")
  ),
  dest = resolveRepositoryPath(path.join("tests/reference/resizable")),
  manifest = JSON.parse(fs.readFileSync(path.join(primary, "manifest.json"))),
  again = JSON.parse(fs.readFileSync(path.join(repeat, "manifest.json"))),
  hash = (b) => createHash("sha256").update(b).digest("hex");
fs.mkdirSync(path.join(dest, "captures"), { recursive: true });
fs.mkdirSync(path.join(dest, "repeat-crops"), { recursive: true });
const cases = [],
  repeated = [],
  frames = [],
  derivations = [];
assert.equal(manifest.sourceJarSha256, again.sourceJarSha256);
assert.equal(manifest.captureSourceSha256, again.captureSourceSha256);
assert.equal(manifest.caseDefinitionSha256, again.caseDefinitionSha256);
for (const scale of [1, 2, 3]) {
  const sourceCase = manifest.cases.find(
      (c) => c.name === `scroll-area-c54-s${scale}.png`
    ),
    repeatCase = again.cases.find((c) => c.name === sourceCase.name),
    sourceBytes = fs.readFileSync(
      path.join(primary, "captures", sourceCase.name)
    ),
    repeatBytes = fs.readFileSync(
      path.join(repeat, "captures", sourceCase.name)
    );
  assert.equal(hash(sourceBytes), sourceCase.sha256);
  assert.equal(hash(repeatBytes), repeatCase.sha256);
  const parent = PNG.sync.read(sourceBytes),
    parentAgain = PNG.sync.read(repeatBytes);
  assert.ok(parent.data.equals(parentAgain.data));
  const name = `native-scroll-thumb-s${scale}.png`,
    width = 6 * scale,
    height = 32 * scale,
    x = parent.width - width,
    y = 0,
    crop = new PNG({ width, height }),
    cropAgain = new PNG({ width, height });
  PNG.bitblt(parent, crop, x, y, width, height, 0, 0);
  PNG.bitblt(parentAgain, cropAgain, x, y, width, height, 0, 0);
  assert.ok(crop.data.equals(cropAgain.data));
  const first = PNG.sync.write(crop),
    second = PNG.sync.write(cropAgain);
  fs.writeFileSync(path.join(dest, "captures", name), first);
  fs.writeFileSync(path.join(dest, "repeat-crops", name), second);
  assert.equal(hash(first), hash(second));
  const frame = manifest.frames.find(
    (f) => f.name === `native-controls-p${sourceCase.page}-s${scale}.png`
  );
  assert.ok(frame);
  const frameBytes = fs.readFileSync(path.join(primary, "frames", frame.name));
  assert.equal(hash(frameBytes), frame.sha256);
  const full = PNG.sync.read(frameBytes),
    fullCrop = new PNG({ width, height });
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
  cases.push({
    name,
    element: "native-scrollbar-thumb-crop",
    state: "normal",
    width: 6,
    height: 32,
    x: sourceCase.x + sourceCase.width - 6,
    y: sourceCase.y,
    scale,
    background: sourceCase.background,
    sourceCase: sourceCase.name,
    sha256: hash(first),
  });
  repeated.push({
    name,
    runOnePngSha256: hash(first),
    runTwoPngSha256: hash(second),
    decodedRgbaSha256: hash(crop.data),
    mismatchedPixels: 0,
  });
  derivations.push({
    name,
    parentManifest: "tests/reference/scroll-area/manifest.json",
    parentCase: sourceCase.name,
    parentPngSha256: sourceCase.sha256,
    parentRepeatPngSha256: repeatCase.sha256,
    parentFullFrame: frame.name,
    parentFullFrameSha256: frame.sha256,
    cropWithinParent: { x, y, width, height },
    cropWithinFullFrame: {
      x: (sourceCase.x + sourceCase.width - 6) * scale,
      y: sourceCase.y * scale,
      width,
      height,
    },
    operation:
      "Exact bitblt crop of decoded original native pixels; no resampling or recoloring",
  });
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
  JSON.stringify(result, null, 2) + "\n"
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
  JSON.stringify(
    {
      sourceJarSha256: manifest.sourceJarSha256,
      captureSourceSha256: manifest.captureSourceSha256,
      caseDefinitionSha256: manifest.caseDefinitionSha256,
      method:
        "Exact crops independently derived and compared from two original native Scroll Area launches; both parent crops and original fullframes retained.",
      cases: repeated,
    },
    null,
    2
  ) + "\n"
);
fs.writeFileSync(
  path.join(dest, "crop-derivation.json"),
  JSON.stringify(
    {
      scope:
        "Native scrollbar thumb artwork only; no native Resizable widget is asserted.",
      cases: derivations,
    },
    null,
    2
  ) + "\n"
);
console.log(
  "Three native32logicalpixelthumbcrops independently repeat exactly; original fullframes/captureharness/cases pinned."
);
