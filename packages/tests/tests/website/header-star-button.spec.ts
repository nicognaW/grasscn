import { test, expect } from "@grasscn/tests/test";
import type { Page } from "@playwright/test";

const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/u, "/");

// The count comes from the live GitHub repository API, so a preview that
// cannot reach GitHub shows the no-count name instead.
const STAR_NAME = /^Star grasscn on GitHub(?:, (?<count>\d+k?) stars)?$/u;

const starButton = (page: Page) =>
  page.getByRole("banner").getByRole("link", { name: STAR_NAME });

test("Header star button opens the repository in a new tab instead of a GitHub text link", async ({
  page,
}) => {
  await page.goto(`${origin}docs`);
  const banner = page.getByRole("banner");

  await expect(starButton(page)).toHaveAttribute(
    "href",
    "https://github.com/nicognaW/grasscn"
  );
  await expect(starButton(page)).toHaveAttribute("target", "_blank");
  await expect(starButton(page)).toHaveAttribute("rel", /\bnoopener\b/u);
  await expect(
    banner.getByRole("link", { exact: true, name: "GitHub" })
  ).toHaveCount(0);
});

test("Header star button names its count, drawn on the Redstone Lamp display", async ({
  page,
}) => {
  await page.goto(`${origin}docs`);
  const button = starButton(page);
  const name = (await button.getAttribute("aria-label")) ?? "";
  const count = STAR_NAME.exec(name)?.groups?.count;
  const display = button.locator('[data-slot="redstone-lamp-display"]');

  expect(name).toMatch(STAR_NAME);

  if (count === undefined) {
    await expect(display).toHaveCount(0);
  } else {
    // One 24 px glyph per character with an 8 px gap: the display shows the
    // named count, not a stale or default value.
    await expect(display).toHaveAttribute("data-rendered", "true");
    await expect(display).toHaveAttribute(
      "width",
      String((4 * count.length - 1) * 8)
    );
  }

  // The anchor alone carries the name; the display adds no second one.
  await expect(button.getByRole("img")).toHaveCount(0);
});

test("Header star button shows the site focus outline for keyboard focus", async ({
  page,
}) => {
  await page.goto(`${origin}docs`);
  const button = starButton(page);

  await expect(button).toBeVisible();
  await page
    .getByRole("banner")
    .getByRole("link", { exact: true, name: "grasscn home" })
    .focus();

  for (let step = 0; step < 12; step += 1) {
    // oxlint-disable-next-line no-await-in-loop -- keyboard focus moves one stop at a time.
    if (await button.evaluate((node) => node === document.activeElement)) {
      break;
    }

    // oxlint-disable-next-line no-await-in-loop -- keyboard focus moves one stop at a time.
    await page.keyboard.press("Tab");
  }

  await expect(button).toBeFocused();
  await expect(button).toHaveCSS("outline-style", "solid");
  await expect(button).toHaveCSS("outline-width", "2px");
  await expect(button).toHaveCSS("outline-color", "rgb(255, 255, 255)");
  await expect(button).toHaveCSS("outline-offset", "4px");
});

test("Header star button stays on the brand row at 720 px and below", async ({
  page,
}) => {
  for (const width of [720, 390, 320]) {
    // oxlint-disable-next-line no-await-in-loop -- each width is its own layout.
    await page.setViewportSize({ height: 844, width });
    // oxlint-disable-next-line no-await-in-loop -- each width is its own layout.
    await page.goto(`${origin}docs`);

    const brand = page
      .getByRole("banner")
      .getByRole("link", { exact: true, name: "grasscn home" });

    // oxlint-disable-next-line no-await-in-loop -- each width is its own layout.
    const brandBox = await brand.boundingBox();
    // oxlint-disable-next-line no-await-in-loop -- each width is its own layout.
    const buttonBox = await starButton(page).boundingBox();

    // oxlint-disable-next-line no-await-in-loop -- each width is its own layout.
    const navBox = await page
      .getByRole("navigation", { name: "Main navigation" })
      .boundingBox();

    expect(brandBox, `brand at ${width}`).not.toBeNull();
    expect(buttonBox, `star button at ${width}`).not.toBeNull();
    expect(navBox, `navigation at ${width}`).not.toBeNull();

    if (brandBox === null || buttonBox === null || navBox === null) {
      return;
    }

    // Beside the brand, inside its row, above the wrapped navigation and
    // within the viewport.
    expect(buttonBox.x, `${width}`).toBeGreaterThanOrEqual(
      brandBox.x + brandBox.width
    );
    expect(buttonBox.y, `${width}`).toBeGreaterThanOrEqual(brandBox.y);
    expect(buttonBox.y + buttonBox.height, `${width}`).toBeLessThanOrEqual(
      brandBox.y + brandBox.height
    );
    expect(buttonBox.y + buttonBox.height, `${width}`).toBeLessThanOrEqual(
      navBox.y
    );
    expect(buttonBox.x + buttonBox.width, `${width}`).toBeLessThanOrEqual(
      width
    );
    expect(
      // oxlint-disable-next-line no-await-in-loop -- each width is its own layout.
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      ),
      `${width}`
    ).toBe(true);
  }
});
