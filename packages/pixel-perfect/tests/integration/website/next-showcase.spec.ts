import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { test, expect } from "@grasscn/pixel-perfect/test";
import type { Locator, TestInfo } from "@playwright/test";
import {
  parseNativeManifest,
  nativeReference,
} from "@ppt/runtime/docs-reference-types";
import { PNG } from "pngjs";

const compare = (a: PNG, b: PNG) => {
  let differentPixels = 0;
  const diff = new PNG({ height: a.height, width: a.width });

  for (let offset = 0; offset < a.data.length; offset += 4) {
    if (
      !a.data
        .subarray(offset, offset + 4)
        .equals(b.data.subarray(offset, offset + 4))
    ) {
      differentPixels += 1;
      diff.data.set([255, 0, 0, 255], offset);
    }
  }

  return { diff, differentPixels };
};

const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176";

const nativePixels = async (
  subject: Locator,
  family: string,
  name: string,
  prefix: string,
  info: TestInfo
) => {
  const bytes = await readFile(
    new URL(`../../reference/${family}/captures/${name}`, import.meta.url)
  );

  const manifest = parseNativeManifest(
    await readFile(
      new URL(`../../reference/${family}/manifest.json`, import.meta.url),
      "utf-8"
    )
  );

  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    nativeReference(manifest, name).sha256
  );
  const reference = PNG.sync.read(bytes);

  const actual = PNG.sync.read(
    await subject.screenshot({ path: info.outputPath(`${prefix}-actual.png`) })
  );

  expect([actual.width, actual.height]).toEqual([
    reference.width,
    reference.height,
  ]);

  const changed = PNG.sync.read(PNG.sync.write(reference));
  // eslint-disable-next-line no-bitwise -- Preserve the established exact byte operation for one-pixel negative controls or diagnostic RGBA shading.
  changed.data[0] ^= 1;
  expect(compare(changed, reference).differentPixels).toBe(1);
  const { differentPixels, diff } = compare(actual, reference);
  await writeFile(info.outputPath(`${prefix}-diff.png`), PNG.sync.write(diff));
  await writeFile(
    info.outputPath(`${prefix}-pixels.json`),
    JSON.stringify({
      browser: subject.page().context().browser()?.version(),
      devicePixelRatio: await subject.page().evaluate(() => devicePixelRatio),
      differentPixels,
      mutationRejected: true,
      reference: `${family}/${name}`,
      totalPixels: actual.width * actual.height,
      viewport: subject.page().viewportSize(),
    })
  );
  expect(differentPixels).toBe(0);
};

test("chart example tabs remain visible and match their Minecraft modes", async ({
  page,
}, info) => {
  await page.goto(`${origin}/charts`);

  const example = page.getByRole("region", {
    exact: true,
    name: "API response time",
  });

  const tabs = example.getByRole("tablist", {
    exact: true,
    name: "API response time example view",
  });

  await expect(
    tabs.getByRole("tab", { exact: true, name: "Preview" })
  ).toBeInViewport({ ratio: 1 });
  await expect(
    tabs.getByRole("tab", { exact: true, name: "Code" })
  ).toBeInViewport({ ratio: 1 });
  await page.mouse.move(0, 0);
  await nativePixels(
    tabs,
    "showcase-code-tabs",
    "showcase-tabs-preview-s2.png",
    "showcase-tabs-preview",
    info
  );
  await tabs.getByRole("tab", { exact: true, name: "Code" }).click();
  await example.getByRole("button", { exact: true, name: "Copy" }).focus();
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
    .getByRole("region", { exact: true, name: "Frame timing" })
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
    exact: true,
    name: "Remember me",
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
