import { readFile } from "node:fs/promises";

import { test, expect } from "@grasscn/tests/test";

const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176";

// These properties capture clipboard writes performed by this test page.
declare global {
  interface Window {
    copiedExample: string;
  }
}

test("Minecraft documentation delivers maintained examples for all ten installable items", async ({
  page,
}) => {
  test.setTimeout(150_000);

  /* eslint-disable no-await-in-loop -- Complete each interaction and assertion on the current page before navigating or changing its state. */
  for (const slug of [
    "advancement-tree",
    "book",
    "hotbar",
    "hud",
    "sign",
    "player-preview",
    "map",
    "trading",
    "player-list",
    "redstone-lamp-display",
  ]) {
    await page.goto(`${origin}/docs/components/${slug}`);
    const example = page.locator(".documentation-example").first();
    await expect(example.locator(".minecraft-example")).toBeVisible();
    await example.getByRole("tab", { exact: true, name: "Code" }).click();

    const source = await readFile(
      new URL(
        `../../../../apps/web/examples/minecraft/${slug}-example.tsx`,
        import.meta.url
      ),
      "utf-8"
    );

    await page.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          // eslint-disable-next-line require-await -- The clipboard mock preserves the asynchronous browser API while recording its supplied text synchronously.
          writeText: async (text: string) => {
            window.copiedExample = text;
          },
        },
      })
    );
    await example.getByRole("button", { exact: true, name: "Copy" }).click();
    expect(await page.evaluate(() => window.copiedExample)).toBe(source);
    await expect(
      page.getByRole("region", { exact: true, name: `${slug} playground` })
    ).toBeVisible();
    await expect(
      page.locator(".minecraft-prose").getByRole("alert")
    ).toHaveCount(0);
  }
  /* eslint-enable no-await-in-loop */
});

test("Minecraft primary examples expose paging selection status and trade callbacks", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const example = () => page.locator(".documentation-example").first();
  await page.goto(`${origin}/docs/components/book`);
  await example()
    .getByRole("button", { exact: true, name: "Next page" })
    .click();
  await expect(
    example().getByRole("document", { exact: true, name: "Page 2" })
  ).toBeVisible();
  await page.goto(`${origin}/docs/components/hotbar`);
  await example().getByRole("button", { exact: true, name: "Slot 4" }).click();
  await expect(
    example().getByRole("button", { exact: true, name: "Slot 4" })
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto(`${origin}/docs/components/hud`);
  await example()
    .getByRole("button", { exact: true, name: "Take damage" })
    .click();
  await expect(
    example().getByRole("meter", { exact: true, name: "health" })
  ).toHaveAttribute("aria-valuenow", "14");
  await page.goto(`${origin}/docs/components/advancement-tree`);
  await example().getByRole("button", { exact: true, name: "Build" }).click();
  await expect(example().getByRole("status")).toHaveText("Build");
  await page.goto(`${origin}/docs/components/sign`);
  await expect(
    example().getByRole("group", { exact: true, name: "Standing sign" })
  ).toContainText("Welcome");
  await page.goto(`${origin}/docs/components/player-preview`);
  await expect(
    example().getByRole("group", { exact: true, name: "Steve preview" })
  ).toHaveAttribute("data-ready", "true");
  await expect(example().getByRole("status")).toHaveText("Skin ready");
  await page.goto(`${origin}/docs/components/map`);
  await example().getByRole("button", { exact: true, name: "Camp" }).click();
  await expect(example().getByRole("status")).toHaveText("Camp");
  await page.goto(`${origin}/docs/components/trading`);
  await example()
    .getByRole("button", { exact: true, name: "Trade for Bread" })
    .click();
  await expect(example().getByRole("status")).toHaveText("1 trades completed");
  await page.goto(`${origin}/docs/components/player-list`);
  await example().getByRole("button", { exact: true, name: "Steve" }).click();
  await expect(example().getByRole("status")).toHaveText("Steve");
});
