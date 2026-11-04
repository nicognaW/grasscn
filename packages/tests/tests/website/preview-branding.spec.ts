import { readFile } from "node:fs/promises";

import { test, expect } from "@grasscn/tests/test";
import { webFile } from "@tests/paths";
import { PNG } from "pngjs";

const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/u, "/");

test("Header serves the preserved branding source at its actual production geometry", async ({
  page,
  request,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}docs`);
  await expect(page).toHaveTitle(/grasscn/u);

  const brand = page
    .getByRole("banner")
    .getByRole("link", { exact: true, name: "grasscn home" });

  await expect(brand).toBeVisible();
  const logo = brand.locator("img");
  await expect(logo).toHaveAttribute(
    "src",
    /grasscn-logo(?:-[A-Za-z0-9_-]+)?\.svg(?:\?.*)?$/
  );
  await logo.evaluate(async (node: HTMLImageElement) => {
    await node.decode();
  });

  const image = PNG.sync.read(
    await logo.screenshot({ path: info.outputPath("actual-header-logo.png") })
  );

  expect([image.width, image.height]).toEqual([176, 64]);
  await expect(logo).toHaveCSS("image-rendering", "pixelated");

  const logoSource = await logo.getAttribute("src");
  const response = await request.get(new URL(logoSource ?? "", origin).href);
  expect(response.ok()).toBe(true);

  const deliveredSvg = await response.body();
  const originalSvg = await readFile(webFile("assets/grasscn-logo.svg"));

  expect(deliveredSvg.equals(originalSvg)).toBe(true);

  // The original SVG is served at its intrinsic176x64 geometry. Native
  // constituent coverage is independently tested at the actual header backdrop.
  const iconBytes = await page.evaluate(async () => [
    ...new Uint8Array(
      await (
        await fetch(
          document.querySelector<HTMLLinkElement>('link[rel="icon"]')!.href
        )
      ).arrayBuffer()
    ),
  ]);

  expect(
    Buffer.from(iconBytes).equals(
      await readFile(webFile("assets/grass-block-16.png"))
    )
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("Grasscn logo stays crisp and contained on narrow preview screens", async ({
  page,
}) => {
  for (const width of [320, 390]) {
    // oxlint-disable-next-line no-await-in-loop -- Changes this page viewport and route, then checks that rendered state before the next viewport replaces it.
    await page.setViewportSize({ height: 844, width });
    // oxlint-disable-next-line no-await-in-loop -- Changes this page viewport and route, then checks that rendered state before the next viewport replaces it.
    await page.goto(`${origin}docs`);

    const logo = page
      .getByRole("banner")
      .getByRole("link", { exact: true, name: "grasscn home" })
      .locator("img");

    // oxlint-disable-next-line no-await-in-loop -- Changes this page viewport and route, then checks that rendered state before the next viewport replaces it.
    await expect(logo).toHaveCSS("width", "176px");
    // oxlint-disable-next-line no-await-in-loop -- Changes this page viewport and route, then checks that rendered state before the next viewport replaces it.
    await expect(logo).toHaveCSS("height", "64px");
    expect(
      // oxlint-disable-next-line no-await-in-loop -- Changes this page viewport and route, then checks that rendered state before the next viewport replaces it.
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
  }
});
