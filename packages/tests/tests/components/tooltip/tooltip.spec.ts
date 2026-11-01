import { test, expect } from "@grasscn/tests/test";

test("Tooltip supports hover, keyboard focus, Escape and trigger activation", async ({
  page,
}) => {
  await page.goto("/?component=tooltip&text=Tooltip");

  const trigger = page.locator("#tooltip-trigger");
  const content = page.locator('[data-slot="tooltip-content"]');

  await expect(content).toHaveCount(0);
  await trigger.hover();
  await expect(content).toBeVisible();
  await expect(trigger).not.toHaveAttribute("aria-describedby");
  await expect(content).toContainText("Tooltip");
  await page.keyboard.press("Escape");
  await expect(content).toHaveCount(0);
  await page.mouse.move(0, 0);
  await trigger.focus();
  await expect(content).toBeVisible();
  await trigger.click();
  await expect(page.getByLabel("Activations", { exact: true })).toHaveText("1");
  await expect(content).toHaveCount(0);
});

test("Tooltip preserves controlled state, asChild and the real content ref", async ({
  page,
}) => {
  await page.goto("/?component=tooltip&controlled=1&asChild=1&text=Tooltip");
  await page.locator("#external-open").click();
  const content = page.locator('[data-slot="tooltip-content"]');
  await expect(content).toBeVisible();
  await page.locator("#read-ref").evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
  await expect(page.getByLabel("Root ref", { exact: true })).toHaveText("DIV");
  await expect(content.locator(".mc-tooltip-line")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Tooltip open", { exact: true })).toHaveText(
    "false"
  );
});

test("Tooltip honors hover delay and accepts rich children", async ({
  page,
}) => {
  const clockTime = new Date("2030-01-01T00:00:00Z");
  await page.clock.install({ time: clockTime });
  await page.clock.pauseAt(new Date(clockTime.getTime() + 60_000));
  await page.goto("/?component=tooltip&delay=500&rich=1");
  const trigger = page.locator("#tooltip-trigger");
  await expect(trigger).toBeVisible();
  const bounds = (await trigger.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2
  );
  await page.clock.runFor(400);
  await expect(page.locator('[data-slot="tooltip-content"]')).toHaveCount(0);
  await page.clock.runFor(200);
  await expect(
    page.getByText("Rich tooltip", { exact: true }).first()
  ).toBeVisible();
});

test("Tooltip wraps and stays inside a mobile viewport at each edge", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });

  for (const side of ["top", "bottom", "left", "right"]) {
    await page.goto(
      `/?component=tooltip&open=1&scale=3&side=${side}&edge=${side}&text=${encodeURIComponent("Use this component to show a helpful description.")}`
    );
    const content = page.locator('[data-slot="tooltip-content"]');
    await expect(content).toBeVisible();
    await expect
      .poll(async () => {
        const box = (await content.boundingBox())!;

        return (
          box.x >= 0 &&
          box.y >= 0 &&
          box.x + box.width <= 390 &&
          box.y + box.height <= 844
        );
      })
      .toBe(true);
  }
});
