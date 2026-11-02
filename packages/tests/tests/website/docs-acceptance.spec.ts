import { test, expect } from "@grasscn/tests/test";
import { nativeTextGap } from "@tests/harness/native-text-gap";

const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176";

test("documentation text supports real mouse selection with one accessible heading", async ({
  page,
}) => {
  await page.goto(`${origin}/docs/components/aspect-ratio`);
  const paragraph = page.locator(".minecraft-paragraph > p").first();
  await expect(paragraph).toBeVisible();
  const box = await paragraph.boundingBox();

  if (box === null) {
    throw new Error("Visible paragraph bounds required");
  }

  await page.mouse.move(box.x + 2, box.y + 8);
  await page.mouse.down();
  await page.mouse.move(box.x + Math.min(box.width - 2, 480), box.y + 8, {
    steps: 16,
  });
  await page.mouse.up();

  const selected = await page.evaluate(
    () => window.getSelection()?.toString().trim() ?? ""
  );

  expect(selected.length).toBeGreaterThan(8);
  expect(
    "Unskinned aspect-ratio layout for caller-supplied content.".startsWith(
      selected
    )
  ).toBe(true);
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Aspect Ratio"
  );
});

test("documentation navigation preserves its scroller and uses plain native text rows", async ({
  page,
}) => {
  await page.goto(`${origin}/docs/components/aspect-ratio`);
  const sidebar = page.locator(".minecraft-docs-sidebar");
  await expect(sidebar.locator("a.mc-button")).toHaveCount(0);
  await sidebar.evaluate((element) => {
    element.scrollTop = 450;
    element.dataset.preserved = "yes";
  });
  const before = await sidebar.evaluate((element) => element.scrollTop);

  const destination = await sidebar.locator("a").evaluateAll((elements) => {
    const frame = document
      .querySelector(".minecraft-docs-sidebar")
      ?.getBoundingClientRect();

    return elements
      .find((element) => {
        const box = element.getBoundingClientRect();

        return (
          frame !== undefined &&
          box.top > frame.top + 16 &&
          box.bottom < frame.bottom - 16 &&
          element.getAttribute("href")?.includes("/components/") === true
        );
      })
      ?.getAttribute("href");
  });

  if (destination === null || destination === undefined) {
    throw new Error("Visible navigation destination required");
  }

  await sidebar.locator(`a[href="${destination}"]`).click();
  await expect(page).toHaveURL(`${origin}${destination}`);
  await expect(sidebar).toHaveAttribute("data-preserved", "yes");
  expect(
    Math.abs((await sidebar.evaluate((element) => element.scrollTop)) - before)
  ).toBeLessThan(4);
});

test("wrapped prose retains inline code and literal spaces while GUI three heading spaces keep native advance", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 390 });
  await page.goto(`${origin}/docs/components/button`);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const paragraph = page
    .locator(".minecraft-paragraph > p")
    .filter({ hasText: "Import Button from your installed" });

  await expect(paragraph).toBeVisible();

  const selected = await paragraph.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    return selection?.toString();
  });

  expect(selected).toBe(
    "Import Button from your installed components/ui/button module. The primary example uses scale 2: its default 200 by 20 logical pixels render at 400 by 40 browser pixels."
  );
  await page.goto(`${origin}/docs/components/aspect-ratio`);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const width = await page
    .getByRole("heading", { level: 1 })
    .evaluate((element) => {
      const text = element.querySelector(".document-text");

      const space = [...(text?.childNodes ?? [])].find(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent === " "
      );

      if (space === undefined) {
        throw new Error("Heading space text node required");
      }

      const range = document.createRange();
      range.selectNodeContents(space);

      return range.getBoundingClientRect().width;
    });

  expect(width).toBe(12);
});

test("search shows canonical page results with exact component and export ownership", async ({
  page,
}) => {
  await page.goto(`${origin}/docs`);
  const search = page.getByRole("combobox", { name: "Search documentation" });
  await search.fill("button");
  await expect(page.getByRole("option").first()).toHaveAccessibleName("Button");

  const labels = await page
    .getByRole("option")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("aria-label"))
    );

  expect(new Set(labels).size).toBe(labels.length);
  expect(await page.getByRole("listbox").textContent()).not.toContain(
    "/docs/components/"
  );
  await search.fill("FieldSet");
  await expect(page.getByRole("option").first()).toHaveAccessibleName("Field");
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(page).toHaveURL(`${origin}/docs/components/field`);
});

test("primary tooltip example has a framed stage and room for its real popup", async ({
  page,
}) => {
  await page.goto(`${origin}/docs/components/tooltip`);
  const stage = page.locator(".minecraft-example").first();
  expect(
    await stage.evaluate((element) => element.getBoundingClientRect().height)
  ).toBeGreaterThanOrEqual(280);
  const trigger = stage.getByRole("button").first();
  await trigger.hover();
  const popup = page.locator('[data-slot="tooltip-content"]');
  await expect(popup).toBeVisible();
  await expect(popup).toHaveAttribute("data-open", "");
  await expect(popup).toContainText("Diamond Pickaxe");
  await expect(trigger).toHaveAccessibleName("Inspect pickaxe");
  const box = await popup.boundingBox();
  expect(box?.width).toBeGreaterThan(0);
});

for (const width of [320, 390, 1440]) {
  test(`homepage calendar keeps GUI two glyphs and all days reachable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width });
    await page.goto(origin);
    const calendar = page.locator(".grass-schedule-panel .mc-calendar");
    await calendar.scrollIntoViewIfNeeded();
    await expect(calendar).toBeVisible();
    expect(
      await calendar.evaluate((element) =>
        getComputedStyle(element).getPropertyValue("--mc-scale").trim()
      )
    ).toBe("2");
    const panel = page.locator(".grass-schedule-panel");
    expect(
      await panel.evaluate(
        (element) => element.scrollWidth <= element.clientWidth
      )
    ).toBe(true);
    await calendar.getByRole("button", { name: /November 15.*2026/u }).click();
    await expect(page.getByLabel("Review date", { exact: true })).toContainText(
      "November 15, 2026"
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBe(width);
  });
}

test("compact charts keep default tooltip labels and numbers at readable native GUI scale", async ({
  page,
}) => {
  await page.goto(`${origin}/charts/pie`);
  const chart = page.locator('[data-slot="chart"]').first();
  await chart.locator(".recharts-pie-sector").first().hover();
  const tooltip = page.locator(".mc-chart-tooltip").first();
  await expect(tooltip).toBeVisible();
  expect(
    await tooltip.evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--mc-scale").trim()
    )
  ).toBe("2");
  await expect(tooltip.locator(".font-mono")).toHaveCount(0);
  await expect(
    tooltip.locator(".mc-bitmap").filter({ hasText: "275" })
  ).toHaveCount(1);

  const gap = await tooltip.evaluate(nativeTextGap, {
    label: "Chrome",
    value: "275",
  });

  expect(gap).toBeGreaterThanOrEqual(8);
});
