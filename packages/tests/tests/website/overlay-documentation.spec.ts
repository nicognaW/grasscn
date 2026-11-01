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

test("overlay documentation exposes exact examples, own grouped source and retained playgrounds", async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (error) =>
    errors.push(`${page.url()}: ${error.message}`)
  );
  for (const slug of slugs) {
    await page.goto(`${origin}/docs/components/${slug}`);
    if (slug === "calendar") {
      await writeFile(
        info.outputPath("calendar-locale.json"),
        JSON.stringify(
          await page.evaluate(() => ({
            language: navigator.language,
            locale: Intl.DateTimeFormat().resolvedOptions().locale,
            defaultDate: new Date(2026, 9, 30).toLocaleDateString(),
            explicitDate: new Date(2026, 9, 30).toLocaleDateString("en-US"),
          }))
        )
      );
    }
    for (const id of ["preview", "usage", "composition", "installation"])
      await expect(page.locator(`h2#${id}`)).toBeVisible();
    const example = page.locator(".documentation-example").first();
    await expect(example.locator(".minecraft-example")).toBeVisible();
    if (["dialog", "data-table", "message-scroller", "chart"].includes(slug))
      await page.screenshot({
        path: info.outputPath(`${slug}-desktop-actual.png`),
        fullPage: true,
      });
    await example.getByRole("tab", { name: "Code", exact: true }).click();
    const filename =
      slug === "chart"
        ? "charts/fps-example.tsx"
        : `overlays/${slug}-example.tsx`;
    const source = await readFile(
      new URL(`../../../../apps/web/examples/${filename}`, import.meta.url),
      "utf8"
    );
    await page.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            (window as unknown as { copied: string }).copied = text;
          },
        },
      })
    );
    await example.getByRole("button", { name: "Copy", exact: true }).click();
    expect(
      await page.evaluate(
        () => (window as unknown as { copied: string }).copied
      )
    ).toBe(source);
    await expect(page.locator(".documentation-implementation")).toContainText(
      `components/${["date-picker", "data-table"].includes(slug) ? "" : "ui/"}${slug}.tsx`
    );
    await expect(
      page.getByRole("region", { name: `Interactive ${slug} playground` })
    ).toBeVisible();
    await expect(
      page.locator(".minecraft-prose").getByRole("alert")
    ).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test("documentation confirmation callbacks update once and close their actual modal", async ({
  page,
}) => {
  await page.goto(`${origin}/docs/components/alert-dialog`);
  let example = page.locator(".documentation-example").first();
  const trigger = example.getByRole("button", {
    name: "Delete world",
    exact: true,
  });
  await trigger.click();
  const alert = page.getByRole("alertdialog", {
    name: "Delete this world?",
    exact: true,
  });
  await expect(alert).toBeVisible();
  await alert.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(alert).toHaveCount(0);
  await expect(example.getByLabel("Confirmed deletions")).toHaveText(
    "1 confirmed"
  );
  await expect(trigger).toBeFocused();
  await page.goto(`${origin}/docs/components/dialog`);
  example = page.locator(".documentation-example").first();
  await example
    .getByRole("button", { name: "Open world settings", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "World settings", exact: true })
    .getByRole("button", { name: "Continue", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(example.getByLabel("Saved worlds")).toHaveText("1 saved");
});

test("documentation edge panels expose labelled Done actions", async ({
  page,
}) => {
  for (const slug of ["sheet", "drawer"]) {
    await page.goto(`${origin}/docs/components/${slug}`);
    const example = page.locator(".documentation-example").first();
    const trigger = example.getByRole("button", {
      name: `Open ${slug}`,
      exact: true,
    });
    await trigger.click();
    const dialog = page.getByRole("dialog", {
      name: "World settings",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
});

test("documentation menu and command examples dispatch real selections", async ({
  page,
}) => {
  await page.goto(`${origin}/docs/components/dropdown-menu`);
  let example = page.locator(".documentation-example").first();
  await example.getByRole("button", { name: "Game menu", exact: true }).click();
  await page
    .getByRole("menuitemcheckbox", { name: "Show coordinates", exact: true })
    .click();
  await expect(example.getByLabel("World action")).toContainText(
    "Coordinates on"
  );
  await page
    .getByRole("menuitem", { name: "Resume game", exact: true })
    .click();
  await expect(example.getByLabel("World action")).toContainText("Resumed");
  await page.goto(`${origin}/docs/components/command`);
  example = page.locator(".documentation-example").first();
  await example.getByRole("combobox").fill("creative");
  await example.getByRole("option", { name: "Creative", exact: true }).click();
  await expect(example.getByLabel("Selected command")).toHaveText("creative");
  const palette = page.locator(".documentation-example").nth(1);
  const paletteTrigger = palette.getByRole("button", {
    name: "Open command palette",
    exact: true,
  });
  await paletteTrigger.click();
  const dialog = page.getByRole("dialog", {
    name: "World commands",
    exact: true,
  });
  await dialog.getByRole("option", { name: "Save world", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(palette.getByLabel("Palette selection")).toHaveText("save");
  await expect(paletteTrigger).toBeFocused();
});

test("documentation tooltip and popover open from their real focusable triggers", async ({
  page,
}) => {
  await page.goto(`${origin}/docs/components/tooltip`);
  let example = page.locator(".documentation-example").first();
  await example.getByRole("tab", { name: "Preview", exact: true }).click();
  await page.keyboard.press("Tab");
  await expect(example.getByRole("tabpanel")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    example.getByRole("button", { name: "Inspect pickaxe", exact: true })
  ).toBeFocused();
  await expect(page.locator('[data-slot="tooltip-content"]')).toContainText(
    "Diamond Pickaxe"
  );
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-slot="tooltip-content"]')).toHaveCount(0);
  await page.goto(`${origin}/docs/components/popover`);
  example = page.locator(".documentation-example").first();
  const trigger = example.getByRole("button", {
    name: "World options",
    exact: true,
  });
  await trigger.click();
  const popover = page.getByRole("dialog", {
    name: "World settings",
    exact: true,
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
  await example.getByRole("button", { name: /October 15.*2026/ }).click();
  await expect(example.getByLabel("Selected date")).toHaveText("10/15/2026");
  await page.goto(`${origin}/docs/components/date-picker`);
  example = page.locator(".documentation-example").first();
  const trigger = example.getByRole("button", {
    name: "Pick a day",
    exact: true,
  });
  await trigger.click();
  const popup = page.locator('[data-slot="date-picker-content"]');
  await popup.getByRole("button", { name: /October 15.*2026/ }).click();
  await expect(
    example.getByRole("button", { name: "October 15th, 2026", exact: true })
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
  await example.getByRole("button", { name: "Next", exact: true }).click();
  await expect(example.getByLabel("World selection")).toContainText(
    "Page 2 of 2"
  );
  await example
    .getByRole("textbox", { name: "Filter worlds", exact: true })
    .fill("Grasslands");
  await expect(
    example.getByRole("row").filter({ hasText: "Grasslands" })
  ).toHaveCount(1);
  await example.getByRole("row").filter({ hasText: "Grasslands" }).click();
  await expect(example.getByLabel("World selection")).toContainText(
    "1 selected"
  );
  await example
    .getByRole("textbox", { name: "Filter worlds", exact: true })
    .fill("missing world");
  await expect(
    example.getByRole("cell", { name: "No results.", exact: true })
  ).toBeVisible();
});

test("documentation message scroller appends messages and navigates its bounded history", async ({
  page,
}) => {
  await page.goto(`${origin}/docs/components/message-scroller`);
  const example = page.locator(".documentation-example").first();
  const viewport = example.getByLabel("Player chat", { exact: true });
  await expect(example.getByLabel("Message count")).toHaveText("12 messages");
  await example.getByRole("button", { name: "First", exact: true }).click();
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollTop))
    .toBe(0);
  await example
    .getByRole("textbox", { name: "Message text", exact: true })
    .fill("Bring torches.");
  await example.getByRole("button", { name: "Send", exact: true }).click();
  await expect(example.getByLabel("Message count")).toHaveText("13 messages");
  await example.getByRole("button", { name: "Latest", exact: true }).click();
  await expect(example.getByRole("log")).toContainText("Bring torches.");
  await expect
    .poll(() =>
      viewport.evaluate(
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
  await example.getByRole("button", { name: "Like", exact: true }).click();
  await expect(
    example.getByRole("button", { name: "Liked", exact: true })
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto(`${origin}/docs/components/attachment`);
  example = page.locator(".documentation-example").first();
  await example
    .getByRole("button", { name: "Preview archive", exact: true })
    .click();
  await expect(example.getByLabel("Archive previews")).toHaveText("1 previews");
  await example
    .getByRole("button", { name: "Remove archive", exact: true })
    .click();
  await expect(
    example.getByRole("button", { name: "Preview archive", exact: true })
  ).toHaveCount(0);
  await example
    .getByRole("button", { name: "Restore archive", exact: true })
    .click();
  await expect(
    example.getByRole("button", { name: "Preview archive", exact: true })
  ).toBeVisible();
});

test("overlay documentation remains usable at its default mobile width", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const slug of ["dialog", "data-table", "message-scroller", "chart"]) {
    await page.goto(`${origin}/docs/components/${slug}`);
    await expect(page.locator(".documentation-example").first()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBeLessThanOrEqual(391);
    await page.screenshot({
      path: info.outputPath(`${slug}-390-actual.png`),
      fullPage: true,
    });
  }
});
