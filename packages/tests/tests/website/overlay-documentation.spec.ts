import { readFile, writeFile } from "node:fs/promises";

import { expect, test } from "@grasscn/tests/test";

const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176";

const slugs = [
  "tooltip",
  "dialog",
  "alert-dialog",
  "popover",
  "dropdown-menu",
  "context-menu",
  "menubar",
  "sheet",
  "drawer",
  "command",
  "avatar",
  "table",
  "calendar",
  "date-picker",
  "item",
  "data-table",
  "carousel",
  "message",
  "bubble",
  "message-scroller",
  "attachment",
  "chart",
];

// These properties capture clipboard writes performed by this test page.
declare global {
  interface Window {
    copied: string;
  }
}

test("overlay documentation exposes exact examples, own grouped source and retained playgrounds", async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (error) =>
    errors.push(`${page.url()}: ${error.message}`)
  );

  const overlaySlugs = slugs;

  const verifyOverlayDocumentation = async (
    slug: (typeof overlaySlugs)[number]
  ) => {
    await page.goto(`${origin}/docs/components/${slug}`);

    if (slug === "calendar") {
      await writeFile(
        info.outputPath("calendar-locale.json"),
        JSON.stringify(
          await page.evaluate(() => ({
            defaultDate: new Date(2026, 9, 30).toLocaleDateString(),
            explicitDate: new Date(2026, 9, 30).toLocaleDateString("en-US"),
            language: navigator.language,
            locale: Intl.DateTimeFormat().resolvedOptions().locale,
          }))
        )
      );
    }

    const readOnlyItems27 = ["preview", "usage", "composition", "installation"];

    const readOnlyResults27 = await Promise.allSettled(
      readOnlyItems27.map(async (id) => {
        await expect(page.locator(`h2#${id}`)).toBeVisible();
      })
    );

    for (const readOnlyResult27 of readOnlyResults27) {
      if (readOnlyResult27.status === "rejected") {
        throw readOnlyResult27.reason;
      }
    }

    const example = page.locator(".documentation-example").first();
    await expect(example.locator(".minecraft-example")).toBeVisible();

    if (["dialog", "data-table", "message-scroller", "chart"].includes(slug)) {
      await page.screenshot({
        fullPage: true,
        path: info.outputPath(`${slug}-desktop-actual.png`),
      });
    }

    await example.getByRole("tab", { exact: true, name: "Code" }).click();

    const filename =
      slug === "chart"
        ? "charts/fps-example.tsx"
        : `overlays/${slug}-example.tsx`;

    const source = await readFile(
      new URL(`../../../../apps/web/examples/${filename}`, import.meta.url),
      "utf-8"
    );

    await page.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          // eslint-disable-next-line require-await -- The clipboard mock preserves the asynchronous browser API while recording its supplied text synchronously.
          writeText: async (text: string) => {
            window.copied = text;
          },
        },
      })
    );
    await example.getByRole("button", { exact: true, name: "Copy" }).click();
    expect(await page.evaluate(() => window.copied)).toBe(source);
    await expect(page.locator(".documentation-implementation")).toContainText(
      `components/${["date-picker", "data-table"].includes(slug) ? "" : "ui/"}${slug}.tsx`
    );
    await expect(
      page.getByRole("region", { name: `Interactive ${slug} playground` })
    ).toBeVisible();
    await expect(
      page.locator(".minecraft-prose").getByRole("alert")
    ).toHaveCount(0);
  };

  for (const slug of overlaySlugs) {
    // oxlint-disable-next-line no-await-in-loop -- Runs the current fixture case on one shared page; its navigation, interactions and observations finish before the next case replaces that page.
    await verifyOverlayDocumentation(slug);
  }

  expect(errors).toEqual([]);
});

test("documentation confirmation callbacks update once and close their actual modal", async ({
  page,
}) => {
  await page.goto(`${origin}/docs/components/alert-dialog`);
  let example = page.locator(".documentation-example").first();

  const trigger = example.getByRole("button", {
    exact: true,
    name: "Delete world",
  });

  await trigger.click();

  const alert = page.getByRole("alertdialog", {
    exact: true,
    name: "Delete this world?",
  });

  await expect(alert).toBeVisible();
  await alert.getByRole("button", { exact: true, name: "Yes" }).click();
  await expect(alert).toHaveCount(0);
  await expect(example.getByLabel("Confirmed deletions")).toHaveText(
    "1 confirmed"
  );
  await expect(trigger).toBeFocused();
  await page.goto(`${origin}/docs/components/dialog`);
  example = page.locator(".documentation-example").first();
  await example
    .getByRole("button", { exact: true, name: "Open world settings" })
    .click();
  await page
    .getByRole("dialog", { exact: true, name: "World settings" })
    .getByRole("button", { exact: true, name: "Continue" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(example.getByLabel("Saved worlds")).toHaveText("1 saved");
});

test("documentation edge panels expose labelled Done actions", async ({
  page,
}) => {
  const edgePanelSlugs = ["sheet", "drawer"];

  const verifyEdgePanelComposition = async (
    slug: (typeof edgePanelSlugs)[number]
  ) => {
    await page.goto(`${origin}/docs/components/${slug}`);
    const example = page.locator(".documentation-example").first();

    const trigger = example.getByRole("button", {
      exact: true,
      name: `Open ${slug}`,
    });

    await trigger.click();

    const dialog = page.getByRole("dialog", {
      exact: true,
      name: "World settings",
    });

    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { exact: true, name: "Done" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  };

  for (const slug of edgePanelSlugs) {
    // oxlint-disable-next-line no-await-in-loop -- Runs the current fixture case on one shared page; its navigation, interactions and observations finish before the next case replaces that page.
    await verifyEdgePanelComposition(slug);
  }
});

test("documentation menu and command examples dispatch real selections", async ({
  page,
}) => {
  await page.goto(`${origin}/docs/components/dropdown-menu`);
  let example = page.locator(".documentation-example").first();
  await example.getByRole("button", { exact: true, name: "Game menu" }).click();
  await page
    .getByRole("menuitemcheckbox", { exact: true, name: "Show coordinates" })
    .click();
  await expect(example.getByLabel("World action")).toContainText(
    "Coordinates on"
  );
  await page
    .getByRole("menuitem", { exact: true, name: "Resume game" })
    .click();
  await expect(example.getByLabel("World action")).toContainText("Resumed");
  await page.goto(`${origin}/docs/components/command`);
  example = page.locator(".documentation-example").first();
  await example.getByRole("combobox").fill("creative");
  await example.getByRole("option", { exact: true, name: "Creative" }).click();
  await expect(example.getByLabel("Selected command")).toHaveText("creative");
  const palette = page.locator(".documentation-example").nth(1);

  const paletteTrigger = palette.getByRole("button", {
    exact: true,
    name: "Open command palette",
  });

  await paletteTrigger.click();

  const dialog = page.getByRole("dialog", {
    exact: true,
    name: "World commands",
  });

  await dialog.getByRole("option", { exact: true, name: "Save world" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(palette.getByLabel("Palette selection")).toHaveText("save");
  await expect(paletteTrigger).toBeFocused();
});

test("documentation tooltip and popover open from their real focusable triggers", async ({
  page,
}) => {
  await page.goto(`${origin}/docs/components/tooltip`);
  let example = page.locator(".documentation-example").first();
  await example.getByRole("tab", { exact: true, name: "Preview" }).click();
  await page.keyboard.press("Tab");
  await expect(example.getByRole("tabpanel")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    example.getByRole("button", { exact: true, name: "Inspect pickaxe" })
  ).toBeFocused();
  await expect(page.locator('[data-slot="tooltip-content"]')).toContainText(
    "Diamond Pickaxe"
  );
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-slot="tooltip-content"]')).toHaveCount(0);
  await page.goto(`${origin}/docs/components/popover`);
  example = page.locator(".documentation-example").first();

  const trigger = example.getByRole("button", {
    exact: true,
    name: "World options",
  });

  await trigger.click();

  const popover = page.getByRole("dialog", {
    exact: true,
    name: "World settings",
  });

  await expect(popover).toHaveAccessibleDescription("Configure your world.");
  await page.keyboard.press("Escape");
  await expect(popover).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("documentation Calendar and Date Picker select with their actual DayPicker 10 APIs", async ({
  page,
}) => {
  await page.goto(`${origin}/docs/components/calendar`);
  let example = page.locator(".documentation-example").first();
  await example.getByRole("button", { name: /October 15.*2026/u }).click();
  await expect(example.getByLabel("Selected date")).toHaveText("10/15/2026");
  await page.goto(`${origin}/docs/components/date-picker`);
  example = page.locator(".documentation-example").first();

  const trigger = example.getByRole("button", {
    exact: true,
    name: "Pick a day",
  });

  await trigger.click();
  const popup = page.locator('[data-slot="date-picker-content"]');
  await popup.getByRole("button", { name: /October 15.*2026/u }).click();
  await expect(
    example.getByRole("button", { exact: true, name: "October 15th, 2026" })
  ).toBeVisible();
  await expect(popup).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(popup).toHaveCount(0);
});

test("documentation world browser filters and pages through TanStack Table 9", async ({
  page,
}) => {
  await page.goto(`${origin}/docs/components/data-table`);
  const example = page.locator(".documentation-example").nth(1);
  await expect(example.getByLabel("World selection")).toContainText(
    "Page 1 of 2"
  );
  await example.getByRole("button", { exact: true, name: "Next" }).click();
  await expect(example.getByLabel("World selection")).toContainText(
    "Page 2 of 2"
  );
  await example
    .getByRole("textbox", { exact: true, name: "Filter worlds" })
    .fill("Grasslands");
  await expect(
    example.getByRole("row").filter({ hasText: "Grasslands" })
  ).toHaveCount(1);
  await example.getByRole("row").filter({ hasText: "Grasslands" }).click();
  await expect(example.getByLabel("World selection")).toContainText(
    "1 selected"
  );
  await example
    .getByRole("textbox", { exact: true, name: "Filter worlds" })
    .fill("missing world");
  await expect(
    example.getByRole("cell", { exact: true, name: "No results." })
  ).toBeVisible();
});

test("documentation message scroller appends messages and navigates its bounded history", async ({
  page,
}) => {
  await page.goto(`${origin}/docs/components/message-scroller`);
  const example = page.locator(".documentation-example").first();
  const viewport = example.getByLabel("Player chat", { exact: true });
  await expect(example.getByLabel("Message count")).toHaveText("12 messages");
  await example.getByRole("button", { exact: true, name: "First" }).click();
  await expect
    .poll(async () => await viewport.evaluate((element) => element.scrollTop))
    .toBe(0);
  await example
    .getByRole("textbox", { exact: true, name: "Message text" })
    .fill("Bring torches.");
  await example.getByRole("button", { exact: true, name: "Send" }).click();
  await expect(example.getByLabel("Message count")).toHaveText("13 messages");
  await example.getByRole("button", { exact: true, name: "Latest" }).click();
  await expect(example.getByRole("log")).toContainText("Bring torches.");
  await expect
    .poll(
      async () =>
        await viewport.evaluate(
          (element) =>
            element.scrollHeight - element.clientHeight - element.scrollTop
        )
    )
    .toBeLessThan(2);
});

test("documentation bubble reactions and attachment actions retain local state", async ({
  page,
}) => {
  await page.goto(`${origin}/docs/components/bubble`);
  let example = page.locator(".documentation-example").first();
  await example.getByRole("button", { exact: true, name: "Like" }).click();
  await expect(
    example.getByRole("button", { exact: true, name: "Liked" })
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto(`${origin}/docs/components/attachment`);
  example = page.locator(".documentation-example").first();
  await example
    .getByRole("button", { exact: true, name: "Preview archive" })
    .click();
  await expect(example.getByLabel("Archive previews")).toHaveText("1 previews");
  await example
    .getByRole("button", { exact: true, name: "Remove archive" })
    .click();
  await expect(
    example.getByRole("button", { exact: true, name: "Preview archive" })
  ).toHaveCount(0);
  await example
    .getByRole("button", { exact: true, name: "Restore archive" })
    .click();
  await expect(
    example.getByRole("button", { exact: true, name: "Preview archive" })
  ).toBeVisible();
});

test("overlay documentation remains usable at its default mobile width", async ({
  page,
}, info) => {
  await page.setViewportSize({ height: 844, width: 390 });

  const mobileOverlaySlugs = [
    "dialog",
    "data-table",
    "message-scroller",
    "chart",
  ];

  const verifyMobileOverlayDocumentation = async (
    slug: (typeof mobileOverlaySlugs)[number]
  ) => {
    await page.goto(`${origin}/docs/components/${slug}`);
    await expect(page.locator(".documentation-example").first()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBeLessThanOrEqual(391);
    await page.screenshot({
      fullPage: true,
      path: info.outputPath(`${slug}-390-actual.png`),
    });
  };

  for (const slug of mobileOverlaySlugs) {
    // oxlint-disable-next-line no-await-in-loop -- Runs the current fixture case on one shared page; its navigation, interactions and observations finish before the next case replaces that page.
    await verifyMobileOverlayDocumentation(slug);
  }
});
