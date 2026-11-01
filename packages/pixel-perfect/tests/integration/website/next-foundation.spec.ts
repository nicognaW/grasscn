import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { test, expect } from "@grasscn/pixel-perfect/test";
import { PNG } from "pngjs";

test("the default MDX component page renders within the Minecraft website shell", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176";

  await page.goto(`${origin}/docs/components/button`);
  await expect(
    page.getByRole("heading", { exact: true, name: "Button" })
  ).toBeVisible();
  await expect(
    page.getByRole("paragraph").filter({
      hasText:
        "Minecraft button with original textures, glyphs, and click feedback.",
    })
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "grasscn home" })
  ).toHaveAttribute("href", "/");
  await expect(page.locator("[data-slot=typography-h1]")).toHaveAttribute(
    "data-mc-label-layout-ready",
    "true"
  );

  const image = await page
    .getByRole("region", { exact: true, name: "Button example" })
    .getByRole("button", { exact: true, name: "Button" })
    .screenshot({ path: info.outputPath("integrated-button-actual.png") });

  const actual = PNG.sync.read(image);

  const referenceFile = fileURLToPath(
    new URL("../../reference/captures/normal-w200-s2.png", import.meta.url)
  );

  const reference = PNG.sync.read(await readFile(referenceFile));
  expect([actual.width, actual.height]).toEqual([
    reference.width,
    reference.height,
  ]);
  let differentPixels = 0;
  const diff = new PNG({ height: actual.height, width: actual.width });

  for (let offset = 0; offset < actual.data.length; offset += 4) {
    if (
      !actual.data
        .subarray(offset, offset + 4)
        .equals(reference.data.subarray(offset, offset + 4))
    ) {
      differentPixels += 1;
      diff.data.set([255, 0, 0, 255], offset);
    }
  }

  const pixels = JSON.stringify({
    differentPixels,
    referenceCase: "normal-w200-s2.png",
    totalPixels: actual.width * actual.height,
  });

  await writeFile(info.outputPath("integrated-button-pixels.json"), pixels);
  await info.attach("integrated-button-actual.png", {
    contentType: "image/png",
    path: info.outputPath("integrated-button-actual.png"),
  });
  await info.attach("integrated-button-pixels.json", {
    body: Buffer.from(pixels),
    contentType: "application/json",
  });
  await writeFile(
    info.outputPath("integrated-button-diff.png"),
    PNG.sync.write(diff)
  );
  await info.attach("integrated-button-diff.png", {
    contentType: "image/png",
    path: info.outputPath("integrated-button-diff.png"),
  });
  await info.attach("integrated-button-reference.png", {
    contentType: "image/png",
    path: referenceFile,
  });
  await page.screenshot({
    fullPage: true,
    path: info.outputPath("first-document-desktop.png"),
  });
  expect(differentPixels).toBe(0);
  expect(errors).toEqual([]);

  // Composition review artifacts do not expand the native verified coverage.
  const desktop = {
    dpr: await page.evaluate(() => devicePixelRatio),
    viewport: page.viewportSize(),
  };

  await page.setViewportSize({ height: 844, width: 390 });
  await page.evaluate(async () => {
    // eslint-disable-next-line promise/avoid-new -- Bridge two real animation-frame callbacks before the mobile composition capture.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  });
  await page.screenshot({
    fullPage: true,
    path: info.outputPath("first-document-mobile.png"),
  });

  const mobileLayout = await page.evaluate(() => ({
    containers: [
      ...document.querySelectorAll<HTMLElement>(
        ".minecraft-site,.minecraft-document,.minecraft-prose,.minecraft-paragraph,.documentation-implementation,.documentation-code,.documentation-code-scroll,.documentation-example,.documentation-example-tabs,.documentation-tabs-scroll,.documentation-playground"
      ),
    ].map((element) => ({
      className: element.className,
      overflowX: getComputedStyle(element).overflowX,
      right: element.getBoundingClientRect().right,
      scrollWidth: element.scrollWidth,
      width: element.clientWidth,
    })),
    document: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));

  await writeFile(
    info.outputPath("mobile-layout.json"),
    JSON.stringify(mobileLayout, null, 2)
  );
  expect(mobileLayout.document).toBeLessThanOrEqual(mobileLayout.viewport);

  const mobile = {
    dpr: await page.evaluate(() => devicePixelRatio),
    viewport: page.viewportSize(),
  };

  await writeFile(
    info.outputPath("first-document-environment.json"),
    JSON.stringify(
      {
        browser: page.context().browser()?.version(),
        desktop,
        mobile,
        scope:
          "Website composition review only; native pixel comparison is the desktop default Button case.",
      },
      null,
      2
    )
  );
});
