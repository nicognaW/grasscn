import { test, expect } from "@grasscn/tests/test";

const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/";

test("Grasscn logo stays crisp and contained on narrow preview screens", async ({
  page,
}) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ height: 844, width });
    await page.goto(`${origin}#all`);

    const logo = page
      .getByRole("banner")
      .getByRole("link", { exact: true, name: "grasscn home" })
      .locator("img");

    await expect(logo).toHaveCSS("width", "110px");
    await expect(logo).toHaveCSS("height", "40px");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
  }
});
