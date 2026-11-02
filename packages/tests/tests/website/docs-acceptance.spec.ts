import { test, expect } from "@grasscn/tests/test";
import { nativeTextGap } from "@tests/harness/native-text-gap";
import { PNG } from "pngjs";

const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176";

const bluePixel = (data: Uint8Array, index: number) =>
  data[index] === 0 && data[index + 1] === 0 && data[index + 2] === 255;

test("selected documentation paints blue bitmap glyphs on the original white highlight", async ({
  page,
}) => {
  await page.goto(`${origin}/docs/components/advancement-tree`);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const word = page
    .locator(".minecraft-paragraph")
    .first()
    .locator(".mc-bitmap")
    .filter({ hasText: "selectable" })
    .first();

  await expect(word).toBeVisible();
  const box = await word.boundingBox();

  if (box === null) {
    throw new Error("Visible selectable word bounds required");
  }

  const clip = {
    height: 50,
    width: Math.ceil(box.width) + 24,
    x: Math.floor(box.x) - 12,
    y: Math.floor(box.y) - 10,
  };

  const before = PNG.sync.read(
    await page.screenshot({ caret: "initial", clip })
  );

  await page.mouse.move(box.x + 1, box.y + 8);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 1, box.y + 8, { steps: 12 });
  await page.mouse.up();

  const selected = PNG.sync.read(
    await page.screenshot({ caret: "initial", clip })
  );

  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(
    "selectable"
  );

  let changedInk = 0;
  let highlightedPixels = 0;
  let selectedInk = 0;

  for (let index = 0; index < before.data.length; index += 4) {
    const x = (index / 4) % before.width;
    const y = Math.floor(index / 4 / before.width);

    if (x < 12 || x >= 12 + box.width || y < 10 || y >= 26) {
      continue;
    }

    const wasInk = [0, 1, 2].every(
      (channel) => before.data[index + channel] === 255
    );

    const isInk = bluePixel(selected.data, index);
    selectedInk += Number(isInk);

    if (wasInk !== isInk) {
      changedInk += 1;
    }

    if (
      !wasInk &&
      [0, 1, 2].every((channel) => selected.data[index + channel] === 255)
    ) {
      highlightedPixels += 1;
    }
  }

  expect(
    changedInk,
    "Selection must preserve the original bitmap foreground"
  ).toBe(0);
  expect(selectedInk).toBeGreaterThan(50);
  expect(
    highlightedPixels,
    "Selection must have a visible background"
  ).toBeGreaterThan(100);

  await word.locator(".mc-text-accessible").evaluate((element) => {
    const range = document.createRange();
    const text = element.firstChild;

    if (!text) {
      throw new Error("Selectable text node required");
    }

    range.setStart(text, 2);
    range.setEnd(text, 6);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(
    "lect"
  );

  const partial = PNG.sync.read(
    await page.screenshot({ caret: "initial", clip })
  );

  const edges = await word.locator(".mc-glyph").evaluateAll((glyphs) => ({
    left: glyphs[2].getBoundingClientRect().left,
    right: glyphs[6].getBoundingClientRect().left,
  }));

  let partialMismatch = 0;

  for (let index = 0; index < before.data.length; index += 4) {
    const x = (index / 4) % before.width;
    const y = Math.floor(index / 4 / before.width);

    if (x < 12 || x >= 12 + box.width || y < 10 || y >= 26) {
      continue;
    }

    const originalInk = [0, 1, 2].every(
      (channel) => before.data[index + channel] === 255
    );

    const expectedBlue =
      originalInk && x + clip.x >= edges.left && x + clip.x < edges.right;

    const actualBlue = bluePixel(partial.data, index);

    if (expectedBlue !== actualBlue) {
      partialMismatch += 1;
    }
  }

  expect(partialMismatch).toBe(0);
  await page.evaluate(() => window.getSelection()?.removeAllRanges());

  const restored = PNG.sync.read(
    await page.screenshot({ caret: "initial", clip })
  );

  expect(restored.data).toEqual(before.data);
});

test("canvas-rendered documentation symbols keep their selected glyphs and restore afterwards", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto(`${origin}/docs/components/message-scroller`);
  const example = page.locator(".documentation-example").first();
  await example.getByRole("tab", { exact: true, name: "Code" }).click();
  await example.getByRole("button", { exact: true, name: "Expand" }).click();

  const symbol = example
    .locator('[data-mc-label-ready="true"]')
    .filter({ hasText: "带上你的镐子。" })
    .first();

  await symbol.waitFor();
  const before = PNG.sync.read(await symbol.screenshot({ caret: "initial" }));

  const source = await symbol
    .locator("canvas")
    .evaluate((canvas: HTMLCanvasElement) => {
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Rendered native canvas required");
      }

      return [...context.getImageData(0, 0, canvas.width, canvas.height).data];
    });

  const sourceInk = Math.max(
    ...source.filter((value, index) => index % 4 === 0 && source[index + 3] > 0)
  );

  await symbol.locator(".mc-text-accessible").evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await expect(symbol.locator("canvas[data-document-selection]")).toHaveCount(
    1
  );
  const selected = PNG.sync.read(await symbol.screenshot({ caret: "initial" }));
  let mismatch = 0;
  let ink = 0;

  for (let index = 0; index < before.data.length; index += 4) {
    const wasInk = source[index + 3] > 0 && source[index] === sourceInk;
    const isInk = bluePixel(selected.data, index);
    ink += Number(isInk);

    if (wasInk !== isInk) {
      mismatch += 1;
    }
  }

  expect(ink).toBeGreaterThan(0);
  expect(mismatch).toBe(0);
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  await expect(symbol.locator("canvas[data-document-selection]")).toHaveCount(
    0
  );
  const restored = PNG.sync.read(await symbol.screenshot({ caret: "initial" }));
  expect(restored.data).toEqual(before.data);
});

test("component route links retain a pointer over their bitmap text", async ({
  page,
}) => {
  await page.goto(`${origin}/docs/components/button`);

  const navigation = page.getByRole("navigation", {
    exact: true,
    name: "Documentation",
  });

  const destination = navigation.getByRole("link", {
    exact: true,
    name: "Calendar",
  });

  await expect(destination.locator(".mc-text-accessible")).toHaveCSS(
    "cursor",
    "pointer"
  );
  const toc = page.getByRole("navigation", { name: "On this page" });
  await expect(
    toc
      .getByRole("link", { exact: true, name: "Usage" })
      .locator(".mc-text-accessible")
  ).toHaveCSS("cursor", "pointer");
  await destination.click();
  await expect(page).toHaveURL(`${origin}/docs/components/calendar`);
});

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
