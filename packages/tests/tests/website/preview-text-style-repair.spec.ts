import { test, expect, type Locator, type Page } from "@grasscn/tests/test";

const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/u, "/");

const open = async function open(page: Page, name: string) {
  await page.goto(`${origin}docs/components/${name}`);

  return page.locator(".documentation-playground");
};

const labelFits = async function labelFits(button: Locator) {
  await expect
    .poll(async () =>
      button.evaluate((node) => {
        const box = node.getBoundingClientRect();

        const label = node
          .querySelector(".mc-button-label")!
          .getBoundingClientRect();

        return label.left >= box.left - 0.5 && label.right <= box.right + 0.5;
      })
    )
    .toBe(true);
};

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

      for (const glyph of await key.locator("[data-mc-label-ready]").all()) {
        await expect(glyph).toHaveAttribute("data-mc-label-ready", "true");
      }

      await labelFits(key);
    }

    for (const key of await card.locator('[data-slot="kbd"]').all()) {
      await labelFits(key);
    }
  }
});

test("Questionnaire action labels fit, CJK submission works and restart clears the answer", async ({
  page,
}) => {
  const card = await open(page, "questionnaire");
  await card.getByRole("radio", { exact: true, name: "Survival" }).check();
  await card.getByRole("button", { exact: true, name: "Next" }).click();
  {
    for (const button of await card
      .locator('[data-slot="questionnaire-actions"] button:visible')
      .all()) {
      await labelFits(button);
    }

    expect(
      await card.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)
    ).toBe(true);
  }

  await card.getByRole("checkbox", { exact: true, name: "Caves" }).check();
  await card.getByRole("checkbox", { exact: true, name: "Villages" }).check();
  await card.getByRole("button", { exact: true, name: "Next" }).click();
  await card
    .getByRole("textbox", { exact: true, name: "World name" })
    .fill("你好 世界");
  await labelFits(
    card.getByRole("button", { exact: true, name: "Save world" })
  );
  await card.getByRole("button", { exact: true, name: "Save world" }).click();
  await expect
    .poll(async () => card.getByLabel("World setup result").ariaSnapshot())
    .toContain("World created: 你好 世界");
  await card.getByRole("button", { exact: true, name: "Start again" }).click();
  await expect(
    card.getByRole("radio", { exact: true, name: "Survival" })
  ).not.toBeChecked();
  await expect(card.getByLabel("World setup result")).toHaveCount(0);
});

test("Message sends CJK lines and keeps system notices in the native palette", async ({
  page,
}) => {
  const card = await open(page, "message");
  await card
    .getByRole("textbox", { exact: true, name: "Message text" })
    .fill("你好 世界");
  await card.getByRole("button", { exact: true, name: "Send" }).click();
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
      .getByRole("textbox", { exact: true, name: "Attachment name" })
      .fill("世界存档.zip");

    const stage = card.locator('[data-stage="attachment"]');
    const row = card.locator('[data-slot="attachment"]');

    await expect(row).toContainText("世界存档.zip");
    expect((await row.boundingBox())!.width).toBeLessThanOrEqual(
      (await stage.boundingBox())!.width
    );
  }

  await card
    .getByRole("button", { exact: true, name: "Preview world archive" })
    .click();
  await expect(card.getByLabel("Attachment status")).toHaveText(
    "Previewed 1 times"
  );
  await card
    .getByRole("button", { exact: true, name: "Remove archive" })
    .click();
  await expect(card.locator('[data-slot="attachment"]')).toHaveCount(0);
  await card.getByRole("button", { exact: true, name: "Restore file" }).click();
  await expect(card.locator('[data-slot="attachment"]')).toBeVisible();
});

test("MessageScroller footer texture stays bound to its button and never covers history", async ({
  page,
}) => {
  const card = await open(page, "message");
  {
    await card.getByRole("button", { exact: true, name: "First" }).click();

    const viewport = card.getByRole("region", { name: "Player chat" });
    const latest = card.getByRole("button", { exact: true, name: "Latest" });

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
      .poll(async () =>
        viewport.evaluate(
          (node) => node.scrollTop + node.clientHeight >= node.scrollHeight - 2
        )
      )
      .toBe(true);
  }

  await card
    .getByRole("textbox", { exact: true, name: "Message text" })
    .fill("你好，矿工！");
  await card.getByRole("button", { exact: true, name: "Send" }).click();
  await expect(card.getByLabel("Message count")).toHaveText("13 messages");
  await expect(
    card.locator('[data-slot="message-content"]').last()
  ).toContainText("<You> 你好，矿工！");
  const viewport = card.getByRole("region", { name: "Player chat" });
  await expect
    .poll(async () =>
      viewport.evaluate(
        (node) => node.scrollTop + node.clientHeight >= node.scrollHeight - 2
      )
    )
    .toBe(true);
  await card.getByRole("button", { exact: true, name: "First" }).click();
  await card
    .getByRole("textbox", { exact: true, name: "Message text" })
    .fill("Keep reading older messages");
  await card.getByRole("button", { exact: true, name: "Send" }).click();
  await expect
    .poll(async () => viewport.evaluate((node) => node.scrollTop))
    .toBe(0);
});
