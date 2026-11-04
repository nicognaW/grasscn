import { test, expect } from "@grasscn/tests/test";

test("Message preserves all six slots, CJK, alignment, refs and native line dimensions", async ({
  page,
}) => {
  await page.goto("?component=message&rich=1&align=end&label=你好世界");

  const readOnlyItems6 = [
    "message-group",
    "message",
    "message-avatar",
    "message-header",
    "message-content",
    "message-footer",
  ];

  const readOnlyResults6 = await Promise.allSettled(
    readOnlyItems6.map(async (slot) => {
      await expect(page.locator(`[data-slot=${slot}]`).first()).toBeVisible();
    })
  );

  for (const readOnlyResult6 of readOnlyResults6) {
    if (readOnlyResult6.status === "rejected") {
      throw readOnlyResult6.reason;
    }
  }

  await expect(page.getByTestId("message")).toHaveAttribute(
    "data-align",
    "end"
  );
  await expect(page.getByTestId("rich-text")).toHaveText("你好世界");
  await page.locator("#read-ref").click();
  await expect(page.locator("#tag")).toHaveText("DIV");
  await page.getByLabel("Chat text").fill("こんにちは 世界");
  await expect(page.getByTestId("rich-text")).toHaveText("こんにちは 世界");
});

test("Message scalar text has original row dimensions and multiline semantics at all GUI scales", async ({
  page,
}) => {
  for (const scale of [1, 2, 3]) {
    // oxlint-disable-next-line no-await-in-loop -- Each scale reloads the same page, waits actual glyph owners, then measures that scale before next navigation.
    await page.goto(
      `?component=message&label=First%20line%0ASecond%20line&scale=${scale}`
    );
    const subject = page.locator("[data-subject]");
    // oxlint-disable-next-line no-await-in-loop -- Each scale reloads the same page, waits actual glyph owners, then measures that scale before next navigation.
    await expect(subject).toHaveAttribute("data-mc-chat-ready", "true");
    // oxlint-disable-next-line no-await-in-loop -- Each scale reloads the same page, waits actual glyph owners, then measures that scale before next navigation.
    await expect(
      subject.locator("[data-mc-label-layout-ready]")
    ).toHaveAttribute("data-mc-label-layout-ready", "true");
    // oxlint-disable-next-line no-await-in-loop -- Each scale reloads the same page, waits actual glyph owners, then measures that scale before next navigation.
    await expect(subject).toContainText("First line\nSecond line");
    // oxlint-disable-next-line no-await-in-loop -- Each scale reloads the same page, waits actual glyph owners, then measures that scale before next navigation.
    expect((await subject.boundingBox())!.height).toBe(18 * scale);
  }
});

test("Bubble preserves four slots, reaction positioning and rich text", async ({
  page,
}) => {
  await page.goto("?component=bubble&rich=1&align=end&side=top&label=你好世界");

  const readOnlyItems7 = [
    "bubble-group",
    "bubble",
    "bubble-content",
    "bubble-reactions",
  ];

  const readOnlyResults7 = await Promise.allSettled(
    readOnlyItems7.map(async (slot) => {
      await expect(page.locator(`[data-slot=${slot}]`)).toBeVisible();
    })
  );

  for (const readOnlyResult7 of readOnlyResults7) {
    if (readOnlyResult7.status === "rejected") {
      throw readOnlyResult7.reason;
    }
  }

  await expect(page.getByTestId("reactions")).toHaveAttribute(
    "data-side",
    "top"
  );
  await expect(page.getByTestId("reactions")).toHaveAttribute(
    "data-align",
    "end"
  );
  await page.getByRole("button", { exact: true, name: "React" }).click();
  await expect(page.locator("#events")).toHaveText("1");
});

test("Bubble asChild keeps semantic button, ref and keyboard event composition", async ({
  page,
}) => {
  await page.goto("?component=bubble&asChild=1&label=Hello");
  const button = page.getByRole("button", { name: "Chat action" });
  await button.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("Enter");
  await expect(page.locator("#events")).toHaveText("2");
  await expect(page.locator("#tag")).toHaveText("child");
  await page.locator("#read-ref").click();
  await expect(page.locator("#tag")).toHaveText("BUTTON");
});

test("Bubble disabled semantic buttons remain inactive", async ({ page }) => {
  await page.goto("?component=bubble&asChild=1&disabled=1");
  await expect(
    page.getByRole("button", { name: "Chat action" })
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Chat action" })
    .dispatchEvent("keydown", { key: "Enter" });
  await expect(page.locator("#events")).toHaveText("0");
});

test("Chat palette and rich intrinsic children retain native canvas colors", async ({
  page,
}) => {
  await page.goto("?component=bubble&rich=1&color=%23ff5555&label=你好");
  const subject = page.locator("[data-subject]");

  const readOnlyItems8 = await subject.locator("[data-mc-label-ready]").all();

  const readOnlyResults8 = await Promise.allSettled(
    readOnlyItems8.map(async (glyph) => {
      await expect(glyph).toHaveAttribute("data-mc-label-ready", "true");
    })
  );

  for (const readOnlyResult8 of readOnlyResults8) {
    if (readOnlyResult8.status === "rejected") {
      throw readOnlyResult8.reason;
    }
  }

  await expect(subject).toHaveCSS("color", "rgb(255, 85, 85)");
  await expect(subject.getByTestId("rich-text")).toBeVisible();
  const canvas = subject.locator("canvas").first();
  expect(
    await canvas.evaluate((node: HTMLCanvasElement) => {
      const pixels = node
        .getContext("2d")!
        .getImageData(0, 0, node.width, node.height).data;

      for (let i = 0; i < pixels.length; i += 4) {
        if (
          pixels[i] === 255 &&
          pixels[i + 1] === 85 &&
          pixels[i + 2] === 85 &&
          pixels[i + 3] === 255
        ) {
          return true;
        }
      }

      return false;
    })
  ).toBe(true);
});
