import { test, expect } from "@grasscn/tests/test";
import { minecraftClickSound } from "@grasscn/web/ui/minecraft-sound-assets";

test("Toggle supports pointer, Space and Enter with pressed semantics", async ({
  page,
}) => {
  await page.goto("/?component=toggle");

  const control = page.getByRole("button", {
    exact: true,
    name: "Recipe filter",
  });

  await expect(control).toHaveAttribute("aria-pressed", "false");
  await control.click();
  await expect(control).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Space");
  await expect(control).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("Enter");
  await expect(control).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#events")).toHaveText("3");
});

test("Toggle supports initial, controlled and externally changed values", async ({
  page,
}) => {
  await page.goto("/?component=toggle&checked=true");
  await expect(page.locator("[data-subject]")).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await page.goto("/?component=toggle&controlled=1");
  await page.locator("[data-subject]").click();
  await expect(page.locator("[data-subject]")).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await page.locator("#external").click();
  await expect(page.locator("[data-subject]")).toHaveAttribute(
    "aria-pressed",
    "false"
  );
  await expect(page.locator("#events")).toHaveText("1");
  await page.goto("/?component=toggle&controlled=1&reject=1");
  await page.locator("[data-subject]").click();
  await expect(page.locator("[data-subject]")).toHaveAttribute(
    "aria-pressed",
    "false"
  );
  await expect(page.locator("#events")).toHaveText("1");
});

test("Toggle cancellation prevents state changes", async ({ page }) => {
  await page.goto("/?component=toggle&cancel=1");
  await page.locator("[data-subject]").click();
  await expect(page.locator("[data-subject]")).toHaveAttribute(
    "aria-pressed",
    "false"
  );
  await expect(page.locator("#events")).toHaveText("0");
});

test("Toggle disabled button and composed link cannot activate", async ({
  page,
}) => {
  for (const extra of ["", "&asChild=1&anchor=1"]) {
    await page.goto(`/?component=toggle&state=disabled${extra}`);
    const control = page.locator("[data-subject]");
    await expect(control).toBeDisabled();
    await control.dispatchEvent("click");
    await expect(control).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("#events")).toHaveText("0");
  }
});

test("Toggle retains refs, rich children and asChild composition", async ({
  page,
}) => {
  for (const anchor of [false, true]) {
    await page.goto(
      `/?component=toggle&asChild=1&text=Hello%20世界${anchor ? "&anchor=1" : ""}`
    );
    const control = page.locator("[data-subject]");
    await expect(control).toContainText("Hello 世界");
    await control.click();
    await expect(control).toHaveAttribute("aria-pressed", "true");
    await page.locator("#read-ref").click();
    await expect(page.locator("#tag")).toHaveText(anchor ? "A" : "BUTTON");
  }
});

test("Toggle remains a non-submit button in a form", async ({ page }) => {
  await page.goto("/?component=toggle");
  await expect(page.locator("[data-subject]")).toHaveAttribute(
    "type",
    "button"
  );
  await page.locator("[data-subject]").evaluate((node) => {
    const form = document.createElement("form");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      form.dataset.submitted = "true";
    });
    node.before(form);
    form.append(node);
  });
  await page.locator("[data-subject]").click();
  await expect(page.locator("form")).not.toHaveAttribute(
    "data-submitted",
    "true"
  );
});

test("Toggle plays original game audio once per accepted activation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).sounds = [];
    HTMLMediaElement.prototype.play = function play() {
      (window as any).sounds.push({
        rate: this.playbackRate,
        src: this.src,
        volume: this.volume,
      });

      return Promise.resolve();
    };
  });
  await page.goto("/?component=toggle");
  const control = page.locator("[data-subject]");
  await control.hover();
  await control.focus();
  expect(await page.evaluate(() => (window as any).sounds)).toEqual([]);
  await control.click();
  await page.keyboard.press("Space");
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => (window as any).sounds)).toEqual(
    Array.from({ length: 3 }, () => ({
      rate: 1,
      src: minecraftClickSound,
      volume: 0.25,
    }))
  );

  for (const suffix of [
    "cancel=1",
    "state=disabled",
    "state=disabled&asChild=1&anchor=1",
  ]) {
    await page.goto(`/?component=toggle&${suffix}`);
    await page.locator("[data-subject]").dispatchEvent("click");
    expect(await page.evaluate(() => (window as any).sounds)).toEqual([]);
  }
});
