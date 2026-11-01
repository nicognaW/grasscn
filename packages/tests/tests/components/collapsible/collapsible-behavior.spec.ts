import { test, expect } from "@grasscn/tests/test";
import type { Page } from "@grasscn/tests/test";
import { minecraftClickSound } from "@grasscn/web/ui/minecraft-sound-assets";

const trigger = (page: Page) =>
  page.getByRole("button", { exact: true, name: "World details" });

test("Collapsible toggles with mouse and keyboard", async ({ page }) => {
  await page.goto("/?component=collapsible");
  await trigger(page).click();
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "true");
  await trigger(page).press("Enter");
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
  await trigger(page).press(" ");
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "true");
});

test("Collapsible supports controlled and external state", async ({ page }) => {
  await page.goto("/?component=collapsible&controlled=1");
  await page.locator("#collapsible-external").click();
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "true");
  await trigger(page).click();
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByLabel("Collapsible changes", { exact: true })
  ).toHaveText("1");
});

test("Collapsible rejects controlled requests without inventing state", async ({
  page,
}) => {
  await page.goto("/?component=collapsible&controlled=1&reject=1");
  await trigger(page).click();
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByLabel("Collapsible changes", { exact: true })
  ).toHaveText("1");
});

test("Collapsible preserves default-open and force-mount semantics", async ({
  page,
}) => {
  await page.goto("/?component=collapsible&open=1");
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator('[data-slot="collapsible-content"]')).toBeVisible();
  await page.goto("/?component=collapsible&forceMount=1");
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator('[data-slot="collapsible-content"]')).toHaveCount(
    1
  );
});

test("Collapsible inherits disabled state and supports event cancellation", async ({
  page,
}) => {
  await page.goto("/?component=collapsible&disabled=1");
  await expect(trigger(page)).toBeDisabled();
  await trigger(page).click({ force: true });
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
  await page.goto("/?component=collapsible&prevent=1");
  await trigger(page).click();
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByLabel("Collapsible changes", { exact: true })
  ).toHaveText("0");
});

test("Collapsible preserves all composed element refs and inner actions", async ({
  page,
}) => {
  await page.goto(
    "/?component=collapsible&rootAsChild=1&asChild=1&contentAsChild=1"
  );
  await trigger(page).click();
  await page.locator("#collapsible-refs").click();
  await expect(page.getByLabel("Collapsible refs", { exact: true })).toHaveText(
    "ARTICLE,BUTTON,SECTION"
  );
  await page
    .getByRole("button", { exact: true, name: "Inside action" })
    .click();
  await expect(
    page.getByLabel("Collapsible changes", { exact: true })
  ).toHaveText("2");
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "true");
});

test("Collapsible keeps native CJK text accessible", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?component=collapsible");
  await trigger(page).click();
  const body = page.locator('[data-slot="collapsible-content"]');
  await expect(body.locator("[data-mc-label-layout-ready]")).toHaveAttribute(
    "data-mc-label-layout-ready",
    "true"
  );

  for (const glyph of await body.locator("[data-mc-label-ready]").all()) {
    await expect(glyph).toHaveAttribute("data-mc-label-ready", "true");
  }

  await expect(body).toContainText("你好，世界");
  expect(errors).toEqual([]);
});

test("Collapsible preserves form editing without closing the section", async ({
  page,
}) => {
  await page.goto("/?component=collapsible&rich=1");
  await trigger(page).click();
  const input = page.getByRole("textbox", { exact: true, name: "World name" });
  await input.fill("你好，世界");
  await page.getByRole("button", { exact: true, name: "Save world" }).click();
  await expect(input).toHaveValue("你好，世界");
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "true");
});

test("Collapsible clicks use the original asset once and disabled actions are silent", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).__collapsibleVoices = [];
    HTMLMediaElement.prototype.play = function play() {
      (window as any).__collapsibleVoices.push({
        rate: this.playbackRate,
        source: this.src,
        volume: this.volume,
      });

      return Promise.resolve();
    };
  });

  const voices = async () =>
    page.evaluate(() => (window as any).__collapsibleVoices);

  await page.goto("/?component=collapsible");
  await trigger(page).hover();
  expect(await voices()).toEqual([]);
  await trigger(page).click();
  expect(await voices()).toEqual([
    { rate: 1, source: minecraftClickSound, volume: 0.25 },
  ]);
  await trigger(page).press("Enter");
  expect(await voices()).toHaveLength(2);

  for (const query of ["disabled=1", "prevent=1"]) {
    await page.goto(`/?component=collapsible&${query}`);
    await trigger(page).click({ force: true });
    expect(await voices()).toEqual([]);
  }
});
