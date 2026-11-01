import { readFile } from "node:fs/promises";


import { test, expect } from "@grasscn/tests/test";
const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176";

test("Minecraft documentation delivers maintained examples for all nine installable items", async ({
  page,
}) => {
  test.setTimeout(120_000);
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
  ]) {
    await page.goto(`${origin}/docs/components/${slug}`);
    const example = page.locator(".documentation-example").first();
    await expect(example.locator(".minecraft-example")).toBeVisible();
    await example.getByRole("tab", { name: "Code", exact: true }).click();
    const source = await readFile(
      new URL(
        `../../../../apps/web/examples/minecraft/${slug}-example.tsx`,
        import.meta.url
      ),
      "utf8"
    );
    await page.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            (window as unknown as { copiedExample: string }).copiedExample =
              text;
          },
        },
      })
    );
    await example.getByRole("button", { name: "Copy", exact: true }).click();
    expect(
      await page.evaluate(
        () => (window as unknown as { copiedExample: string }).copiedExample
      )
    ).toBe(source);
    await expect(
      page.getByRole("region", { name: `${slug} playground`, exact: true })
    ).toBeVisible();
    await expect(
      page.locator(".minecraft-prose").getByRole("alert")
    ).toHaveCount(0);
  }
});

test("Minecraft primary examples expose paging selection status and trade callbacks", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const example = () => page.locator(".documentation-example").first();
  await page.goto(`${origin}/docs/components/book`);
  await example()
    .getByRole("button", { name: "Next page", exact: true })
    .click();
  await expect(
    example().getByRole("document", { name: "Page 2", exact: true })
  ).toBeVisible();
  await page.goto(`${origin}/docs/components/hotbar`);
  await example().getByRole("button", { name: "Slot 4", exact: true }).click();
  await expect(
    example().getByRole("button", { name: "Slot 4", exact: true })
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto(`${origin}/docs/components/hud`);
  await example()
    .getByRole("button", { name: "Take damage", exact: true })
    .click();
  await expect(
    example().getByRole("meter", { name: "health", exact: true })
  ).toHaveAttribute("aria-valuenow", "14");
  await page.goto(`${origin}/docs/components/advancement-tree`);
  await example().getByRole("button", { name: "Build", exact: true }).click();
  await expect(example().getByRole("status")).toHaveText("Build");
  await page.goto(`${origin}/docs/components/sign`);
  await expect(
    example().getByRole("group", { name: "Standing sign", exact: true })
  ).toContainText("Welcome");
  await page.goto(`${origin}/docs/components/player-preview`);
  await expect(
    example().getByRole("group", { name: "Steve preview", exact: true })
  ).toHaveAttribute("data-ready", "true");
  await expect(example().getByRole("status")).toHaveText("Skin ready");
  await page.goto(`${origin}/docs/components/map`);
  await example().getByRole("button", { name: "Camp", exact: true }).click();
  await expect(example().getByRole("status")).toHaveText("Camp");
  await page.goto(`${origin}/docs/components/trading`);
  await example()
    .getByRole("button", { name: "Trade for Bread", exact: true })
    .click();
  await expect(example().getByRole("status")).toHaveText("1 trades completed");
  await page.goto(`${origin}/docs/components/player-list`);
  await example().getByRole("button", { name: "Steve", exact: true }).click();
  await expect(example().getByRole("status")).toHaveText("Steve");
});
