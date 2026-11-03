import { expectNotNull } from "@grasscn/tests/assertions";
import { test, expect } from "@grasscn/tests/test";

test("Button keeps consumer SVG/rich nodes, props, handlers and intended spacing", async ({
  page,
}, _info) => {
  await page.goto("/?component=button-composition&composition=rich");

  const icon = page.getByTestId("consumer-icon");
  const rich = page.getByTestId("consumer-rich");

  await expect(icon).toHaveCount(1);
  await expect(rich).toHaveAttribute("data-preserved", "yes");

  const a = await icon.boundingBox();
  expectNotNull(a, "Missing required bounding box: a");
  const b = await rich.boundingBox();
  expectNotNull(b, "Missing required bounding box: b");

  expect(b.x - a.x - a.width).toBeGreaterThan(0);
  await rich.click();
  await expect(page.getByLabel("Rich child events")).toHaveText("1");
});
