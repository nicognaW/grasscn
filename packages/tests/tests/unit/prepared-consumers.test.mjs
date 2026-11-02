import { test, expect } from "bun:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";

import { sha256 } from "@grasscn/tests/consumer-boundary";
import { repoRoot } from "@grasscn/tests/paths";
import {
  assertPreparedSnapshot,
  readPreparedConsumerProjects,
  consumerVerificationEnvironment,
} from "@grasscn/tests/prepared-consumers";

const source = { commit: "current", status: "", treeSha256: "current-source" };

const websiteIdentity = {
  buildId: "current-build",
  bun: Bun.version,
  outputSha256: "current-output",
  runtime: process.execPath,
  source,
};

const prepared = {
  bun: Bun.version,
  environment: consumerVerificationEnvironment(),
  source,
  status: "prepared",
  websiteIdentity,
};

test("prepared consumer refuses changed Bun runtime options", () => {
  const previous = process.env.BUN_OPTIONS;

  const snapshot = {
    ...prepared,
    environment: consumerVerificationEnvironment(),
  };

  try {
    process.env.BUN_OPTIONS = `${previous ?? ""} --smol`;
    expect(() => {
      assertPreparedSnapshot(snapshot, { source, websiteIdentity });
    }).toThrow("environment");
  } finally {
    if (previous === undefined) {
      delete process.env.BUN_OPTIONS;
    } else {
      process.env.BUN_OPTIONS = previous;
    }
  }
});

test("prepared consumer refuses changed platform architecture locale and timezone", () => {
  for (const key of ["platform", "arch", "locale", "timezone"]) {
    expect(() => {
      assertPreparedSnapshot(
        {
          ...prepared,
          environment: {
            ...prepared.environment,
            [key]: "different-environment",
          },
        },
        { source, websiteIdentity }
      );
    }).toThrow("environment");
  }
});

test("prepared consumer refuses another source or production build", () => {
  expect(() => {
    assertPreparedSnapshot(prepared, {
      source: { ...source, commit: "old" },
      websiteIdentity,
    });
  }).toThrow("source snapshot");
  expect(() => {
    assertPreparedSnapshot(prepared, {
      source,
      websiteIdentity: { ...websiteIdentity, outputSha256: "old" },
    });
  }).toThrow("build/runtime identity");
});

test("ordinary prepared consumers reject historical PPT-owned receipts", async () => {
  await assert.rejects(
    readPreparedConsumerProjects({
      artifactDirectory: path.join(
        repoRoot,
        ".pixel-perfect-test/manual-consumers/old"
      ),
      kind: "manual",
      source,
      websiteIdentity,
    }),
    /ordinary test-results owner/u
  );
});

test("prepared build alone cannot substitute for passed ordinary runtime", async () => {
  const owner = path.join(repoRoot, "test-results/manual-consumers");
  await mkdir(owner, { recursive: true });
  const directory = await mkdtemp(path.join(owner, "unit-prepared-"));

  const publicBytes = JSON.stringify({
    environment: prepared.environment,
    source,
    websiteIdentity,
  });

  await writeFile(path.join(directory, "public-inputs.json"), publicBytes);
  await writeFile(
    path.join(directory, "prepared.json"),
    JSON.stringify({ ...prepared, publicInputsSha256: sha256(publicBytes) })
  );
  await assert.rejects(
    readPreparedConsumerProjects({
      artifactDirectory: directory,
      kind: "manual",
      source,
      websiteIdentity,
    }),
    /report\.json/u
  );
});
