import { expectNotNull } from "@grasscn/tests/assertions";
import { test, expect } from "@grasscn/tests/test";

const fixture =
  process.env.GRASSCN_EXPANSION_URL ?? "http://127.0.0.1:5174/adventure.html";

const url = (sample: object) =>
  `${fixture}?scale=2&case=${encodeURIComponent(JSON.stringify(sample))}`;

test("map terrain coordinates and keyboard markers", async ({ page }) => {
  await page.goto(
    url({
      checked: true,
      element: "map",
      state: "terrain",
      value: 0,
      x: 24,
      y: 16,
    })
  );

  const subject = page.locator("[data-subject]");
  const bounds = await subject.boundingBox();
  expectNotNull(bounds, "Missing required bounding box: bounds");

  await subject.click({ position: { x: 20, y: 40 } });
  await expect
    .poll(
      async () =>
        await page.evaluate(() => document.documentElement.dataset.mapClick)
    )
    .toBe(JSON.stringify({ x: 10, y: 20 }));
  const home = page.getByRole("button", { exact: true, name: "Home" });
  await home.focus();
  await home.press("Enter");
  await expect
    .poll(
      async () =>
        await page.evaluate(() => document.documentElement.dataset.marker)
    )
    .toBe("home");
  await page.getByRole("button", { exact: true, name: "Village" }).click();
  await expect
    .poll(
      async () =>
        await page.evaluate(() => document.documentElement.dataset.marker)
    )
    .toBe("village");
  expect(bounds.width).toBe(256);
  expect(
    await page.evaluate(() => document.documentElement.dataset.mapClick)
  ).toBe(JSON.stringify({ x: 10, y: 20 }));
});

test("locator limits and keyboard waypoint selection", async ({ page }) => {
  for (const [bearing, visible] of [
    [-61, false],
    [-59, true],
    [59, true],
    [61, false],
  ] as const) {
    await page.goto(url({ checked: true, element: "locator", value: bearing }));
    const point = page.getByRole("button", { exact: true, name: "Waypoint" });
    await expect(point).toHaveCount(visible ? 1 : 0);

    if (visible) {
      await point.focus();
      await point.press("Enter");
      await expect
        .poll(
          async () =>
            await page.evaluate(() => document.documentElement.dataset.marker)
        )
        .toBe("point");
    }
  }
});

test("locator preserves bearings across positive and negative full turns", async ({
  page,
}) => {
  for (const heading of [0, 360, 720, -360, -720]) {
    await page.goto(
      url({ checked: true, element: "locator", heading, value: 0 })
    );
    await expect(
      page.getByRole("button", { exact: true, name: "Waypoint" })
    ).toHaveCount(1);
  }
});
