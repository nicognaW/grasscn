import type { Page, Locator } from "@grasscn/tests/test";
import { test, expect } from "@grasscn/tests/test";

const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/u, "/");

const open = async function open(page: Page, name: string) {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto(`${origin}docs/components/${name}`);

  return page.locator(".documentation-playground");
};

const inside = async function inside(child: Locator, parent: Locator) {
  await expect
    .poll(async () => {
      const [c, p] = await Promise.all([
        child.boundingBox(),
        parent.boundingBox(),
      ]);

      return !!c && !!p && c.x >= p.x - 1 && c.x + c.width <= p.x + p.width + 1;
    })
    .toBe(true);
};

for (const scale of [2]) {
  for (const [name, selector] of [
    ["button", "[data-stage] .mc-button"],
    ["slider", "[data-stage] .mc-slider"],
    ["input", "[data-stage] .mc-input"],
    ["textarea", "[data-stage] .mc-textarea"],
    ["native-select", ".mc-native-select-control"],
    ["input-group", "[data-stage] button"],
  ] as const) {
    test(`${name} controls fit narrow preview at GUI ${scale}`, async ({
      page,
    }) => {
      const card = await open(page, name);
      await expect(card.locator(selector).first()).toBeVisible();

      for (const control of await card.locator(selector).all()) {
        await inside(control, card);
      }
    });
  }

  test(`all six OTP cells remain visible at GUI ${scale}`, async ({ page }) => {
    const card = await open(page, "input-otp");
    await card.getByRole("button", { exact: true, name: "CJK sample" }).click();
    await expect(card.getByLabel("OTP completions")).toHaveText(
      "1 complete codes"
    );
    const cells = card.locator(".mc-otp-slot");
    await expect(cells).toHaveCount(18);

    for (const cell of await cells.all()) {
      await inside(cell, card);
    }
  });
  test(`form errors wrap and CJK names save at GUI ${scale}`, async ({
    page,
  }) => {
    const card = await open(page, "form");

    for (const text of ["", "a"]) {
      await card
        .getByRole("textbox", { exact: true, name: "Player name" })
        .fill(text);
      await card
        .getByRole("button", { exact: true, name: "Save player" })
        .click();
      const error = card.getByRole("alert");
      await expect(error).toBeVisible();

      for (const line of await error.locator(".mc-label-line").all()) {
        await inside(line, card);
      }
    }

    await card
      .getByRole("textbox", { exact: true, name: "Player name" })
      .fill("玩家");
    await card
      .getByRole("button", { exact: true, name: "Save player" })
      .click();
    await expect(
      card
        .getByLabel("Saved player")
        .locator(":scope > [data-slot=label] > .mc-text-accessible")
    ).toHaveText("玩家");
  });
}

test("recipe labels select their own filter and keyboard focus survives wrapping", async ({
  page,
}) => {
  const card = await open(page, "toggle-group");
  const single = card.getByRole("group", { name: "One recipe station" });
  await single.locator("label").filter({ hasText: "Furnace" }).click();
  await expect(
    single.getByRole("button", { name: "Furnace recipes" })
  ).toHaveAttribute("aria-pressed", "true");
  await single
    .getByRole("button", { name: "Furnace recipes" })
    .press("ArrowRight");
  await expect(
    single.getByRole("button", { name: "Stonecutter recipes" })
  ).toBeFocused();
  await single
    .getByRole("button", { name: "Stonecutter recipes" })
    .press("Space");
  await expect(
    single.getByRole("button", { name: "Stonecutter recipes" })
  ).toHaveAttribute("aria-pressed", "true");

  for (const label of await card.locator(".demo-filter-choice").all()) {
    await inside(label, card);
  }
});

test("calendar family and native select have inset preview stages", async ({
  page,
}) => {
  for (const name of ["calendar", "date-picker", "marker", "native-select"]) {
    const card = await open(page, name);
    const stage = card.locator(`[data-stage="${name}"]`);

    await expect(stage).toHaveClass(/demo-stage/);
    expect(
      await stage.evaluate((el) =>
        Number.parseFloat(getComputedStyle(el).paddingLeft)
      )
    ).toBeGreaterThan(0);
  }
});

test("narrow preview tabs preserve readable labels and every panel stays reachable", async ({
  page,
}) => {
  const card = await open(page, "tabs");

  for (const name of ["Game", "World", "More"]) {
    const tab = card.getByRole("tab", { exact: true, name });
    await inside(tab, card);
    await inside(tab.locator(".mc-tab-label"), tab);
    await tab.click();
    await expect(
      card.getByRole("tabpanel", { exact: true, name })
    ).toBeVisible();
  }
});
