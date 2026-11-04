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

      const readOnlyItems28 = await card.locator(selector).all();

      const readOnlyResults28 = await Promise.allSettled(
        readOnlyItems28.map(async (control) => {
          await inside(control, card);
        })
      );

      for (const readOnlyResult28 of readOnlyResults28) {
        if (readOnlyResult28.status === "rejected") {
          throw readOnlyResult28.reason;
        }
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

    const readOnlyItems29 = await cells.all();

    const readOnlyResults29 = await Promise.allSettled(
      readOnlyItems29.map(async (cell) => {
        await inside(cell, card);
      })
    );

    for (const readOnlyResult29 of readOnlyResults29) {
      if (readOnlyResult29.status === "rejected") {
        throw readOnlyResult29.reason;
      }
    }
  });
  test(`form errors wrap and CJK names save at GUI ${scale}`, async ({
    page,
  }) => {
    const card = await open(page, "form");

    for (const text of ["", "a"]) {
      // oxlint-disable-next-line no-await-in-loop -- Fill/submit error-state checks, route switches and active tab transitions use one live page; observations complete before next mutation.
      await card
        .getByRole("textbox", { exact: true, name: "Player name" })
        .fill(text);
      // oxlint-disable-next-line no-await-in-loop -- Fill/submit error-state checks, route switches and active tab transitions use one live page; observations complete before next mutation.
      await card
        .getByRole("button", { exact: true, name: "Save player" })
        .click();
      const error = card.getByRole("alert");
      // oxlint-disable-next-line no-await-in-loop -- Fill/submit error-state checks, route switches and active tab transitions use one live page; observations complete before next mutation.
      await expect(error).toBeVisible();

      // oxlint-disable-next-line no-await-in-loop -- Fill/submit error-state checks, route switches and active tab transitions use one live page; observations complete before next mutation.
      for (const line of await error.locator(".mc-label-line").all()) {
        // oxlint-disable-next-line no-await-in-loop -- Fill/submit error-state checks, route switches and active tab transitions use one live page; observations complete before next mutation.
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

  const readOnlyItems30 = await card.locator(".demo-filter-choice").all();

  const readOnlyResults30 = await Promise.allSettled(
    readOnlyItems30.map(async (label) => {
      await inside(label, card);
    })
  );

  for (const readOnlyResult30 of readOnlyResults30) {
    if (readOnlyResult30.status === "rejected") {
      throw readOnlyResult30.reason;
    }
  }
});

test("calendar family and native select have inset preview stages", async ({
  page,
}) => {
  for (const name of ["calendar", "date-picker", "marker", "native-select"]) {
    // oxlint-disable-next-line no-await-in-loop -- Fill/submit error-state checks, route switches and active tab transitions use one live page; observations complete before next mutation.
    const card = await open(page, name);
    const stage = card.locator(`[data-stage="${name}"]`);

    // oxlint-disable-next-line no-await-in-loop -- Fill/submit error-state checks, route switches and active tab transitions use one live page; observations complete before next mutation.
    await expect(stage).toHaveClass(/demo-stage/u);
    expect(
      // oxlint-disable-next-line no-await-in-loop -- Fill/submit error-state checks, route switches and active tab transitions use one live page; observations complete before next mutation.
      await stage.evaluate((el) =>
        // oxlint-disable-next-line unicorn/prefer-number-coercion -- CSS lengths intentionally retain unit suffixes; parseFloat extracts the numeric prefix while Number would reject px values.
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
    // oxlint-disable-next-line no-await-in-loop -- Fill/submit error-state checks, route switches and active tab transitions use one live page; observations complete before next mutation.
    await inside(tab, card);
    // oxlint-disable-next-line no-await-in-loop -- Fill/submit error-state checks, route switches and active tab transitions use one live page; observations complete before next mutation.
    await inside(tab.locator(".mc-tab-label"), tab);
    // oxlint-disable-next-line no-await-in-loop -- Fill/submit error-state checks, route switches and active tab transitions use one live page; observations complete before next mutation.
    await tab.click();
    // oxlint-disable-next-line no-await-in-loop -- Fill/submit error-state checks, route switches and active tab transitions use one live page; observations complete before next mutation.
    await expect(
      card.getByRole("tabpanel", { exact: true, name })
    ).toBeVisible();
  }
});
