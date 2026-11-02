import { test, expect } from "@grasscn/tests/test";

test.use({
  launchOptions: {
    args: [
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
    ],
  },
});

test("advancement tree selection, keyboard, details and panning", async ({
  page,
}) => {
  await page.goto(
    `${
      process.env.GRASSCN_TREE_INSTALLED_URL ??
      "http://127.0.0.1:5174/adventure.html"
    }?scale=2&mask=1`
  );
  const tree = page.getByRole("group", { name: "Advancement tree" }); const 
    first = page.getByRole("button", {
      exact: true,
      name: "Milestone 0, completed",
    });
  await first.hover();
  await expect(page.locator('[data-slot="tooltip-content"]')).toContainText(
    "Milestone 0"
  );
  await first.click();
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await first.press("ArrowRight");
  await expect(
    page.getByRole("button", { exact: true, name: "Milestone 1" })
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { exact: true, name: "Milestone 1" })
  ).toHaveAttribute("aria-pressed", "true");
  await tree.focus();

  const plane = page.locator(".mc-advancement-plane");
  const before = await plane.getAttribute("style");

  await tree.press("ArrowRight");
  expect(await plane.getAttribute("style")).not.toEqual(before);
  await tree.press("Home");
  expect(await plane.getAttribute("style")).toEqual(before);
  const box = (await tree.boundingBox())!;
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 40, box.y + 30, { steps: 4 });
  await page.mouse.up();
  expect(await plane.getAttribute("style")).not.toEqual(before);
});

test("advancement roadmap is available in the local website", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ height: 1000, width: 1440 });
  await page.goto("http://127.0.0.1:5176/components/advancement-tree");
  await expect(
    page.getByRole("heading", { exact: true, name: "Advancement Tree" })
  ).toBeVisible();

  const playground = page.getByRole("region", {
    exact: true,
    name: "advancement-tree playground",
  });

  await expect(
    playground.getByRole("group", { name: "Release roadmap" })
  ).toBeVisible();
  await playground
    .getByRole("button", { exact: true, name: "Mark incomplete" })
    .click();
  await expect(
    playground.getByRole("button", { exact: true, name: "Plan" })
  ).toHaveAttribute("data-completed", "false");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  await page.screenshot({
    fullPage: false,
    path: info.outputPath("advancement-tree-preview.png"),
  });
  expect(errors).toEqual([]);
});
