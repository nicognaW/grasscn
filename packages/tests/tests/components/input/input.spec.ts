import { test, expect } from "@grasscn/tests/test";

test("Input preserves controlled editing, selection, keyboard deletion and change events", async ({
  page,
}) => {
  await page.goto("/?component=input&text=Hello");
  const input = page.getByRole("textbox", { name: "Test input" });
  await input.fill("Minecraft");
  await expect(input).toHaveValue("Minecraft");
  await expect(page.getByLabel("Input value", { exact: true })).toHaveText(
    "Minecraft"
  );
  await expect(page.getByLabel("Input changes", { exact: true })).toHaveText(
    "1"
  );
  await page.keyboard.press("Home");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Backspace");
  await expect(input).toHaveValue("inecraft");
  await expect(page.getByLabel("Input changes", { exact: true })).toHaveText(
    "2"
  );
});

test("Input retains uncontrolled form reset and form submission", async ({
  page,
}) => {
  await page.goto("/?component=input&text=Hello&uncontrolled=1");
  const input = page.getByRole("textbox", { name: "Test input" });
  await input.fill("Done");
  expect(
    await page
      .locator("form")
      .evaluate((element) =>
        new FormData(element as HTMLFormElement).get("message")
      )
  ).toBe("Done");
  await page.locator("#reset").click();
  await expect(input).toHaveValue("Hello");
  await input.press("Enter");
  await expect(page.getByLabel("Submissions", { exact: true })).toHaveText("1");
});

test("Disabled Input is skipped by keyboard focus", async ({ page }) => {
  await page.goto("/?component=input&text=Hello&state=disabled");
  const input = page.getByRole("textbox", { name: "Test input" });
  await expect(input).toBeDisabled();
  await page.keyboard.press("Tab");
  await expect(page.locator("#submit")).toBeFocused();
});

test("Read-only Input remains keyboard-focusable and immutable", async ({
  page,
}) => {
  await page.goto("/?component=input&text=Hello&state=readonly");
  const input = page.getByRole("textbox", { name: "Test input" });
  await expect(input).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(input).toBeFocused();
  await page.keyboard.type("abc");
  await expect(input).toHaveValue("Hello");
  await expect(page.getByLabel("Input changes", { exact: true })).toHaveText(
    "0"
  );
});

test("Input uses the real DOM ref and repaints imperative value assignments", async ({
  page,
}) => {
  await page.goto("/?component=input&text=Hello");
  const input = page.getByRole("textbox", { name: "Test input" });
  await expect(input).toHaveAttribute("data-mc-ready", "true");
  const before = await input.evaluate((element) =>
    (element as HTMLInputElement).style.getPropertyValue("--mc-input-image")
  );
  await page.locator("#read-ref").click();
  await expect(page.getByLabel("Root ref", { exact: true })).toHaveText(
    "INPUT"
  );
  await page.locator("#imperative").click();
  await expect(input).toHaveValue("Done");
  await expect
    .poll(() =>
      input.evaluate((element) =>
        (element as HTMLInputElement).style.getPropertyValue("--mc-input-image")
      )
    )
    .not.toBe(before);
});

test("Input keeps HTML validation and maxlength", async ({ page }) => {
  await page.goto(
    "/?component=input&text=&required=1&pattern=[0-9]{3}&maxLength=3"
  );
  const input = page.getByRole("textbox", { name: "Test input" });
  await page.locator("#submit").click();
  await expect(page.getByLabel("Submissions", { exact: true })).toHaveText("0");
  await input.fill("abc");
  expect(
    await input.evaluate(
      (element) => (element as HTMLInputElement).validity.patternMismatch
    )
  ).toBe(true);
  await input.fill("");
  await page.keyboard.type("12345");
  await expect(input).toHaveValue("123");
  await page.locator("#submit").click();
  await expect(page.getByLabel("Submissions", { exact: true })).toHaveText("1");
});

test("Input preserves password and unsupported glyph browser rendering fallbacks", async ({
  page,
}) => {
  await page.goto("/?component=input&text=secret&type=password");
  const input = page.locator("[data-subject]");
  await expect(input).toHaveAttribute("type", "password");
  await expect(input).toHaveAttribute("data-mc-bitmap", "false");
  await expect(input).toHaveValue("secret");
  await page.goto("/?component=input&text=Hello");
  await input.fill("Hello 🙂");
  await expect(input).toHaveValue("Hello 🙂");
  await expect(input).toHaveAttribute("data-mc-bitmap", "false");
  await input.fill("Hello");
  await expect(input).toHaveAttribute("data-mc-bitmap", "true");
});

test("Input pointer position uses the same original font advances", async ({
  page,
}) => {
  await page.goto("/?component=input&text=WWWWWW");
  const input = page.getByRole("textbox", { name: "Test input" });
  await page.evaluate(() => document.fonts.ready);
  const bounds = (await input.boundingBox())!;
  await page.mouse.click(
    bounds.x + (4 + 6 * 3) * 2,
    bounds.y + bounds.height / 2
  );
  expect(
    await input.evaluate(
      (element) => (element as HTMLInputElement).selectionStart
    )
  ).toBe(3);
});
