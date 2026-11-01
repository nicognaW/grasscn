import { test } from "bun:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";

import {
  validateHistoricalEvidence,
  assertCurrentSourceEvidence,
  historicalMapComponents,
} from "../../src/runtime/historical-evidence";

const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const origin = "977f538ddc56c7a432b49f96f41382282a65ff71";
const scope = "historical-source-snapshot";

const prepareFixture = async (directory: string) => {
  const archiveDirectory = path.join(directory, "archive");
  const sourcePath = "registry/ui/example.css";
  const reportPath = "tests/reference/example/installation.json";
  const original = Buffer.from("original source\r\n");
  const current = Buffer.from("recognized renamed source\r\n");
  const packed = gzipSync(original);
  const sourceSha256 = digest(original);
  const blob = `blobs/${sourceSha256}.gz`;
  const report = { files: [{ path: "example.css", sourceSha256 }] };
  const reportBytes = Buffer.from(JSON.stringify(report));

  const binding = {
    component: "example",
    files: [{ archiveSourceSha256: sourceSha256, sourcePath, sourceSha256 }],
    manifest: "tests/reference/example/manifest.json",
    registryItem: "example",
    reportPath,
    reportSha256: digest(reportBytes),
  };

  const archive = {
    files: [
      {
        bytes: original.length,
        compressedBytes: packed.length,
        compressedPath: blob,
        compressedSha256: digest(packed),
        rawSha256: sourceSha256,
        sourcePath,
        sourceSha256,
      },
    ],
    originCommit: origin,
    reports: [binding],
    schemaVersion: 1,
    scope,
  };

  const transitions = {
    files: [
      {
        classification: "preexisting-main-source-drift",
        currentSha256: digest(current),
        historicalSha256: sourceSha256,
        reason: "Recorded naming transition; no rendering equivalence claim.",
        sourcePath,
      },
    ],
    originCommit: origin,
    schemaVersion: 1,
  };

  const map = {
    components: [
      {
        implementation: {
          evidenceScope: scope,
          registryItem: "example",
          status: "implemented-and-install-verified",
        },
        name: "example",
        pixelVerification: {
          evidenceScope: scope,
          installationReport: reportPath,
          manifest: binding.manifest,
          status: "verified-declared-cases",
        },
      },
    ],
    recordedEvidenceScope: scope,
  };

  const registry = {
    items: [{ files: [{ path: sourcePath }], name: "example" }],
  };

  const resolvePath = (name: string) => path.join(directory, name);

  const json = async (
    name: string,
    value: typeof archive | typeof transitions
  ) => {
    await writeFile(path.join(archiveDirectory, name), JSON.stringify(value));
  };

  await mkdir(path.join(archiveDirectory, "blobs"), { recursive: true });
  await mkdir(path.dirname(resolvePath(sourcePath)), { recursive: true });
  await mkdir(path.dirname(resolvePath(reportPath)), { recursive: true });
  await writeFile(resolvePath(sourcePath), current);
  await writeFile(resolvePath(reportPath), reportBytes);
  await writeFile(path.join(archiveDirectory, blob), packed);
  await json("manifest.json", archive);
  await json("current-transitions.json", transitions);

  return {
    archive,
    archiveDirectory,
    blob,
    json,
    map,
    registry,
    reportPath,
    resolvePath,
    sourcePath,
    transitions,
  };
};

const fixture = async (
  run: (
    options: Awaited<ReturnType<typeof prepareFixture>>
  ) => Promise<void> | void
) => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "grasscn-historical-")
  );

  try {
    await run(await prepareFixture(directory));
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
};

test("historical proof authenticates exact original bytes and exposes current drift without granting current verification", async () => {
  await fixture(async (options) => {
    const result = await validateHistoricalEvidence(options);

    assert.equal(result.historicalIntegrity, "valid");
    assert.equal(result.scope, scope);
    assert.equal(result.reports[0].driftingFiles.length, 1);
    assert.equal(result.reports[0].matchingFiles.length, 0);
    assert.notEqual(
      result.reports[0].driftingFiles[0].currentSha256,
      result.reports[0].driftingFiles[0].sourceSha256
    );
    assert.throws(() => {
      assertCurrentSourceEvidence(result);
    }, /current-source/u);
  });
});

test("missing and corrupt historical archives fail", async () => {
  await fixture(async (options) => {
    await writeFile(
      path.join(options.archiveDirectory, options.blob),
      "corrupt"
    );
    await assert.rejects(validateHistoricalEvidence(options), /compressed/u);
    await rm(path.join(options.archiveDirectory, options.blob));
    await assert.rejects(validateHistoricalEvidence(options), /ENOENT/u);
  });
});

test("repacked wrong historical raw bytes fail even with the matching compressed hash", async () => {
  await fixture(async (options) => {
    const packed = gzipSync(Buffer.from("different old source"));

    options.archive.files[0].compressedSha256 = digest(packed);
    options.archive.files[0].compressedBytes = packed.length;
    await options.json("manifest.json", options.archive);
    await writeFile(path.join(options.archiveDirectory, options.blob), packed);
    await assert.rejects(validateHistoricalEvidence(options));
  });
});

test("edited historical report fails its exact declaring-report binding", async () => {
  await fixture(async (options) => {
    const original = await readFile(
      options.resolvePath(options.reportPath),
      "utf-8"
    );

    await writeFile(options.resolvePath(options.reportPath), `${original} `);
    await assert.rejects(validateHistoricalEvidence(options), /report hash/u);
  });
});

test("unknown current source changes fail instead of falling back to historical bytes", async () => {
  await fixture(async (options) => {
    await writeFile(
      options.resolvePath(options.sourcePath),
      "unreviewed implementation"
    );
    await assert.rejects(
      validateHistoricalEvidence(options),
      /unrecognized current source/u
    );
  });
});

test("forged current scope and wrong component association fail", async () => {
  await fixture(async (options) => {
    const evidence = await validateHistoricalEvidence(options);

    options.map.components[0].pixelVerification.evidenceScope =
      "current-source";
    assert.throws(
      () => historicalMapComponents(JSON.stringify(options.map), evidence),
      /historical scope/u
    );
    await assert.rejects(
      validateHistoricalEvidence(options),
      /historical scope/u
    );
    options.map.components[0].pixelVerification.evidenceScope = scope;
    options.archive.reports[0].component = "another-component";
    await options.json("manifest.json", options.archive);
    await assert.rejects(validateHistoricalEvidence(options), /binding/u);
  });
});

test("unmapped source entries and unused archive entries fail", async () => {
  await fixture(async (options) => {
    Reflect.deleteProperty(
      options.archive.reports[0].files[0],
      "archiveSourceSha256"
    );
    await options.json("manifest.json", options.archive);
    await assert.rejects(validateHistoricalEvidence(options), /binding/u);
  });
});

test("extra unused historical archive and transition bindings fail", async () => {
  await fixture(async (options) => {
    options.archive.files.push({
      ...options.archive.files[0],
      sourcePath: "registry/ui/unused.css",
    });
    options.transitions.files.push({
      ...options.transitions.files[0],
      sourcePath: "registry/ui/unused.css",
    });
    await options.json("manifest.json", options.archive);
    await options.json("current-transitions.json", options.transitions);
    await assert.rejects(
      validateHistoricalEvidence(options),
      /Unused historical archive/u
    );
  });
});
