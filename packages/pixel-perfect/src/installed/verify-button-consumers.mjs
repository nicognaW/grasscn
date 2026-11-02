import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import { sha256 } from "@grasscn/tests/consumer-boundary";
import { parseWebsiteIdentity } from "@grasscn/tests/consumer-validation";
import {
  sourceIdentity,
  assertProductionSource,
  productionBuildIdentity,
} from "@grasscn/tests/next-production";
import {
  readPreparedConsumerProjects,
  servePreparedConsumer,
  consumerVerificationEnvironment,
} from "@grasscn/tests/prepared-consumers";

import {
  pixelPerfectRoot,
  pixelPerfectTestRoot,
  referenceFile,
} from "../paths.ts";
import {
  parseNativeManifest,
  parseBaseCatalogue,
} from "./button-consumer-types.ts";

// The caller explicitly selects this one existing website-default Base case.
assert.equal(
  process.env.GRASSCN_CONSUMER_PPT,
  "button-default",
  "Explicit button-default consumer PPT selection required"
);

const source = await sourceIdentity();

const websiteIdentity = parseWebsiteIdentity(
  process.env.GRASSCN_WEBSITE_IDENTITY ?? "null"
);

assertProductionSource(websiteIdentity, source);

const productionIdentity = await productionBuildIdentity({ source });

assert.equal(productionIdentity.outputSha256, websiteIdentity.outputSha256);

const manualDirectory = process.env.GRASSCN_MANUAL_CONSUMER_DIRECTORY;
const cliDirectory = process.env.GRASSCN_CLI_CONSUMER_DIRECTORY;

assert.ok(
  manualDirectory !== undefined &&
    manualDirectory !== "" &&
    cliDirectory !== undefined &&
    cliDirectory !== "",
  "Passed ordinary manual and CLI artifact directories required"
);

const projects = [
  ...(await readPreparedConsumerProjects({
    artifactDirectory: manualDirectory,
    kind: "manual",
    source,
    websiteIdentity,
  })),
  ...(await readPreparedConsumerProjects({
    artifactDirectory: cliDirectory,
    kind: "cli",
    source,
    websiteIdentity,
  })),
];

const outputRoot = path.join(pixelPerfectTestRoot, "installed-consumers");

const output = path.resolve(
  process.env.GRASSCN_CONSUMER_PPT_DIRECTORY ??
    path.join(outputRoot, String(Date.now()))
);

assert.ok(
  output.startsWith(outputRoot + path.sep),
  "Consumer PPT receipts belong to the specialized artifact owner"
);

await mkdir(output, { recursive: true });

try {
  await readFile(path.join(output, "report.json"));
  assert.fail("Consumer PPT requires fresh execution");
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
    throw error;
  }
}

const catalogue = parseBaseCatalogue(
  await readFile(
    new URL("../selection/base-cases.json", import.meta.url),
    "utf-8"
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
const manifest = parseNativeManifest(manifestBytes.toString("utf-8"));

assert.equal(
  manifest.sourceJarSha256,
  "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290"
);

const nativeCase = manifest.cases.find(
  (entry) => entry.name === "normal-w200-s2.png"
);

assert.deepEqual(
  {
    height: nativeCase.height,
    label: nativeCase.label,
    name: nativeCase.name,
    scale: nativeCase.scale,
    sha256: nativeCase.sha256,
    state: nativeCase.state,
    width: nativeCase.width,
  },
  {
    height: 20,
    label: "Button",
    name: "normal-w200-s2.png",
    scale: 2,
    sha256: "df62aa575215cf6cc5ab30488a19a53bfda5a32b85c3389da01bcb6968e1934c",
    state: "normal",
    width: 200,
  }
);

const referenceBytes = await readFile(
  referenceFile(`captures/${nativeCase.name}`)
);

assert.equal(sha256(referenceBytes), nativeCase.sha256);

const observer = createRequire(path.join(pixelPerfectRoot, "package.json"));

/** @type {typeof import("@playwright/test")} */
// eslint-disable-next-line typescript/no-unsafe-assignment -- Preserve the pinned observer module selected through its own package resolution.
const playwrightModule = observer("@playwright/test");
const { chromium } = playwrightModule;

/** @type {typeof import("pngjs")} */
// eslint-disable-next-line typescript/no-unsafe-assignment -- Preserve the pinned observer module selected through its own package resolution.
const pngModule = observer("pngjs");
const { PNG } = pngModule;

/** @param {import("pngjs").PNG} actual @param {import("pngjs").PNG} expected */
const compare = (actual, expected) => {
  assert.deepEqual(
    [actual.width, actual.height],
    [expected.width, expected.height]
  );
  const diff = new PNG({ height: actual.height, width: actual.width });
  let mismatchedPixels = 0;

  for (let offset = 0; offset < actual.data.length; offset += 4) {
    if (
      !actual.data
        .subarray(offset, offset + 4)
        .equals(expected.data.subarray(offset, offset + 4))
    ) {
      mismatchedPixels += 1;
      diff.data.set([255, 0, 0, 255], offset);
    }
  }

  return { diff, mismatchedPixels };
};

const expected = PNG.sync.read(referenceBytes);
const corrupted = PNG.sync.read(referenceBytes);

// Flip exactly one channel byte to prove the pixel comparator detects corruption.
// eslint-disable-next-line no-bitwise -- XOR changes exactly one low bit.
corrupted.data[0] ^= 1;

assert.equal(
  compare(corrupted, expected).mismatchedPixels,
  1,
  "Actual comparator must reject one-pixel corruption"
);

const report = {
  consumers: [],
  environment: {
    ...consumerVerificationEnvironment(),
    arch: process.arch,
    bun: Bun.version,
    deviceScaleFactor: 1,
    platform: process.platform,
    viewport: { height: 900, width: 1280 },
  },
  nonPptIncluded: false,
  onePixelCorruptionDetected: true,
  pptOnly: true,
  reference: {
    ...nativeCase,
    manifestSha256: sha256(manifestBytes),
    sourceJarSha256: manifest.sourceJarSha256,
  },
  selection: "button-default",
  source,
  status: "incomplete",
  websiteIdentity,
};

let browser;
let host;

try {
  browser = await chromium.launch({ channel: "msedge", headless: true });
  report.environment.browserVersion = browser.version();

  for (const [index, project] of projects.entries()) {
    assert.equal(
      project.browserVersion,
      browser.version(),
      "Ordinary runtime and PPT browser versions must match"
    );
    host = await servePreparedConsumer(project, { port: 5194 + index });

    const page = await browser.newPage({
      deviceScaleFactor: 1,
      viewport: report.environment.viewport,
    });

    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(host.url);
    await page.mouse.move(1000, 800);

    const button = project.id.startsWith("manual-")
      ? page
          .getByRole("region", { exact: true, name: "Consumer button" })
          .getByRole("button", { exact: true, name: "Button" })
      : page.getByRole("button", { exact: true, name: "Button" });

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
      actualSha256: sha256(bytes),
      host: host.identity,
      id: project.id,
      mismatchedPixels: comparison.mismatchedPixels,
      preparedArtifacts: project.artifactDirectory,
      referenceSha256: nativeCase.sha256,
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
  report.error =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  throw error;
} finally {
  await host?.close();
  await browser?.close();
  await writeFile(
    path.join(output, "report.json"),
    JSON.stringify(report, null, 2)
  );
}
