import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import { sha256 } from "@grasscn/tests/consumer-boundary";
import {
  sourceIdentity,
  assertProductionSource,
  productionBuildIdentity,
} from "@grasscn/tests/next-production";
import { pixelPerfectRoot, pixelPerfectTestRoot } from "@grasscn/tests/paths";
import {
  readPreparedConsumerProjects,
  servePreparedConsumer,
  consumerVerificationEnvironment,
} from "@grasscn/tests/prepared-consumers";

import { referenceFile } from "../paths.ts";

// The caller explicitly selects this one existing website-default Base case.
assert.equal(
  process.env.GRASSCN_CONSUMER_PPT,
  "button-default",
  "Explicit button-default consumer PPT selection required"
);
const source = await sourceIdentity();
const websiteIdentity = JSON.parse(
  process.env.GRASSCN_WEBSITE_IDENTITY ?? "null"
);
assertProductionSource(websiteIdentity, source);
assert.equal(
  (await productionBuildIdentity({ source })).outputSha256,
  websiteIdentity.outputSha256
);
const manualDirectory = process.env.GRASSCN_MANUAL_CONSUMER_DIRECTORY;
const cliDirectory = process.env.GRASSCN_CLI_CONSUMER_DIRECTORY;
assert(
  manualDirectory && cliDirectory,
  "Passed ordinary manual and CLI artifact directories required"
);
const projects = [
  ...(await readPreparedConsumerProjects({
    kind: "manual",
    artifactDirectory: manualDirectory,
    source,
    websiteIdentity,
  })),
  ...(await readPreparedConsumerProjects({
    kind: "cli",
    artifactDirectory: cliDirectory,
    source,
    websiteIdentity,
  })),
];
const outputRoot = path.join(pixelPerfectTestRoot, "installed-consumers");
const output = path.resolve(
  process.env.GRASSCN_CONSUMER_PPT_DIRECTORY ??
    path.join(outputRoot, String(Date.now()))
);
assert(
  output.startsWith(outputRoot + path.sep),
  "Consumer PPT receipts belong to the specialized artifact owner"
);
await mkdir(output, { recursive: true });
try {
  await readFile(path.join(output, "report.json"));
  assert.fail("Consumer PPT requires fresh execution");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const catalogue = JSON.parse(
  await readFile(
    new URL("../selection/base-cases.json", import.meta.url),
    "utf8"
  )
);
assert.equal(
  catalogue.cases.filter(
    (entry) =>
      entry.file === "button/pixels.spec.ts" &&
      entry.title === "vanilla pixels: normal-w200-s2.png"
  ).length,
  1,
  "The exact Button default must remain uniquely mapped Base"
);
const manifestBytes = await readFile(referenceFile("manifest.json"));
const manifest = JSON.parse(manifestBytes);
assert.equal(
  manifest.sourceJarSha256,
  "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290"
);
const nativeCase = manifest.cases.find(
  (entry) => entry.name === "normal-w200-s2.png"
);
assert.deepEqual(
  {
    name: nativeCase.name,
    state: nativeCase.state,
    width: nativeCase.width,
    height: nativeCase.height,
    scale: nativeCase.scale,
    label: nativeCase.label,
    sha256: nativeCase.sha256,
  },
  {
    name: "normal-w200-s2.png",
    state: "normal",
    width: 200,
    height: 20,
    scale: 2,
    label: "Button",
    sha256: "df62aa575215cf6cc5ab30488a19a53bfda5a32b85c3389da01bcb6968e1934c",
  }
);
const referenceBytes = await readFile(
  referenceFile(`captures/${nativeCase.name}`)
);
assert.equal(sha256(referenceBytes), nativeCase.sha256);
const observer = createRequire(path.join(pixelPerfectRoot, "package.json"));
const { chromium } = observer("@playwright/test");
const { PNG } = observer("pngjs");
function compare(actual, expected) {
  assert.deepEqual(
    [actual.width, actual.height],
    [expected.width, expected.height]
  );
  const diff = new PNG({ width: actual.width, height: actual.height });
  let mismatchedPixels = 0;
  for (let offset = 0; offset < actual.data.length; offset += 4)
    if (
      !actual.data
        .subarray(offset, offset + 4)
        .equals(expected.data.subarray(offset, offset + 4))
    ) {
      mismatchedPixels++;
      diff.data.set([255, 0, 0, 255], offset);
    }
  return { mismatchedPixels, diff };
}
const expected = PNG.sync.read(referenceBytes);
const corrupted = PNG.sync.read(referenceBytes);
corrupted.data[0] ^= 1;
assert.equal(
  compare(corrupted, expected).mismatchedPixels,
  1,
  "Actual comparator must reject one-pixel corruption"
);
const report = {
  status: "incomplete",
  source,
  websiteIdentity,
  selection: "button-default",
  pptOnly: true,
  nonPptIncluded: false,
  reference: {
    ...nativeCase,
    sourceJarSha256: manifest.sourceJarSha256,
    manifestSha256: sha256(manifestBytes),
  },
  environment: {
    ...consumerVerificationEnvironment(),
    bun: Bun.version,
    platform: process.platform,
    arch: process.arch,
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  },
  consumers: [],
  onePixelCorruptionDetected: true,
};
let host, browser;
try {
  browser = await chromium.launch({ headless: true, channel: "msedge" });
  report.environment.browserVersion = browser.version();
  for (const [index, project] of projects.entries()) {
    assert.equal(
      project.browserVersion,
      browser.version(),
      "Ordinary runtime and PPT browser versions must match"
    );
    host = await servePreparedConsumer(project, { port: 5194 + index });
    const page = await browser.newPage({
      viewport: report.environment.viewport,
      deviceScaleFactor: 1,
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(host.url);
    await page.mouse.move(1000, 800);
    const button = project.id.startsWith("manual-")
      ? page
          .getByRole("region", { name: "Consumer button", exact: true })
          .getByRole("button", { name: "Button", exact: true })
      : page.getByRole("button", { name: "Button", exact: true });
    await button.waitFor();
    const bytes = await button.screenshot({ animations: "disabled" });
    const actual = PNG.sync.read(bytes);
    const comparison = compare(actual, expected);
    await writeFile(path.join(output, `${project.id}-actual.png`), bytes);
    await writeFile(
      path.join(output, `${project.id}-diff.png`),
      PNG.sync.write(comparison.diff)
    );
    const result = {
      id: project.id,
      host: host.identity,
      preparedArtifacts: project.artifactDirectory,
      actualSha256: sha256(bytes),
      referenceSha256: nativeCase.sha256,
      mismatchedPixels: comparison.mismatchedPixels,
      totalPixels: actual.width * actual.height,
    };
    report.consumers.push(result);
    assert.equal(
      comparison.mismatchedPixels,
      0,
      `Installed ${project.id} Button must match the exact native default`
    );
    assert.deepEqual(errors, []);
    await page.close();
    await host.close();
    host = undefined;
  }
  assert.deepEqual(
    await sourceIdentity(),
    source,
    "Source remained frozen during explicit consumer PPT"
  );
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.error = String(error.stack ?? error);
  throw error;
} finally {
  await host?.close();
  await browser?.close();
  await writeFile(
    path.join(output, "report.json"),
    JSON.stringify(report, null, 2)
  );
}
