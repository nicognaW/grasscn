import { test, expect } from "@grasscn/tests/test";

test("NativeSelect preserves native element refs, controlled options, optgroup and CJK selected text", async ({
  page,
}) => {
  await page.goto("/?component=native-select");
  const control = page.getByRole("combobox", { name: "Controlled choice" });
  await control.selectOption("two");
  await expect(control).toHaveValue("two");
  await expect(
    page
      .locator("[data-slot=native-select-wrapper]")
      .first()
      .locator(".mc-select-trigger-label")
  ).toHaveText("世界");
  await page.locator("#read-ref").click();
  await expect(page.locator("#ref")).toHaveText("SELECT");
  await expect(control.locator("optgroup")).toHaveAttribute("label", "Worlds");
  await expect(control.locator("option[value=blocked]")).toBeDisabled();
});

test("NativeSelect submits native form values, supports multiple and excludes disabled controls", async ({
  page,
}) => {
  await page.goto("/?component=native-select");
  await page
    .getByRole("combobox", { name: "Required choice" })
    .selectOption("yes");
  await page
    .getByRole("listbox", { name: "Multiple choices" })
    .selectOption(["b", "c"]);
  await page.getByRole("button", { exact: true, name: "Submit" }).click();
  await expect(page.locator("#result")).toHaveText(
    JSON.stringify([
      ["choice", "one"],
      ["default", "two"],
      ["required", "yes"],
      ["multiple", "b"],
      ["multiple", "c"],
    ])
  );
});

test("NativeSelect native required validity and form reset update the skinned closed value", async ({
  page,
}) => {
  await page.goto("/?component=native-select");
  await page.getByRole("button", { exact: true, name: "Submit" }).click();
  expect(
    await page
      .getByRole("combobox", { name: "Required choice" })
      .evaluate((el: HTMLSelectElement) => el.validity.valueMissing)
  ).toBe(true);
  await expect(page.locator("#result")).toHaveText("");
  const control = page.getByRole("combobox", { name: "Default choice" });
  await control.selectOption("one");
  await expect(
    page
      .locator("[data-slot=native-select-wrapper]")
      .nth(1)
      .locator(".mc-select-trigger-label")
  ).toHaveText("One");
  await page.getByRole("button", { exact: true, name: "Reset" }).click();
  await expect(control).toHaveValue("two");
  await expect(
    page
      .locator("[data-slot=native-select-wrapper]")
      .nth(1)
      .locator(".mc-select-trigger-label")
  ).toHaveText("Two");
});

test("NativeSelect remains a real keyboard-operable select and original click voice is singular", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).voices = [];
    HTMLMediaElement.prototype.play = function play() {
      (window as any).voices.push({
        original: this.src.startsWith("data:audio/ogg;base64,"),
        rate: this.playbackRate,
        volume: this.volume,
      });

      return Promise.resolve();
    };
  });
  await page.goto("/?component=native-select");
  const control = page.getByRole("combobox", { name: "Controlled choice" });
  await control.focus();
  await page.keyboard.press("ArrowDown");
  await expect(control).toHaveValue("two");
  await control.dispatchEvent("pointerdown", { button: 0 });
  expect(await page.evaluate(() => (window as any).voices)).toEqual([
    { original: true, rate: 1, volume: 0.25 },
  ]);
  await page
    .getByRole("combobox", { name: "Disabled choice" })
    .dispatchEvent("pointerdown", { button: 0 });
  expect(await page.evaluate(() => (window as any).voices.length)).toBe(1);
});

test("NativeSelect opens the platform popup and commits a keyboard option without claiming its pixels", async ({
  page,
}) => {
  await page.goto("/?component=native-select");
  const control = page.getByRole("combobox", { name: "Controlled choice" });
  await control.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(control).toHaveValue("two");
  await expect(
    page
      .locator("[data-slot=native-select-wrapper]")
      .first()
      .locator(".mc-select-trigger-label")
  ).toHaveText("世界");
});
