import { test, expect, type Locator, type Page } from "@grasscn/tests/test";

const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/, "/");

async function open(page: Page, name: string) {
  await page.goto(`${origin}docs/components/${name}`);

  return page.locator(".documentation-playground");
}
async function labelFits(button: Locator) {
  await expect
    .poll(() =>
      button.evaluate((node) => {
        const box = node.getBoundingClientRect(),
          label = node
            .querySelector(".mc-button-label")!
            .getBoundingClientRect();
        return label.left >= box.left - 0.5 && label.right <= box.right + 0.5;
      })
    )
    .toBe(true);
}
test("Kbd texture fits ASCII, CJK and shortcut labels at every GUI scale", async ({
  page,
}) => {
  const card = await open(page, "kbd");
  {
    for (const text of ["Space", "跳跃 Space", "Ctrl + Shift + P"]) {
      await card
        .getByRole("textbox", { name: "Keyboard key label" })
        .fill(text);
      const key = card.locator('[data-slot="kbd"]').first();
      for (const glyph of await key.locator("[data-mc-label-ready]").all())
        await expect(glyph).toHaveAttribute("data-mc-label-ready", "true");
      await labelFits(key);
    }
    for (const key of await card.locator('[data-slot="kbd"]').all())
      await labelFits(key);
  }
});
test("Questionnaire action labels fit, CJK submission works and restart clears the answer", async ({
  page,
}) => {
  const card = await open(page, "questionnaire");
  await card.getByRole("radio", { name: "Survival", exact: true }).check();
  await card.getByRole("button", { name: "Next", exact: true }).click();
  {
    for (const button of await card
      .locator('[data-slot="questionnaire-actions"] button:visible')
      .all())
      await labelFits(button);
    expect(
      await card.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)
    ).toBe(true);
  }
  await card.getByRole("checkbox", { name: "Caves", exact: true }).check();
  await card.getByRole("checkbox", { name: "Villages", exact: true }).check();
  await card.getByRole("button", { name: "Next", exact: true }).click();
  await card
    .getByRole("textbox", { name: "World name", exact: true })
    .fill("你好 世界");
  await labelFits(
    card.getByRole("button", { name: "Save world", exact: true })
  );
  await card.getByRole("button", { name: "Save world", exact: true }).click();
  await expect
    .poll(() => card.getByLabel("World setup result").ariaSnapshot())
    .toContain("World created: 你好 世界");
  await card.getByRole("button", { name: "Start again", exact: true }).click();
  await expect(
    card.getByRole("radio", { name: "Survival", exact: true })
  ).not.toBeChecked();
  await expect(card.getByLabel("World setup result")).toHaveCount(0);
});
test("Message sends CJK lines and keeps system notices in the native palette", async ({
  page,
}) => {
  const card = await open(page, "message");
  await card
    .getByRole("textbox", { name: "Message text", exact: true })
    .fill("你好 世界");
  await card.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    card.locator('[data-slot="message-content"]').last()
  ).toContainText("<You> 你好 世界");
  await expect(card.locator('[data-kind="system"]').first()).toHaveCSS(
    "color",
    "rgb(255, 255, 85)"
  );
  await expect(
    card.locator(
      '[data-slot="message-avatar"], [data-slot="message-header"], [data-slot="message-footer"]'
    )
  ).toHaveCount(0);
});
test("Attachment supports CJK filenames, preview, removal and restoration inside the stage", async ({
  page,
}) => {
  const card = await open(page, "attachment");
  {
    await card
      .getByRole("textbox", { name: "Attachment name", exact: true })
      .fill("世界存档.zip");
    const stage = card.locator('[data-stage="attachment"]'),
      row = card.locator('[data-slot="attachment"]');
    await expect(row).toContainText("世界存档.zip");
    expect((await row.boundingBox())!.width).toBeLessThanOrEqual(
      (await stage.boundingBox())!.width
    );
  }
  await card
    .getByRole("button", { name: "Preview world archive", exact: true })
    .click();
  await expect(card.getByLabel("Attachment status")).toHaveText(
    "Previewed 1 times"
  );
  await card
    .getByRole("button", { name: "Remove archive", exact: true })
    .click();
  await expect(card.locator('[data-slot="attachment"]')).toHaveCount(0);
  await card.getByRole("button", { name: "Restore file", exact: true }).click();
  await expect(card.locator('[data-slot="attachment"]')).toBeVisible();
});
test("MessageScroller footer texture stays bound to its button and never covers history", async ({
  page,
}) => {
  const card = await open(page, "message");
  {
    await card.getByRole("button", { name: "First", exact: true }).click();
    const viewport = card.getByRole("region", { name: "Player chat" }),
      latest = card.getByRole("button", { name: "Latest", exact: true });
    await expect(latest).toBeVisible();
    expect((await latest.boundingBox())!.y).toBeGreaterThanOrEqual(
      (await viewport.boundingBox())!.y + (await viewport.boundingBox())!.height
    );
    const skin = latest.locator(".mc-button-surface");
    expect((await skin.boundingBox())!.height).toBeCloseTo(
      (await latest.boundingBox())!.height,
      0
    );
    expect((await skin.boundingBox())!.width).toBeCloseTo(
      (await latest.boundingBox())!.width,
      0
    );
    await latest.click();
    await expect
      .poll(() =>
        viewport.evaluate(
          (node) => node.scrollTop + node.clientHeight >= node.scrollHeight - 2
        )
      )
      .toBe(true);
  }
  await card
    .getByRole("textbox", { name: "Message text", exact: true })
    .fill("你好，矿工！");
  await card.getByRole("button", { name: "Send", exact: true }).click();
  await expect(card.getByLabel("Message count")).toHaveText("13 messages");
  await expect(
    card.locator('[data-slot="message-content"]').last()
  ).toContainText("<You> 你好，矿工！");
  const viewport = card.getByRole("region", { name: "Player chat" });
  await expect
    .poll(() =>
      viewport.evaluate(
        (node) => node.scrollTop + node.clientHeight >= node.scrollHeight - 2
      )
    )
    .toBe(true);
  await card.getByRole("button", { name: "First", exact: true }).click();
  await card
    .getByRole("textbox", { name: "Message text", exact: true })
    .fill("Keep reading older messages");
  await card.getByRole("button", { exact: true, name: "Send" }).click();
  await expect
    .poll(async () => viewport.evaluate((node) => node.scrollTop))
    .toBe(0);
});
