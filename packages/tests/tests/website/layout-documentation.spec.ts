import { readFile, writeFile } from "node:fs/promises";


import { test, expect } from "@grasscn/tests/test";

const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176";

test("layout documentation exposes its actual examples and complete source", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const slugs = [
    "card",
    "separator",
    "scroll-area",
    "progress",
    "tabs",
    "collapsible",
    "aspect-ratio",
    "button-group",
    "pagination",
    "badge",
    "typography",
    "breadcrumb",
    "kbd",
    "empty",
    "resizable",
    "sidebar",
    "spinner",
    "code-block",
    "sonner",
    "marker",
    "trace",
  ];
  for (const slug of slugs) {
    await page.goto(`${origin}/docs/components/${slug}`);
    for (const id of ["preview", "usage", "composition", "installation"])
      await expect(page.locator(`h2#${id}`)).toBeVisible();
    const example = page.locator(".documentation-example").first();
    await expect(example.locator(".minecraft-example")).toBeVisible();
    await example
      .getByRole("tab", { name: "Code", exact: true })
      .first()
      .click();
    const source = await readFile(
      new URL(
        `../../../../apps/web/examples/layout/${slug}-example.tsx`,
        import.meta.url
      ),
      "utf8"
    );
    await expect(example.locator("pre")).toContainText('"use client"');
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            (window as unknown as { copiedExample: string }).copiedExample =
              text;
          },
        },
      });
    });
    await example.getByRole("button", { name: "Copy", exact: true }).click();
    await expect(example.getByRole("status")).toHaveText("Copied");
    expect(
      await page.evaluate(
        () => (window as unknown as { copiedExample: string }).copiedExample
      )
    ).toBe(source);
    await expect(
      page.getByRole("heading", { name: "Interactive playground", exact: true })
    ).toBeVisible();
    await expect(
      page.locator(".minecraft-prose").getByRole("alert")
    ).toHaveCount(0);
  }
});

test("default composed documentation examples retain their owned state and callbacks", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto(`${origin}/docs/components/card`);
  let example = page.locator(".documentation-example").first();
  await example.getByRole("textbox", { name: "World name" }).fill("Survival");
  await example.getByRole("button", { name: "Done", exact: true }).click();
  await expect(example.getByRole("status")).toMatchAriaSnapshot(
    "- status: Settings saved"
  );
  await page.goto(`${origin}/docs/components/tabs`);
  example = page.locator(".documentation-example").first();
  await example.getByRole("tab", { name: "World", exact: true }).click();
  await expect(
    example.getByRole("tabpanel", { name: "World", exact: true })
  ).toContainText("Generate structures");
  await page.goto(`${origin}/docs/components/collapsible`);
  example = page.locator(".documentation-example").first();
  await example
    .getByRole("button", { name: "World details", exact: true })
    .click();
  await expect(
    example.locator('[data-slot="collapsible-content"]')
  ).toContainText("Survival world with structures enabled.");
  await page.goto(`${origin}/docs/components/pagination`);
  example = page.locator(".documentation-example").first();
  await expect(
    example.getByRole("link", { name: "Go to previous page" })
  ).toHaveAttribute("aria-disabled", "true");
  await example.getByRole("link", { name: "2", exact: true }).click();
  await expect(
    example.getByRole("link", { name: "2", exact: true })
  ).toHaveAttribute("aria-current", "page");
  await page.goto(`${origin}/docs/components/trace`);
  example = page.locator(".documentation-example").first();
  await example.getByRole("button", { name: "Details", exact: true }).click();
  await expect(
    example.locator('[data-slot="trace-collapsible-content"]')
  ).toContainText("Placed 64 blocks.");
  await page.goto(`${origin}/docs/components/progress`);
  example = page.locator(".documentation-example").first();
  await example.getByRole("button", { name: "Complete", exact: true }).click();
  await expect(example.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "100"
  );
  await page.goto(`${origin}/docs/components/empty`);
  example = page.getByRole("region", { name: "Empty Create", exact: true });
  await example
    .getByRole("button", { name: "Create world", exact: true })
    .click();
  await expect(
    example.getByRole("button", { name: "Create world", exact: true })
  ).toBeDisabled();
  await expect(example.locator('[data-slot="empty-title"]')).toContainText(
    "World created"
  );
  await page.goto(`${origin}/docs/components/resizable`);
  example = page.locator(".documentation-example").first();
  const handle = example.getByRole("separator", {
    name: "Resize inventory panels",
  });
  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw Error("Resizable handle has no bounds");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2);
  await page.mouse.up();
  await expect
    .poll(async () => example.getByLabel("Panel layout").ariaSnapshot())
    .not.toContain("50% / 50%");
  await example
    .getByRole("button", { name: "Reset panels", exact: true })
    .click();
  await expect
    .poll(async () => example.getByLabel("Panel layout").ariaSnapshot())
    .toContain("50% / 50%");
});

test("default responsive Sidebar composition toggles within its desktop context and mobile portal", async ({
  page,
}, info) => {
  await page.goto(`${origin}/docs/components/sidebar`);
  const example = page.getByRole("region", {
    name: "Sidebar Responsive",
    exact: true,
  });
  await example.scrollIntoViewIfNeeded();
  await writeFile(
    info.outputPath("sidebar-desktop-actual.png"),
    await page.screenshot()
  );
  await info.attach("sidebar-desktop-actual.png", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  const sidebar = example.locator('[data-slot="sidebar"]');
  await expect(sidebar).toHaveAttribute("data-state", "expanded");
  await example
    .getByRole("button", { name: "Toggle world navigation" })
    .click();
  await expect(sidebar).toHaveAttribute("data-state", "collapsed");
  await page.setViewportSize({ width: 390, height: 844 });
  await example
    .getByRole("button", { name: "Toggle world navigation" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Sidebar", exact: true });
  await expect(
    dialog.getByRole("link", { name: "Worlds", exact: true })
  ).toBeVisible();
  await writeFile(
    info.outputPath("sidebar-mobile-actual.png"),
    await page.screenshot()
  );
  await info.attach("sidebar-mobile-actual.png", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("documentation prose styles preserve native breadcrumb ink and keyboard focus", async ({
  page,
}) => {
  await page.goto(`${origin}/docs/components/breadcrumb`);
  const example = page.locator(".documentation-example").first();
  const home = example.getByRole("link", { name: "Home", exact: true });
  expect(
    await home.evaluate((node) => ({
      color: getComputedStyle(node).color,
      decoration: getComputedStyle(node).textDecorationLine,
    }))
  ).toEqual({ color: "rgb(255, 255, 255)", decoration: "none" });
  await home.focus();
  await expect(home).toBeFocused();
  expect(
    await home.evaluate((node) => getComputedStyle(node).outlineStyle)
  ).toBe("solid");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#preview$/);
});

test("default code renderer copies its own complete source and Sonner uses one host", async ({
  page,
}) => {
  await page.goto(`${origin}/docs/components/code-block`);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copied: string }).copied = text;
        },
      },
    });
  });
  const example = page.locator(".documentation-example").first();
  await example.getByRole("button", { name: /copy/i }).click();
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied)
  ).toBe('const world = "Minecraft";');
  await page.goto(`${origin}/docs/components/sonner`);
  await page
    .locator(".documentation-example")
    .first()
    .getByRole("button", { name: "Show message", exact: true })
    .click();
  await expect(page.locator("[data-sonner-toaster]")).toHaveCount(1);
  await expect(page.locator("[data-sonner-toast]").first()).toContainText(
    "World saved"
  );
});
