import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { PNG } from "pngjs";

import { pixelPerfectTest as test, expect } from "./verified-test";

function compare(actual: PNG, expected: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  const diff = new PNG({ width: actual.width, height: actual.height });
  let differentPixels = 0;
  for (let offset = 0; offset < actual.data.length; offset += 4) {
    if (
      !actual.data
        .subarray(offset, offset + 4)
        .equals(expected.data.subarray(offset, offset + 4))
    ) {
      differentPixels++;
      diff.data.set([255, 0, 0, 255], offset);
    }
  }
  return { differentPixels, diff };
}

test("default installation controls match their captured Minecraft content and states", async ({
  page,
}, info) => {
  const family = new URL(
    "./reference/docs-installation-controls/",
    import.meta.url
  );
  const manifest = JSON.parse(
    await readFile(new URL("manifest.json", family), "utf8")
  );
  const cases: { name: string; element: string; label?: string }[] = JSON.parse(
    await readFile(new URL("cases.json", family), "utf8")
  );
  const records: {
    reference: string;
    differentPixels: number;
    totalPixels: number;
  }[] = [];
  let probe = false;
  async function pixels(bytes: Buffer, identity: string) {
    const name = `${identity}-s2.png`;
    const reference = await readFile(new URL(`captures/${name}`, family));
    expect(createHash("sha256").update(reference).digest("hex")).toBe(
      manifest.cases.find((entry: { name: string }) => entry.name === name)
        .sha256
    );
    const expected = PNG.sync.read(reference);
    if (!probe) {
      const corrupted = PNG.sync.read(reference);
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
      reference: `docs-installation-controls/${name}`,
      differentPixels: result.differentPixels,
      totalPixels: actual.width * actual.height,
    });
    await writeFile(
      info.outputPath("installation-native-pixels.json"),
      JSON.stringify(
        { onePixelCorruptionDetected: probe, cases: records },
        null,
        2
      )
    );
    expect(result.differentPixels, identity).toBe(0);
  }
  const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176";
  await page.goto(`${origin}/docs/components/button`);
  const installation = page.getByRole("region", {
    name: "Button installation",
    exact: true,
  });
  const methods = installation.getByRole("tablist", {
    name: "Installation method",
    exact: true,
  });
  await expect(methods).toHaveAttribute("data-mc-tabs-ready", "true");
  await page.mouse.move(0, 0);
  await pixels(await methods.screenshot(), "install-mode-cli");
  const managers = installation.getByRole("tablist", {
    name: "Installation package manager",
    exact: true,
  });
  await expect(managers).toHaveAttribute("data-mc-tabs-ready", "true");
  for (const manager of ["npm", "pnpm", "Yarn", "Bun"]) {
    await managers.getByRole("tab", { name: manager, exact: true }).click();
    // Continue to the copy action: the reference declares an unfocused strip.
    await page.keyboard.press("Tab");
    await page.mouse.move(0, 0);
    await pixels(
      await managers.screenshot(),
      `install-pm-${manager.toLowerCase()}`
    );
  }
  await methods.getByRole("tab", { name: "Manual", exact: true }).click();
  await page.keyboard.press("Tab");
  await page.mouse.move(0, 0);
  await pixels(await methods.screenshot(), "install-mode-manual");
  const selectors = installation.getByRole("navigation", {
    name: "Manual files",
    exact: true,
  });
  const inventory = await (
    await page.request.get(`${origin}/api/installation/button`)
  ).json();
  await expect(selectors.getByRole("button")).toHaveCount(
    inventory.files.length
  );
  for (const file of inventory.files) {
    const label = file.source.split("/").at(-1);
    const reference = cases.find(
      (entry) => entry.name.startsWith("install-file-") && entry.label === label
    );
    if (!reference)
      throw Error(
        `Missing captured reference for visible manual file ${label}`
      );
    const button = selectors.getByRole("button", { name: label, exact: true });
    await button.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await pixels(await button.screenshot(), reference.name);
  }
  await selectors
    .getByRole("button", { name: "minecraft-unifont-data.ts", exact: true })
    .click();
  const selected = installation.getByRole("region", {
    name: "Selected manual file",
    exact: true,
  });
  await page.mouse.move(0, 0);
  await pixels(
    await selected
      .getByRole("link", { name: "Download", exact: true })
      .screenshot(),
    "install-action-download"
  );
  const load = selected.getByRole("button", { name: "Load", exact: true });
  await pixels(await load.screenshot(), "install-action-load");
  await pixels(
    await selected
      .getByRole("button", { name: "Copy full file", exact: true })
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
