import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import {
  parseNativeManifest,
  nativeReference,
  parseInstallationCases,
  installationInventory,
} from "@ppt/runtime/docs-reference-types";
import { PNG } from "pngjs";

const compare = (actual: PNG, expected: PNG) => {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  const diff = new PNG({ height: actual.height, width: actual.width });
  let differentPixels = 0;

  for (let offset = 0; offset < actual.data.length; offset += 4) {
    if (
      !actual.data
        .subarray(offset, offset + 4)
        .equals(expected.data.subarray(offset, offset + 4))
    ) {
      differentPixels += 1;
      diff.data.set([255, 0, 0, 255], offset);
    }
  }

  return { diff, differentPixels };
};

test("default installation controls match their captured Minecraft content and states", async ({
  page,
}, info) => {
  const family = new URL(
    "../../reference/docs-installation-controls/",
    import.meta.url
  );

  const manifest = parseNativeManifest(
    await readFile(new URL("manifest.json", family), "utf-8")
  );

  const primaryCases = parseInstallationCases(
    await readFile(new URL("cases.json", family), "utf-8")
  );

  const filenameFamily = new URL(
    "../../reference/docs-installation-unicode-file/",
    import.meta.url
  );

  const filenameManifest = parseNativeManifest(
    await readFile(new URL("manifest.json", filenameFamily), "utf-8")
  );

  const filenameDefinitions = await readFile(
    new URL("cases.json", filenameFamily)
  );

  const filenameCases = parseInstallationCases(
    filenameDefinitions.toString("utf-8")
  );

  expect(filenameManifest.sourceJarSha256).toBe(manifest.sourceJarSha256);
  expect(filenameManifest.minecraftVersion).toBe(manifest.minecraftVersion);
  expect(createHash("sha256").update(filenameDefinitions).digest("hex")).toBe(
    filenameManifest.caseDefinitionSha256
  );
  expect(
    createHash("sha256")
      .update(
        await readFile(
          new URL("source/ControlsReferenceMain.java", filenameFamily)
        )
      )
      .digest("hex")
  ).toBe(filenameManifest.captureSourceSha256);
  expect(
    createHash("sha256")
      .update(
        await readFile(
          new URL("source-input/capture-controls.mjs", filenameFamily)
        )
      )
      .digest("hex")
  ).toBe(filenameManifest.captureRunnerSha256);
  const cases = [...primaryCases, ...filenameCases];

  const primaryReference = {
    directory: family,
    manifest,
    name: "docs-installation-controls",
  };

  const filenameReference = {
    directory: filenameFamily,
    manifest: filenameManifest,
    name: "docs-installation-unicode-file",
  };

  const records: {
    reference: string;
    differentPixels: number;
    totalPixels: number;
  }[] = [];

  let probe = false;

  const pixels = async (
    bytes: Buffer,
    identity: string,
    source = primaryReference
  ) => {
    const name = `${identity}-s2.png`;

    const reference = await readFile(
      new URL(`captures/${name}`, source.directory)
    );

    expect(createHash("sha256").update(reference).digest("hex")).toBe(
      nativeReference(source.manifest, name).sha256
    );
    const expected = PNG.sync.read(reference);

    if (!probe) {
      const corrupted = PNG.sync.read(reference);
      // eslint-disable-next-line no-bitwise -- Preserve the established exact byte operation for one-pixel negative controls or diagnostic RGBA shading.
      corrupted.data[0] ^= 1;
      expect(compare(corrupted, expected).differentPixels).toBe(1);
      probe = true;
    }

    const actual = PNG.sync.read(bytes);
    const result = compare(actual, expected);
    await writeFile(info.outputPath(`${identity}-actual.png`), bytes);
    await writeFile(
      info.outputPath(`${identity}-diff.png`),
      PNG.sync.write(result.diff)
    );
    records.push({
      differentPixels: result.differentPixels,
      reference: `${source.name}/${name}`,
      totalPixels: actual.width * actual.height,
    });
    await writeFile(
      info.outputPath("installation-native-pixels.json"),
      JSON.stringify(
        { cases: records, onePixelCorruptionDetected: probe },
        null,
        2
      )
    );
    expect(result.differentPixels, identity).toBe(0);
  };

  const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176";
  await page.goto(`${origin}/docs/components/button`);

  const installation = page.getByRole("region", {
    exact: true,
    name: "Button installation",
  });

  const methods = installation.getByRole("tablist", {
    exact: true,
    name: "Installation method",
  });

  await expect(methods).toHaveAttribute("data-mc-tabs-ready", "true");
  await page.mouse.move(0, 0);
  await pixels(await methods.screenshot(), "install-mode-cli");

  const managers = installation.getByRole("tablist", {
    exact: true,
    name: "Installation package manager",
  });

  await expect(managers).toHaveAttribute("data-mc-tabs-ready", "true");

  const verifyManagerSelection = async (manager: string) => {
    await managers.getByRole("tab", { exact: true, name: manager }).click();
    // Continue to the copy action: the reference declares an unfocused strip.
    await page.keyboard.press("Tab");
    await page.mouse.move(0, 0);
    await pixels(
      await managers.screenshot(),
      `install-pm-${manager.toLowerCase()}`
    );
  };

  for (const manager of ["npm", "pnpm", "Yarn", "Bun"]) {
    await verifyManagerSelection(manager);
  }

  await methods.getByRole("tab", { exact: true, name: "Manual" }).click();
  await page.keyboard.press("Tab");
  await page.mouse.move(0, 0);
  await pixels(await methods.screenshot(), "install-mode-manual");

  const selectors = installation.getByRole("navigation", {
    exact: true,
    name: "Manual files",
  });

  const completedValue1 = await page.request.get(
    `${origin}/api/installation/button`
  );

  const inventory = installationInventory(await completedValue1.json());

  await expect(selectors.getByRole("button")).toHaveCount(
    inventory.files.length
  );

  const verifyManualFileRow = async (
    file: (typeof inventory.files)[number]
  ) => {
    const label = file.source.split("/").at(-1);

    if (label === undefined) {
      throw new Error("Manual source path needs a filename");
    }

    const reference = cases.find(
      (entry) => entry.name.startsWith("install-file-") && entry.label === label
    );

    if (!reference) {
      throw new Error(
        `Missing captured reference for visible manual file ${label}`
      );
    }

    const button = selectors.getByRole("button", { exact: true, name: label });
    await button.scrollIntoViewIfNeeded();
    const viewport = installation.locator('[data-slot="scroll-area-viewport"]');
    const visible = await viewport.boundingBox();
    const bounds = await button.boundingBox();

    if (!visible || !bounds) {
      throw new Error("Manual file row is not visible");
    }

    // Browser scroll-into-view ignores the native viewport's 2px paint inset.
    // Wheel the row into its interior, as a visitor does when browsing the list.
    await page.mouse.move(
      visible.x + visible.width - 20,
      visible.y + visible.height / 2
    );
    await page.mouse.wheel(
      0,
      Math.round(bounds.y + bounds.height / 2 - visible.y - visible.height / 2)
    );
    await expect
      .poll(async () => {
        const row = await button.boundingBox();

        return Boolean(
          row &&
          row.y >= visible.y + 2 &&
          row.y + row.height <= visible.y + visible.height - 2
        );
      })
      .toBe(true);
    await page.mouse.move(0, 0);
    await pixels(
      await button.screenshot(),
      reference.name,
      filenameCases.includes(reference) ? filenameReference : primaryReference
    );
  };

  for (const file of inventory.files) {
    await verifyManualFileRow(file);
  }

  await selectors
    .getByRole("button", { exact: true, name: "minecraft-unifont-data.ts" })
    .click();

  const selected = installation.getByRole("region", {
    exact: true,
    name: "Selected manual file",
  });

  await page.mouse.move(0, 0);
  await pixels(
    await selected
      .getByRole("link", { exact: true, name: "Download" })
      .screenshot(),
    "install-action-download"
  );
  const load = selected.getByRole("button", { exact: true, name: "Load" });
  await pixels(await load.screenshot(), "install-action-load");
  await pixels(
    await selected
      .getByRole("button", { exact: true, name: "Copy full file" })
      .screenshot(),
    "install-action-copy-full-file"
  );
  await load.click();
  await expect(
    selected.getByLabel("minecraft-unifont-data.ts preview", { exact: true })
  ).toBeVisible();
  await page.mouse.move(0, 0);
  await pixels(await load.screenshot(), "install-action-load-disabled");
});
