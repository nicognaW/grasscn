import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import type { Locator, TestInfo } from "@playwright/test";
import { PNG } from "pngjs";

import { test, expect } from "@grasscn/pixel-perfect/test";

const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176";

async function nativePixels(
  subject: Locator,
  family: string,
  name: string,
  prefix: string,
  info: TestInfo
) {
  const bytes = await readFile(
    new URL(`../../reference/${family}/captures/${name}`, import.meta.url)
  );
  const manifest: { cases: { name: string; sha256: string }[] } = JSON.parse(
    await readFile(
      new URL(`../../reference/${family}/manifest.json`, import.meta.url),
      "utf8"
    )
  );
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    manifest.cases.find((entry) => entry.name === name)?.sha256
  );
  const reference = PNG.sync.read(bytes);
  const actual = PNG.sync.read(
    await subject.screenshot({ path: info.outputPath(`${prefix}-actual.png`) })
  );
  expect([actual.width, actual.height]).toEqual([
    reference.width,
    reference.height,
  ]);
  const compare = (a: PNG, b: PNG) => {
    let differentPixels = 0;
    const diff = new PNG({ width: a.width, height: a.height });
    for (let offset = 0; offset < a.data.length; offset += 4) {
      if (
        !a.data
          .subarray(offset, offset + 4)
          .equals(b.data.subarray(offset, offset + 4))
      ) {
        differentPixels++;
        diff.data.set([255, 0, 0, 255], offset);
      }
    }
    return { differentPixels, diff };
  };
  const changed = PNG.sync.read(PNG.sync.write(reference));
  changed.data[0] ^= 1;
  expect(compare(changed, reference).differentPixels).toBe(1);
  const { differentPixels, diff } = compare(actual, reference);
  await writeFile(info.outputPath(`${prefix}-diff.png`), PNG.sync.write(diff));
  await writeFile(
    info.outputPath(`${prefix}-pixels.json`),
    JSON.stringify({
      reference: `${family}/${name}`,
      differentPixels,
      totalPixels: actual.width * actual.height,
      mutationRejected: true,
      browser: subject.page().context().browser()?.version(),
      viewport: subject.page().viewportSize(),
      devicePixelRatio: await subject.page().evaluate(() => devicePixelRatio),
    })
  );
  expect(differentPixels).toBe(0);
}

test("chart example tabs remain visible and match their Minecraft modes", async ({
  page,
}, info) => {
  await page.goto(`${origin}/charts`);
  const example = page.getByRole("region", {
    name: "API response time",
    exact: true,
  });
  const tabs = example.getByRole("tablist", {
    name: "API response time example view",
    exact: true,
  });
  await expect(
    tabs.getByRole("tab", { name: "Preview", exact: true })
  ).toBeInViewport({ ratio: 1 });
  await expect(
    tabs.getByRole("tab", { name: "Code", exact: true })
  ).toBeInViewport({ ratio: 1 });
  await page.mouse.move(0, 0);
  await nativePixels(
    tabs,
    "showcase-code-tabs",
    "showcase-tabs-preview-s2.png",
    "showcase-tabs-preview",
    info
  );
  await tabs.getByRole("tab", { name: "Code", exact: true }).click();
  await example.getByRole("button", { name: "Copy", exact: true }).focus();
  await page.mouse.move(0, 0);
  await nativePixels(
    tabs,
    "showcase-code-tabs",
    "showcase-tabs-code-s2.png",
    "showcase-tabs-code",
    info
  );
});

test("chart showcase default frame timing matches its original Minecraft renderer", async ({
  page,
}, info) => {
  await page.goto(`${origin}/charts`);
  const chart = page
    .getByRole("region", { name: "Frame timing", exact: true })
    .locator(".mc-chart");
  await expect(chart.locator('[data-slot="chart-fps-frame"]')).toHaveAttribute(
    "data-mc-ready",
    "true"
  );
  await page.mouse.move(0, 0);
  await nativePixels(
    chart,
    "showcase-frame-timing",
    "showcase-frame-timing-s1.png",
    "showcase-frame-timing",
    info
  );
});

test("homepage default checkbox retains its captured Minecraft pixels", async ({
  page,
}, info) => {
  await page.goto(origin);
  const checkbox = page.getByRole("checkbox", {
    name: "Remember me",
    exact: true,
  });
  await expect(checkbox).toBeChecked();
  await page.mouse.move(0, 0);
  await nativePixels(
    checkbox,
    "controls",
    "checkbox-checked-normal-s2.png",
    "homepage-checkbox",
    info
  );
});
