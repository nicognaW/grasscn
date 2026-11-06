import { expectNotNull } from "@grasscn/tests/assertions";
import { test, expect } from "@grasscn/tests/test";
import type { Page } from "@grasscn/tests/test";

const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176"
).replace(/\/$/u, "");

// The launch button is the fireworks' website default path: the rocket
// rises from the button's bottom centre, and the canvas goes after the last
// spark.
const launchFromPlayground = async (page: Page) => {
  const button = page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Launch fireworks" });

  const canvas = page.locator('canvas[data-slot="fireworks"]');

  await expect(canvas).toHaveCount(0);
  await button.click();
  await expect(canvas).toHaveAttribute("data-rendered", "true");

  const [canvasBox, buttonBox] = await Promise.all([
    canvas.boundingBox(),
    button.boundingBox(),
  ]);

  expect((canvasBox?.x ?? 0) + 240).toBeCloseTo(
    (buttonBox?.x ?? 0) + (buttonBox?.width ?? 0) / 2,
    0
  );
  expect((canvasBox?.y ?? 0) + 584).toBeCloseTo(
    (buttonBox?.y ?? 0) + (buttonBox?.height ?? 0),
    0
  );
  await expect(canvas).toHaveCount(0, { timeout: 10_000 });
};

for (const [name, title] of [
  ["book", "Book"],
  ["hotbar", "Hotbar"],
  ["hud", "HUD"],
  ["sign", "Sign"],
  ["player-preview", "Player Preview"],
  ["advancement-tree", "Advancement Tree"],
  ["map", "Map"],
  ["trading", "Trading"],
  ["player-list", "Player List"],
  ["redstone-lamp-display", "Redstone Lamp Display"],
  ["fireworks", "Fireworks"],
]) {
  test(`local ${name} preview`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ height: 1000, width: 1440 });
    await page.goto(`${origin}/docs/components/${name}`);
    await expect(
      page.getByRole("heading", { exact: true, name: title })
    ).toBeVisible();
    await expect(
      page.locator(`.documentation-playground [data-stage="${name}"]`)
    ).toBeVisible();

    if (name === "book") {
      await page
        .locator(".documentation-playground")
        .getByRole("button", { exact: true, name: "Next page" })
        .click();
      await expect(
        page
          .locator(".documentation-playground")
          .getByRole("document", { exact: true, name: "Page 2" })
      ).toBeVisible();
    }

    if (name === "hotbar") {
      await page
        .locator(".documentation-playground")
        .getByRole("button", { exact: true, name: "Measure" })
        .click();
      await expect(
        page
          .locator(".documentation-playground")
          .getByRole("button", { exact: true, name: "Measure" })
      ).toHaveAttribute("aria-pressed", "true");
    }

    if (name === "hud") {
      await expect(
        page
          .locator(".documentation-playground")
          .getByRole("meter", { exact: true, name: "health" })
      ).toHaveAttribute("aria-valuenow", "17");
      await page
        .locator(".documentation-playground")
        .getByRole("button", { exact: true, name: "Take damage" })
        .click();
      await expect(
        page
          .locator(".documentation-playground")
          .getByRole("meter", { exact: true, name: "health" })
      ).toHaveAttribute("aria-valuenow", "14");
      await page
        .locator(".documentation-playground")
        .getByRole("button", { exact: true, name: "Heal" })
        .click();
      await expect(
        page
          .locator(".documentation-playground")
          .getByRole("meter", { exact: true, name: "health" })
      ).toHaveAttribute("aria-valuenow", "20");
    }

    if (name === "sign") {
      await page
        .locator(".documentation-playground")
        .getByLabel("First line", { exact: true })
        .fill("Hello");
      await expect(
        page
          .locator(".documentation-playground")
          .getByRole("group", { exact: true, name: "Standing sign" })
      ).toContainText("Hello");
      await page
        .locator(".documentation-playground")
        .getByRole("combobox", { exact: true, name: "Wood type" })
        .click();
      await page.getByRole("option", { exact: true, name: "birch" }).click();
      await expect(
        page
          .locator(".documentation-playground")
          .getByRole("group", { exact: true, name: "Hanging sign" })
      ).toHaveAttribute("data-wood", "birch");
    }

    if (name === "player-preview") {
      await expect(
        page
          .locator(".documentation-playground")
          .getByRole("group", { exact: true, name: "Player preview" })
      ).toHaveAttribute("data-ready", "true");
      await page
        .locator(".documentation-playground")
        .getByRole("button", { exact: true, name: "Alex" })
        .click();
      await expect(
        page
          .locator(".documentation-playground")
          .getByRole("group", { exact: true, name: "Player preview" })
      ).toHaveAttribute("data-ready", "true");
    }

    if (name === "map") {
      await page
        .locator(".documentation-playground")
        .getByRole("button", { exact: true, name: "Village" })
        .click();
      await expect(page.getByText("Village", { exact: true })).toBeVisible();
      await page
        .locator(".documentation-playground")
        .getByRole("button", { exact: true, name: "Turn right" })
        .click();
      await page
        .locator(".documentation-playground")
        .getByRole("button", { exact: true, name: "Face north" })
        .click();
    }

    if (name === "trading") {
      const geometry = await page
        .locator(".documentation-playground")
        .getByRole("group", { exact: true, name: "Trade offers" })
        .evaluate((element) => {
          const bounds = element.getBoundingClientRect();

          return [...element.querySelectorAll("button")].map((row, i) => {
            const r = row.getBoundingClientRect();

            return {
              bottom: r.bottom - bounds.bottom,
              height: r.height,
              index: i,
              offset: r.top - bounds.top,
            };
          });
        });

      expect(geometry).toHaveLength(7);

      for (const row of geometry) {
        expect(row.height).toBe(40);
        expect(row.offset).toBe(row.index * 40);
        expect(row.bottom).toBeLessThanOrEqual(0);
      }

      await page
        .locator(".documentation-playground")
        .getByRole("button", { exact: true, name: "Bread" })
        .click();
      await expect(
        page
          .locator(".documentation-playground")
          .getByRole("button", { exact: true, name: "Bread" })
      ).toHaveAttribute("aria-pressed", "true");
      await page
        .locator(".documentation-playground")
        .getByRole("button", { exact: true, name: "Trade for Bread" })
        .click();
      await expect(
        page.locator(".documentation-playground").getByRole("status")
      ).toContainText("1 trade completed.");
    }

    if (name === "player-list") {
      await page
        .locator(".documentation-playground")
        .getByRole("button", { exact: true, name: "Steve" })
        .click();
      await page
        .locator(".documentation-playground")
        .getByRole("button", { exact: true, name: "Award 10 points" })
        .click();
      await expect(
        page
          .locator(".documentation-playground")
          .getByRole("table", { exact: true, name: "Build points" })
      ).toContainText("166");
      await page
        .locator(".documentation-playground")
        .getByRole("button", { exact: true, name: "Larger crew" })
        .click();
      await expect(
        page.locator(".documentation-playground").getByRole("listitem")
      ).toHaveCount(24);
      await page
        .locator(".documentation-playground")
        .getByRole("button", { exact: true, name: "Player24" })
        .click();
      await page
        .locator(".documentation-playground")
        .getByRole("button", { exact: true, name: "Award 10 points" })
        .click();
      await expect(
        page
          .locator(".documentation-playground")
          .getByRole("table", { exact: true, name: "Build points" })
      ).toContainText("169");
    }

    if (name === "redstone-lamp-display") {
      const playground = page.locator(".documentation-playground");
      // The demo default 1234 is the display's website default path.
      await expect(
        playground.getByRole("img", { exact: true, name: "1234" })
      ).toHaveAttribute("data-rendered", "true");

      const number = playground.getByRole("spinbutton", {
        exact: true,
        name: "NUMBER",
      });

      await number.fill("12");
      await expect(
        playground.getByRole("img", { exact: true, name: "12" })
      ).toHaveAttribute("data-rendered", "true");
      // Values the display cannot show keep the last shown number.
      await number.fill("-3");
      await expect(
        playground.getByRole("img", { exact: true, name: "12" })
      ).toBeVisible();
      await number.fill("0042");
      await expect(
        playground.getByRole("img", { exact: true, name: "42" })
      ).toBeVisible();
    }

    if (name === "fireworks") {
      await launchFromPlayground(page);
    }

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
    await page.screenshot({ path: info.outputPath(`${name}-website.png`) });
    expect(errors).toEqual([]);
  });
}

for (const name of [
  "map",
  "trading",
  "player-list",
  "redstone-lamp-display",
  "fireworks",
]) {
  test(`mobile ${name} preview fits viewport`, async ({ page }, info) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await page.goto(`${origin}/docs/components/${name}`);
    await expect(
      page.locator(`.documentation-playground [data-stage="${name}"]`)
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
    const card = page.locator(".documentation-playground");
    const bounds = await card.boundingBox();
    expectNotNull(bounds, "Missing required bounding box: bounds");
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
    await page.screenshot({
      path: info.outputPath(`${name}-website-mobile.png`),
    });
  });
}
