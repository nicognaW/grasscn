// Integrity of a projected-reference corpus (ADR 0005) recorded in the
// coverage map: case definition, frozen harness copies and every retained
// image are bound to the manifest's hashes and source JAR.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { projectedManifestSchema } from "@ppt/native/projected-case";
import { evidenceFile } from "@ppt/runtime/evidence-paths";
import { PNG } from "pngjs";

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const read = async (file: string) => await readFile(evidenceFile(file));

/** Asserts the corpus behind `manifestFile` (a map-relative path) is intact. */
export const assertProjectedCorpus = async (
  manifestFile: string,
  sourceJarSha256: string
) => {
  const directory = path.dirname(manifestFile);

  const manifestBytes = await read(manifestFile);

  const manifest = projectedManifestSchema.parse(
    JSON.parse(manifestBytes.toString("utf-8"))
  );

  assert.equal(manifest.sourceJar.sha256, sourceJarSha256, "Source JAR");
  assert.ok(manifest.cases.length > 0, `${manifestFile}: no cases`);
  assert.equal(
    sha256(await read(path.join(directory, "case.json"))),
    manifest.caseDefinitionSha256,
    `${manifestFile}: case definition integrity`
  );

  const harness = await Promise.all(
    manifest.harnessSources.map(async (entry) => ({
      bytes: await read(path.join(directory, entry.file)),
      entry,
    }))
  );

  for (const { bytes, entry } of harness) {
    assert.equal(sha256(bytes), entry.sha256, `Frozen harness ${entry.file}`);
  }

  const images = manifest.cases.flatMap((reference) => [
    reference.reference,
    reference.mask,
    reference.sceneFrame,
    reference.backdropFrame,
  ]);

  const retained = await Promise.all(
    images.map(async (image) => ({
      bytes: await read(path.join(directory, image.file)),
      image,
    }))
  );

  for (const { bytes, image } of retained) {
    assert.equal(sha256(bytes), image.sha256, image.file);
    assert.equal(
      sha256(PNG.sync.read(bytes).data),
      image.decodedRgbaSha256,
      image.file
    );
  }

  return manifest.cases.length;
};
