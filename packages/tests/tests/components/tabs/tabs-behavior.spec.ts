import { test, expect } from "@grasscn/tests/test";

test("Tabs switch panels and retain tab/panel associations", async ({
  page,
}) => {
  await page.goto("/?component=tabs");

  const game = page.getByRole("tab", { exact: true, name: "Game" });
  const world = page.getByRole("tab", { exact: true, name: "World" });

  await expect(game).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("tabpanel", { exact: true, name: "Game" })
  ).toHaveText("Game content");
  await world.click();
  await expect(world).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("tabpanel", { exact: true, name: "World" })
  ).toHaveText("World content");
  expect(await world.getAttribute("aria-controls")).toBe(
    await page
      .getByRole("tabpanel", { exact: true, name: "World" })
      .getAttribute("id")
  );
  await expect(
    page.getByRole("tabpanel", { exact: true, name: "Game" })
  ).toHaveCount(0);
  await expect(page.getByLabel("Tab changes", { exact: true })).toHaveText("1");
});

test("Tabs keyboard navigation visits disabled tabs without selecting them", async ({
  page,
}) => {
  await page.goto("/?component=tabs&disabledIndex=1");
  await page.getByRole("tab", { exact: true, name: "Game" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { exact: true, name: "World" })
  ).toBeFocused();
  await expect(
    page.getByRole("tab", { exact: true, name: "Game" })
  ).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { exact: true, name: "More" })
  ).toBeFocused();
  await expect(
    page.getByRole("tab", { exact: true, name: "More" })
  ).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(
    page.getByRole("tab", { exact: true, name: "Game" })
  ).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(
    page.getByRole("tab", { exact: true, name: "More" })
  ).toBeFocused();

  const disabled = await page
    .getByRole("tab", { exact: true, name: "World" })
    .boundingBox();

  await page.mouse.click(
    disabled.x + disabled.width / 2,
    disabled.y + disabled.height / 2
  );
  await expect(
    page.getByRole("tab", { exact: true, name: "More" })
  ).toHaveAttribute("aria-selected", "true");
});

test("Tabs manual activation and RTL navigation follow Base UI behavior", async ({
  page,
}) => {
  await page.goto("/?component=tabs&activationMode=manual&dir=rtl");
  await page.getByRole("tab", { exact: true, name: "Game" }).focus();
  await page.keyboard.press("ArrowLeft");
  const world = page.getByRole("tab", { exact: true, name: "World" });
  await expect(world).toBeFocused();
  await expect(world).toHaveAttribute("aria-selected", "false");
  await page.keyboard.press("Enter");
  await expect(world).toHaveAttribute("aria-selected", "true");
});

test("Tabs controlled value supports user and external changes", async ({
  page,
}) => {
  await page.goto("/?component=tabs&controlled=1");
  await page.getByRole("tab", { exact: true, name: "World" }).click();
  await expect(page.getByLabel("Selected tab", { exact: true })).toHaveText(
    "tab-1"
  );

  const changes = await page
    .getByLabel("Tab changes", { exact: true })
    .textContent();

  await page.locator("#select-last-tab").click();
  await expect(
    page.getByRole("tab", { exact: true, name: "More" })
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Tab changes", { exact: true })).toHaveText(
    changes
  );
});

test("Tabs Root/List/Trigger/Content retain refs and asChild composition", async ({
  page,
}) => {
  await page.goto("/?component=tabs&asChild=1&listAsChild=1&triggerAsChild=1");
  await expect(
    page.locator("section.mc-tabs nav[role=tablist] a[role=tab]")
  ).toBeVisible();
  await page.locator("#read-ref").click();
  await expect(page.getByLabel("Root ref", { exact: true })).toHaveText(
    "SECTION/NAV/A/DIV"
  );
  await page.getByRole("tab", { exact: true, name: "World" }).click();
  await expect(
    page.getByRole("tabpanel", { exact: true, name: "World" })
  ).toBeVisible();
});

test("Tabs play one original click only for accepted selection changes", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as Window & {
      tabAudio?: number;
    };

    state.tabAudio = 0;
    HTMLMediaElement.prototype.play = function play() {
      state.tabAudio++;

      return Promise.resolve();
    };
  });
  await page.goto("/?component=tabs&controlled=1");

  const sounds = async () =>
    await page.evaluate(
      () =>
        (
          window as Window & {
            tabAudio?: number;
          }
        ).tabAudio
    );

  await page.getByRole("tab", { exact: true, name: "World" }).hover();
  expect(await sounds()).toBe(0);
  await page.getByRole("tab", { exact: true, name: "World" }).click();
  await expect.poll(sounds).toBe(1);
  await page.getByRole("tab", { exact: true, name: "World" }).click();
  expect(await sounds()).toBe(1);
  await page.keyboard.press("ArrowRight");
  await expect.poll(sounds).toBe(2);
  await page.locator("#select-last-tab").click();
  expect(await sounds()).toBe(2);
  await page.goto("/?component=tabs&controlled=1&reject=1");
  await page.getByRole("tab", { exact: true, name: "World" }).click();
  await expect(
    page.getByRole("tab", { exact: true, name: "Game" })
  ).toHaveAttribute("aria-selected", "true");
  expect(await sounds()).toBe(0);
});
