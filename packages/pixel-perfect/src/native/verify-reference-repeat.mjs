import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { PNG } from "pngjs";

const [firstDir, secondDir] = process.argv.slice(2);

if (!firstDir || !secondDir) {
  throw new Error(
    "Pass the original and separately launched repeat capture directories"
  );
}

const read = async (dir) =>
  JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf-8"));

const first = await read(firstDir);
const second = await read(secondDir);

const hash = (data) => createHash("sha256").update(data).digest("hex");

for (const key of [
  "sourceJarSha256",
  "captureSourceSha256",
  "caseDefinitionSha256",
]) {
  assert.equal(first[key], second[key], `Capture identity differs: ${key}`);
}

assert.deepEqual(
  first.cases.map((c) => c.name).toSorted(),
  second.cases.map((c) => c.name).toSorted()
);

const cases = [];

for (const reference of first.cases) {
  const repeated = second.cases.find((c) => c.name === reference.name);
  const a = await readFile(path.join(firstDir, "captures", reference.name));
  const b = await readFile(path.join(secondDir, "captures", reference.name));
  assert.equal(hash(a), reference.sha256);
  assert.equal(hash(b), repeated.sha256);

  const actual = PNG.sync.read(a);
  const other = PNG.sync.read(b);

  assert.deepEqual([actual.width, actual.height], [other.width, other.height]);
  assert.ok(
    actual.data.equals(other.data),
    `Non-repeatable native pixels: ${reference.name}`
  );
  cases.push({
    decodedRgbaSha256: hash(actual.data),
    mismatchedPixels: 0,
    name: reference.name,
    runOnePngSha256: hash(a),
    runTwoPngSha256: hash(b),
  });
}

await writeFile(
  path.join(firstDir, "repeatability.json"),
  `${JSON.stringify(
    {
      captureSourceSha256: first.captureSourceSha256,
      caseDefinitionSha256: first.caseDefinitionSha256,
      cases,
      glyphObservationEnabled: {
        runOne: first.glyphObservationEnabled ?? null,
        runTwo: second.glyphObservationEnabled ?? null,
      },
      method:
        "Two separate isolated vanilla launches; decoded RGBA compared exactly per case",
      sourceJarSha256: first.sourceJarSha256,
    },
    null,
    2
  )}\n`
);

console.log(
  `${cases.length}/${cases.length} native cases repeat with identical decoded RGBA pixels`
);
