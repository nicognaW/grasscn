import { test, expect } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";

import { sha256 } from "@grasscn/tests/consumer-boundary";
import { repoRoot } from "@grasscn/tests/paths";
import {
  assertPreparedSnapshot,
  readPreparedConsumerProjects,
  consumerVerificationEnvironment,
} from "@grasscn/tests/prepared-consumers";

const source = { commit: "current", treeSha256: "current-source", status: "" };
const websiteIdentity = {
  source,
  buildId: "current-build",
  outputSha256: "current-output",
  bun: Bun.version,
  runtime: process.execPath,
};
const prepared = {
  status: "prepared",
  source,
  websiteIdentity,
  bun: Bun.version,
  environment: consumerVerificationEnvironment(),
};

test("prepared consumer refuses changed Bun runtime options", () => {
  const previous = process.env.BUN_OPTIONS;
  const snapshot = {
    ...prepared,
    environment: consumerVerificationEnvironment(),
  };
  try {
    process.env.BUN_OPTIONS = `${previous ?? ""} --smol`;
    expect(() =>
      assertPreparedSnapshot(snapshot, { source, websiteIdentity })
    ).toThrow("environment");
  } finally {
    if (previous === undefined) delete process.env.BUN_OPTIONS;
    else process.env.BUN_OPTIONS = previous;
  }
});

test("prepared consumer refuses changed platform architecture locale and timezone", () => {
  for (const key of ["platform", "arch", "locale", "timezone"])
    expect(() =>
      assertPreparedSnapshot(
        {
          ...prepared,
          environment: {
            ...prepared.environment,
            [key]: "different-environment",
          },
        },
        { source, websiteIdentity }
      )
    ).toThrow("environment");
});

test("prepared consumer refuses another source or production build", () => {
  expect(() =>
    assertPreparedSnapshot(prepared, {
      source: { ...source, commit: "old" },
      websiteIdentity,
    })
  ).toThrow("source snapshot");
  expect(() =>
    assertPreparedSnapshot(prepared, {
      source,
      websiteIdentity: { ...websiteIdentity, outputSha256: "old" },
    })
  ).toThrow("build/runtime identity");
});

test("ordinary prepared consumers reject historical PPT-owned receipts", async () => {
  await expect(
    readPreparedConsumerProjects({
      kind: "manual",
      artifactDirectory: path.join(
        repoRoot,
        ".pixel-perfect-test/manual-consumers/old"
      ),
      source,
      websiteIdentity,
    })
  ).rejects.toThrow("ordinary test-results owner");
});

test("prepared build alone cannot substitute for passed ordinary runtime", async () => {
  const owner = path.join(repoRoot, "test-results/manual-consumers");
  await mkdir(owner, { recursive: true });
  const directory = await mkdtemp(path.join(owner, "unit-prepared-"));
  const publicBytes = JSON.stringify({
    source,
    websiteIdentity,
    environment: prepared.environment,
  });
  await writeFile(path.join(directory, "public-inputs.json"), publicBytes);
  await writeFile(
    path.join(directory, "prepared.json"),
    JSON.stringify({ ...prepared, publicInputsSha256: sha256(publicBytes) })
  );
  await expect(
    readPreparedConsumerProjects({
      kind: "manual",
      artifactDirectory: directory,
      source,
      websiteIdentity,
    })
  ).rejects.toThrow("report.json");
});
