import { test, expect } from "@grasscn/tests/test";

const fixture =
  process.env.GRASSCN_TREE_INSTALLED_URL ??
  "http://127.0.0.1:5174/adventure.html";

test.use({
  launchOptions: { args: ["--disable-gpu", "--disable-extensions"] },
});

test("component navigation labels fit their buttons on desktop and mobile", async ({
  page,
}, info) => {
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ height: 1000, width });
    await page.goto("http://127.0.0.1:5176/components/advancement-tree");

    const browse = page.getByRole("button", {
      exact: true,
      name: "Browse documentation",
    });

    const mobileNavigation = await browse.isVisible();

    if (mobileNavigation) {
      await browse.click();
    }

    const navigation = page.getByRole("navigation", {
      exact: true,
      name: "Documentation",
    });

    await expect(
      navigation.getByRole("link", { exact: true, name: "Advancement Tree" })
    ).toBeVisible();

    const clipped = await navigation
      .locator("a.mc-button")
      .evaluateAll((links) =>
        links.flatMap((link) => {
          const text = link.querySelector(".mc-text-pixels");

          if (!text) {
            return [];
          }

          const a = link.getBoundingClientRect();
          const b = text.getBoundingClientRect();

          return b.left < a.left + 3 || b.right > a.right - 3
            ? [link.textContent?.trim()]
            : [];
        })
      );

    expect(clipped, `clipped component labels at ${width}px`).toEqual([]);

    if (width === 1440) {
      await page.screenshot({
        path: info.outputPath("advancement-navigation-fixed.png"),
      });
    }
  }
});

test("small pointer movement still selects an advancement", async ({
  page,
}) => {
  await page.goto(fixture + "?scale=2&mask=1");

  const node = page.getByRole("button", { exact: true, name: "Milestone 1" });
  const plane = page.locator(".mc-advancement-plane");
  const before = await plane.getAttribute("style");
  const box = await node.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 5, box.y + box.height / 2);
  await page.mouse.up();
  await expect(node).toHaveAttribute("aria-pressed", "true");
  expect(await plane.getAttribute("style")).toBe(before);
});

test("dragging from a node pans without selecting and does not block keyboard selection", async ({
  page,
}) => {
  const warnings: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      warnings.push(message.text());
    }
  });
  await page.goto(fixture + "?scale=2&mask=1");

  const node = page.getByRole("button", { exact: true, name: "Milestone 1" });
  const plane = page.locator(".mc-advancement-plane");
  const before = await plane.getAttribute("style");
  const box = await node.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 50,
    box.y + box.height / 2 + 20,
    { steps: 5 }
  );
  await page.mouse.up();
  expect(await plane.getAttribute("style")).not.toBe(before);
  await expect(node).toHaveAttribute("aria-pressed", "false");
  await node.focus();
  await node.press("Enter");
  await expect(node).toHaveAttribute("aria-pressed", "true");
  await node.click();
  await expect(node).toHaveAttribute("aria-pressed", "true");
  expect(
    warnings.filter((message) =>
      /[cC][oO][nN][tT][rR][oO][lL][lL][eE][dD]|[pP][oO][iI][nN][tT][eE][rR] [cC][aA][pP][tT][uU][rR][eE]/u.test(
        message
      )
    )
  ).toEqual([]);
});

test("cancelled drag permits the next click and keyboard selection", async ({
  page,
}) => {
  await page.goto(fixture + "?scale=2&mask=1");
  const tree = page.getByRole("group", { name: "Advancement tree" });
  const node = page.getByRole("button", { exact: true, name: "Milestone 1" });
  const box = await node.boundingBox();
  const plane = page.locator(".mc-advancement-plane");
  await node.hover();
  await expect(page.locator('[data-slot="tooltip-content"]')).toBeVisible();
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 30,
    box.y + box.height / 2 + 10,
    { steps: 4 }
  );
  await expect(page.locator('[data-slot="tooltip-content"]')).toHaveCount(0);
  await tree.dispatchEvent("pointercancel", { isPrimary: true, pointerId: 1 });
  await page.mouse.up();
  const pan = await plane.getAttribute("style");
  await page.mouse.move(1000, 800);
  expect(await plane.getAttribute("style")).toBe(pan);
  await node.click();
  await expect(node).toHaveAttribute("aria-pressed", "true");
  const next = page.getByRole("button", { exact: true, name: "Milestone 2" });
  await next.focus();
  await next.press("Enter");
  await expect(next).toHaveAttribute("aria-pressed", "true");
});
