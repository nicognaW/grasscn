import { expectNotNull } from "@grasscn/tests/assertions";
import type { Locator, Page } from "@grasscn/tests/test";
import { test, expect } from "@grasscn/tests/test";

const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/u, "/");

const open = async function open(page: Page, name: string) {
  await page.goto(`${origin}docs/components/${name}`);

  return page.locator(".documentation-playground");
};

const labelFits = async function labelFits(button: Locator) {
  await expect
    .poll(
      async () =>
        await button.evaluate((node) => {
          const box = node.getBoundingClientRect();

          const requiredElement29 = node.querySelector(".mc-button-label");

          if (requiredElement29 === null) {
            throw new Error("Missing required dom query");
          }

          const label = requiredElement29.getBoundingClientRect();

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
      // oxlint-disable-next-line no-await-in-loop -- Changes the same live form/input state and completes its dependent checks before the next value replaces it.
      await card
        .getByRole("textbox", { name: "Keyboard key label" })
        .fill(text);
      const key = card.locator('[data-slot="kbd"]').first();

      // oxlint-disable-next-line no-await-in-loop -- Changes the same live form/input state and completes its dependent checks before the next value replaces it.
      const readOnlyItems33 = await key.locator("[data-mc-label-ready]").all();

      // oxlint-disable-next-line no-await-in-loop -- Changes the same live form/input state and completes its dependent checks before the next value replaces it.
      const readOnlyResults33 = await Promise.allSettled(
        readOnlyItems33.map(async (glyph) => {
          await expect(glyph).toHaveAttribute("data-mc-label-ready", "true");
        })
      );

      for (const readOnlyResult33 of readOnlyResults33) {
        if (readOnlyResult33.status === "rejected") {
          throw readOnlyResult33.reason;
        }
      }

      // oxlint-disable-next-line no-await-in-loop -- Changes the same live form/input state and completes its dependent checks before the next value replaces it.
      await labelFits(key);
    }

    const readOnlyItems34 = await card.locator('[data-slot="kbd"]').all();

    const readOnlyResults34 = await Promise.allSettled(
      readOnlyItems34.map(async (key) => {
        await labelFits(key);
      })
    );

    for (const readOnlyResult34 of readOnlyResults34) {
      if (readOnlyResult34.status === "rejected") {
        throw readOnlyResult34.reason;
      }
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
    const readOnlyItems35 = await card
      .locator('[data-slot="questionnaire-actions"] button:visible')
      .all();

    const readOnlyResults35 = await Promise.allSettled(
      readOnlyItems35.map(async (button) => {
        await labelFits(button);
      })
    );

    for (const readOnlyResult35 of readOnlyResults35) {
      if (readOnlyResult35.status === "rejected") {
        throw readOnlyResult35.reason;
      }
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
    .poll(
      async () => await card.getByLabel("World setup result").ariaSnapshot()
    )
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
    const requiredBounds30 = await row.boundingBox();
    expectNotNull(requiredBounds30, "Missing required bounding box");
    const requiredBounds31 = await stage.boundingBox();
    expectNotNull(requiredBounds31, "Missing required bounding box");
    expect(requiredBounds30.width).toBeLessThanOrEqual(requiredBounds31.width);
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
    const requiredBounds32 = await latest.boundingBox();
    expectNotNull(requiredBounds32, "Missing required bounding box");
    const requiredBounds33 = await viewport.boundingBox();
    expectNotNull(requiredBounds33, "Missing required bounding box");
    const requiredBounds34 = await viewport.boundingBox();
    expectNotNull(requiredBounds34, "Missing required bounding box");
    expect(requiredBounds32.y).toBeGreaterThanOrEqual(
      requiredBounds33.y + requiredBounds34.height
    );
    const skin = latest.locator(".mc-button-surface");
    const requiredBounds35 = await skin.boundingBox();
    expectNotNull(requiredBounds35, "Missing required bounding box");
    const requiredBounds36 = await latest.boundingBox();
    expectNotNull(requiredBounds36, "Missing required bounding box");
    expect(requiredBounds35.height).toBeCloseTo(requiredBounds36.height, 0);
    const requiredBounds37 = await skin.boundingBox();
    expectNotNull(requiredBounds37, "Missing required bounding box");
    const requiredBounds38 = await latest.boundingBox();
    expectNotNull(requiredBounds38, "Missing required bounding box");
    expect(requiredBounds37.width).toBeCloseTo(requiredBounds38.width, 0);
    await latest.click();
    await expect
      .poll(
        async () =>
          await viewport.evaluate(
            (node) =>
              node.scrollTop + node.clientHeight >= node.scrollHeight - 2
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
    .poll(
      async () =>
        await viewport.evaluate(
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
    .poll(async () => await viewport.evaluate((node) => node.scrollTop))
    .toBe(0);
});
