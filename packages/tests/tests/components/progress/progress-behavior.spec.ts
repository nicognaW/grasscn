import { test, expect } from "@grasscn/tests/test";

test("Progress exposes controlled values and completion semantics", async ({
  page,
}) => {
  await page.goto("/?component=progress&value=25&next=100");
  const progress = page.getByRole("progressbar", { name: "Test progress" });
  await expect(progress).toHaveAttribute("aria-valuemin", "0");
  await expect(progress).toHaveAttribute("aria-valuemax", "100");
  await expect(progress).toHaveAttribute("aria-valuenow", "25");
  await expect(progress).not.toHaveAttribute("aria-valuetext");
  await expect(progress).toHaveAttribute("data-progressing", "");
  await page.locator("#update-progress").click();
  await expect(progress).toHaveAttribute("aria-valuenow", "100");
  await expect(progress).toHaveAttribute("data-complete", "");
  await page.locator("#read-ref").click();
  await expect(page.getByLabel("Root ref", { exact: true })).toHaveText("DIV");
});

test("Progress asChild preserves refs, native attributes and events", async ({
  page,
}) => {
  await page.goto(
    "/?component=progress&value=50&asChild=1&color=green&overlay=notched_10"
  );
  const progress = page.getByRole("progressbar", { name: "Test progress" });
  await expect(progress).toHaveAttribute("data-testid", "composed-progress");
  await expect(progress).toHaveAttribute("data-color", "green");
  await expect(progress).toHaveAttribute("data-overlay", "notched_10");
  await progress.click();
  await expect(page.getByLabel("Activations", { exact: true })).toHaveText("1");
  await page.locator("#read-ref").click();
  await expect(page.getByLabel("Root ref", { exact: true })).toHaveText(
    "SECTION"
  );
});

test("Progress preserves native first-pixel fill and remains noninteractive", async ({
  page,
}) => {
  await page.goto("/?component=progress&value=0.0001&next=1");
  const indicator = page.locator('[data-slot="progress-indicator"]');
  await expect(indicator).toHaveCSS("width", "2px");
  await page.keyboard.press("Tab");
  await expect(page.locator("#update-progress")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(indicator).toHaveCSS("width", "4px");
});

test("Progress updates and pointer events are silent", async ({ page }) => {
  await page.addInitScript(() => {
    const state = Object.assign(window, { progressAudioPlays: 0 });
    HTMLMediaElement.prototype.play = function play() {
      state.progressAudioPlays += 1;

      return Promise.resolve();
    };
  });
  await page.goto("/?component=progress&value=10&next=50");
  await page.locator("#update-progress").click();
  await page.getByRole("progressbar").click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "50"
  );
  expect(
    await page.evaluate(() => {
      // SAFETY: this test installs and initializes its own playback counter before navigation.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Read only this fixture's initialized counter.
      const state = window as typeof window & { progressAudioPlays: number };

      return state.progressAudioPlays;
    })
  ).toBe(0);
});
