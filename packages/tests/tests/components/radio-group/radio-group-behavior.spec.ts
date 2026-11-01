import { test, expect } from "@grasscn/tests/test";
import type { Page, Locator } from "@grasscn/tests/test";
import { minecraftClickSound } from "@grasscn/web/ui/minecraft-sound-assets";

const arrow = async function arrow(page: Page, key: string, target: Locator) {
  // Verify selection while the arrow-key interaction is active.
  await page.keyboard.down(key);

  try {
    await expect(target).toBeChecked();
  } finally {
    await page.keyboard.up(key);
  }
};

test("Radio Group supports none/one selected and cannot uncheck the selected item", async ({
  page,
}) => {
  await page.goto("/?component=radio-group&none=1");
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
  const survival = page.getByRole("radio", { exact: true, name: "survival" });
  await survival.click();
  await survival.click();
  await expect(survival).toBeChecked();
  await expect(page.getByLabel("Radio changes", { exact: true })).toHaveText(
    "1"
  );
  await page.getByRole("radio", { exact: true, name: "adventure" }).click();
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(1);
  await expect(page.getByLabel("Radio value", { exact: true })).toHaveText(
    "adventure"
  );
  await expect(survival).not.toBeChecked();
});

test("Radio Group arrow navigation skips disabled items and wraps", async ({
  page,
}) => {
  await page.goto("/?component=radio-group&disabledIndex=1");
  await expect(
    page.getByRole("radio", { exact: true, name: "survival" })
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("radio", { exact: true, name: "survival" })
  ).toBeFocused();
  await arrow(
    page,
    "ArrowDown",
    page.getByRole("radio", { exact: true, name: "adventure" })
  );
  await arrow(
    page,
    "ArrowDown",
    page.getByRole("radio", { exact: true, name: "spectator" })
  );
  await arrow(
    page,
    "ArrowDown",
    page.getByRole("radio", { exact: true, name: "survival" })
  );
});

test("Radio Group preserves native RTL navigation and wrapping", async ({
  page,
}) => {
  await page.goto("/?component=radio-group&dir=rtl");
  await page.getByRole("radio", { exact: true, name: "survival" }).focus();
  await arrow(
    page,
    "ArrowRight",
    page.getByRole("radio", { exact: true, name: "spectator" })
  );
  await arrow(
    page,
    "ArrowLeft",
    page.getByRole("radio", { exact: true, name: "survival" })
  );
});

test("Radio Group preserves controlled acceptance, rejection and external updates", async ({
  page,
}) => {
  await page.goto("/?component=radio-group&controlled=1");
  await page.getByRole("radio", { exact: true, name: "creative" }).click();
  await expect(
    page.getByRole("radio", { exact: true, name: "creative" })
  ).toBeChecked();
  await page.locator("#radio-external").click();
  await expect(
    page.getByRole("radio", { exact: true, name: "adventure" })
  ).toBeChecked();
  await expect(page.getByLabel("Radio changes", { exact: true })).toHaveText(
    "1"
  );
  await page.goto("/?component=radio-group&controlled=1&reject=1");
  await page.getByRole("radio", { exact: true, name: "adventure" }).click();
  await expect(
    page.getByRole("radio", { exact: true, name: "survival" })
  ).toBeChecked();
  await expect(page.getByLabel("Radio changes", { exact: true })).toHaveText(
    "1"
  );
});

test("Radio Group keeps required form behavior and excludes disabled groups", async ({
  page,
}) => {
  await page.goto("/?component=radio-group&none=1&form=1&required=1");
  await page.getByRole("button", { exact: true, name: "Save mode" }).click();
  await expect(page.getByLabel("Submitted radio", { exact: true })).toHaveText(
    ""
  );
  await page.getByRole("radio", { exact: true, name: "creative" }).click();
  await page.getByRole("button", { exact: true, name: "Save mode" }).click();
  await expect(page.getByLabel("Submitted radio", { exact: true })).toHaveText(
    "creative"
  );
  await page.goto("/?component=radio-group&rootDisabled=1&form=1");

  for (const radio of await page.getByRole("radio").all()) {
    await expect(radio).toBeDisabled();
  }

  await page.getByRole("button", { exact: true, name: "Save mode" }).click();
  await expect(page.getByLabel("Submitted radio", { exact: true })).toHaveText(
    "missing"
  );
});

test("Radio Group forwards refs, supports asChild and keeps disabled anchors inert", async ({
  page,
}) => {
  await page.goto("/?component=radio-group&rootAsChild=1&itemAsChild=1");
  await page.locator("#radio-read-refs").click();
  await expect(page.getByLabel("Radio refs", { exact: true })).toHaveText(
    "FIELDSET/BUTTON"
  );
  await page.getByRole("radio", { exact: true, name: "adventure" }).click();
  await expect(
    page.getByRole("radio", { exact: true, name: "adventure" })
  ).toBeChecked();
  await page.goto(
    "/?component=radio-group&rootDisabled=1&itemAsChild=1&anchor=1"
  );
  const adventure = page.getByRole("radio", { exact: true, name: "adventure" });
  await expect(adventure).toBeDisabled();
  await adventure.dispatchEvent("click");
  await expect(adventure).not.toBeChecked();
  await expect(page.getByLabel("Radio changes", { exact: true })).toHaveText(
    "0"
  );
  await expect(page.getByLabel("Radio events", { exact: true })).toHaveText(
    "0"
  );
});

test("Radio Group uses original click audio per activation and respects preventDefault", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).radioSounds = [];
    HTMLMediaElement.prototype.play = function play() {
      (window as any).radioSounds.push({
        rate: this.playbackRate,
        source: this.src,
        volume: this.volume,
      });

      return Promise.resolve();
    };
  });
  const sounds = async () => page.evaluate(() => (window as any).radioSounds);
  await page.goto("/?component=radio-group");
  const survival = page.getByRole("radio", { exact: true, name: "survival" });
  await survival.hover();
  await survival.focus();
  expect(await sounds()).toEqual([]);
  await survival.click();
  expect(await sounds()).toEqual([
    { rate: 1, source: minecraftClickSound, volume: 0.25 },
  ]);
  await page.getByRole("radio", { exact: true, name: "adventure" }).click();
  await arrow(
    page,
    "ArrowUp",
    page.getByRole("radio", { exact: true, name: "creative" })
  );
  await expect.poll(sounds).toHaveLength(3);
  await page.keyboard.press("Enter");
  expect(await sounds()).toHaveLength(3);
  await page.keyboard.press("Space");
  await expect.poll(sounds).toHaveLength(4);
  await page.goto("/?component=radio-group&rootDisabled=1");
  await page
    .getByRole("radio", { exact: true, name: "adventure" })
    .dispatchEvent("click");
  expect(await sounds()).toEqual([]);
  await page.goto("/?component=radio-group&prevent=1");
  await page.getByRole("radio", { exact: true, name: "adventure" }).click();
  await expect(page.getByLabel("Radio changes", { exact: true })).toHaveText(
    "0"
  );
  await expect(page.getByLabel("Radio events", { exact: true })).toHaveText(
    "1"
  );
  expect(await sounds()).toEqual([]);
});
