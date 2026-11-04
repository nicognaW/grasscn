// Non-PPT behavior of the Redstone Lamp display UI port: its accessible
// image and its refusal of unsupported glyphs. Pixels are covered by the
// projected-reference PPTs in packages/pixel-perfect.
import { test, expect } from "@grasscn/tests/test";

const fixture = (parameters: Record<string, string>) =>
  `/redstone-lamp-display.html?${new URLSearchParams(parameters)}`;

test("Redstone Lamp display is an image named by its value", async ({
  page,
}) => {
  await page.goto(fixture({ value: "12k" }));

  const display = page.getByRole("img", { exact: true, name: "12k" });
  await expect(display).toBeVisible();
  await expect(display).toHaveAttribute("data-rendered", "true");
  // Three glyphs and two gap columns of 8 px lamp cells, five rows tall.
  await expect(display).toHaveJSProperty("naturalWidth", 88);
  await expect(display).toHaveJSProperty("naturalHeight", 40);
});

test("Redstone Lamp display accessible name can be overridden", async ({
  page,
}) => {
  await page.goto(
    fixture({ label: "Star grasscn on GitHub, 1234 stars", value: "1234" })
  );

  await expect(
    page.getByRole("img", {
      exact: true,
      name: "Star grasscn on GitHub, 1234 stars",
    })
  ).toBeVisible();
  await expect(
    page.getByRole("img", { exact: true, name: "1234" })
  ).toHaveCount(0);
});

for (const value of ["", "1.5", "M", "K", "-1", "12 k"]) {
  test(`Redstone Lamp display refuses unsupported value ${JSON.stringify(value)}`, async ({
    page,
  }) => {
    await page.goto(fixture({ value }));

    await expect(page.getByRole("alert")).toHaveText(
      /^RedstoneLampDisplay (?:cannot show|needs a value)/u
    );
    await expect(page.getByRole("img")).toHaveCount(0);
  });
}

test("Redstone Lamp display shows every supported glyph", async ({ page }) => {
  await page.goto(fixture({ value: "0123456789k" }));

  const display = page.getByRole("img", { exact: true, name: "0123456789k" });
  await expect(display).toHaveAttribute("data-rendered", "true");
  // Eleven 3-cell glyphs and ten 1-cell gaps.
  await expect(display).toHaveJSProperty("naturalWidth", 43 * 8);
});
