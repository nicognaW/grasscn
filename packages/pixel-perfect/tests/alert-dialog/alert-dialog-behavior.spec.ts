import { readFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { resolveRepositoryPath, pixelPerfectRoot } from "@ppt/paths";
import { PNG } from "pngjs";

test("AlertDialog refreshes native backdrop pixels when the underlying background changes without repaint loops", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1536, height: 900 });
  await page.goto(
    "/?component=alert-dialog&native=1&patterned=1&scale=3&blur=5"
  );
  await page.addStyleTag({
    content: "html,body{background:#202020} #root{opacity:0}",
  });
  const overlay = page.locator('[data-slot="alert-dialog-overlay"]');
  const expected = (name: string) =>
    PNG.sync.read(
      readFileSync(
        resolveRepositoryPath(
          `tests/reference/alert-dialog-backdrop/captures/${name}`,
          pixelPerfectRoot
        )
      )
    ).data;
  const dark = expected("alert-smoke-c2-s3.png"),
    light = expected("alert-smoke-c3-s3.png");
  await expect(overlay).toHaveAttribute(
    "data-mc-confirmation-gpu-ready",
    "true"
  );
  expect(PNG.sync.read(await page.screenshot()).data.equals(dark)).toBe(true);
  await page.evaluate(() => {
    document.documentElement.style.backgroundColor = "#808080";
    document.body.style.backgroundColor = "#808080";
  });
  await expect
    .poll(async () => PNG.sync.read(await page.screenshot()).data.equals(light))
    .toBe(true);
  await expect(overlay).toHaveAttribute(
    "data-mc-confirmation-gpu-ready",
    "true"
  );
  const frame = await overlay.getAttribute("data-mc-confirmation-frame");
  await page.waitForTimeout(650);
  await expect(overlay).toHaveAttribute("data-mc-confirmation-frame", frame!);
});

test("AlertDialog preserves fixed native UI while the page underneath scrolls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1536, height: 900 });
  await page.goto(
    "/?component=alert-dialog&native=1&patterned=1&scale=3&blur=5"
  );
  await page.addStyleTag({
    content: "html,body{background:#808080} #root{opacity:0}",
  });
  const overlay = page.locator('[data-slot="alert-dialog-overlay"]'),
    expected = PNG.sync.read(
      readFileSync(
        resolveRepositoryPath(
          "tests/reference/alert-dialog-backdrop/captures/alert-smoke-c3-s3.png",
          pixelPerfectRoot
        )
      )
    ).data;
  await expect(overlay).toHaveAttribute(
    "data-mc-confirmation-gpu-ready",
    "true"
  );
  await page.evaluate(() => {
    const spacer = document.createElement("div");
    spacer.style.height = "2200px";
    document.getElementById("root")!.append(spacer);
    scrollTo(0, 400);
  });
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(400);
  await expect
    .poll(async () =>
      PNG.sync.read(await page.screenshot()).data.equals(expected)
    )
    .toBe(true);
});
