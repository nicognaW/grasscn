import { test, expect } from "@grasscn/tests/test";

test("Questionnaire uses the official ordered items, validation and previous/next navigation", async ({
  page,
}) => {
  await page.goto("/?component=questionnaire");
  await expect(page.locator("#progress")).toContainText("Question 1 of 3");
  await page.getByRole("button", { exact: true, name: "Next" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Creative/ })).toBeVisible();
  await page.getByRole("radio", { name: /Creative/ }).check();
  await page.getByRole("button", { exact: true, name: "Next" }).click();
  await expect(page.locator("#active")).toHaveText("features");
  await expect(page.getByRole("checkbox", { name: /Caves/ })).toBeVisible();
  await page.getByRole("button", { exact: true, name: "Previous" }).click();
  await expect(page.getByRole("radio", { name: /Creative/ })).toBeChecked();
});

test("Questionnaire submits native values for single/multiple/freeform fields", async ({
  page,
}) => {
  await page.goto("/?component=questionnaire");
  await page.getByRole("radio", { name: /Survival/ }).check();
  await page.getByRole("button", { exact: true, name: "Next" }).click();
  await page.getByRole("checkbox", { name: /Caves/ }).check();
  await page.getByRole("checkbox", { name: /Villages/ }).check();
  await page.getByRole("button", { exact: true, name: "Next" }).click();
  await page
    .getByRole("textbox", { exact: true, name: "World name" })
    .fill("兄弟们 Minecraft");
  await page.getByRole("button", { name: "Save world" }).click();
  await expect(page.locator("#result")).toHaveText(
    JSON.stringify([
      ["mode", "survival"],
      ["features", "caves"],
      ["features", "villages"],
      ["name", "兄弟们 Minecraft"],
    ])
  );
});

test("Questionnaire freeform answer replaces presets, optional skip works, and spellcheck is off", async ({
  page,
}) => {
  await page.goto("/?component=questionnaire");
  const input = page.getByRole("textbox", { name: "Other mode" });
  await expect(input).toHaveAttribute("spellcheck", "false");
  await expect(input).toHaveAttribute("autocorrect", "off");
  await input.fill("冒险");
  await page.getByRole("button", { exact: true, name: "Next" }).click();
  await page.getByRole("button", { exact: true, name: "Skip" }).click();
  await expect(
    page.getByRole("textbox", { exact: true, name: "World name" })
  ).toBeVisible();
  await page
    .getByRole("textbox", { exact: true, name: "World name" })
    .fill("世界");
  await page.getByRole("button", { name: "Save world" }).click();
  await expect(page.locator("#result")).toHaveText(
    JSON.stringify([
      ["mode", "冒险"],
      ["name", "世界"],
    ])
  );
});

test("Questionnaire forwards actual form refs and supports numbered shortcuts", async ({
  page,
}) => {
  await page.goto("/?component=questionnaire");
  await page.locator("#read-questionnaire-ref").click();
  await expect(page.locator("#questionnaire-ref")).toHaveText("FORM");
  await page.getByRole("group").first().focus();
  await page.keyboard.press("2");
  await expect(page.getByRole("radio", { name: /Creative/ })).toBeChecked();
  await page.keyboard.press("Enter");
  await expect(page.locator("#active")).toHaveText("features");
});

test("Questionnaire controlled item changes and render-state callbacks preserve the official API", async ({
  page,
}) => {
  await page.goto("/?component=questionnaire&controlled=1&customRender=1");
  await expect(page.locator("#custom-progress")).toHaveText("1/3");
  await page.getByRole("radio", { name: /Creative/ }).check();
  await page.getByRole("button", { exact: true, name: "Next" }).click();
  await expect(page.locator("#active")).toHaveText("features");
  await expect(page.getByRole("radio", { name: /Creative/ })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /Caves/ })).toHaveCount(0);
  await page.locator("#force-features").click();
  await expect(page.getByRole("checkbox", { name: /Caves/ })).toBeVisible();
  await expect(page.locator("#custom-progress")).toHaveText("2/3");
});

test("Questionnaire choice and navigation interactions play the original click exactly once", async ({
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
  await page.goto("/?component=questionnaire");
  const choice = page.getByRole("radio", { name: /Creative/ });
  await choice.hover();
  expect(await page.evaluate(() => (window as any).voices.length)).toBe(0);
  await choice.check();
  await page.getByRole("button", { exact: true, name: "Next" }).click();
  expect(await page.evaluate(() => (window as any).voices)).toEqual([
    { original: true, rate: 1, volume: 0.25 },
    { original: true, rate: 1, volume: 0.25 },
  ]);
});
