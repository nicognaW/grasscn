import { test, expect } from "@grasscn/tests/test";

test("book navigation and native page-turn sound", async ({ page }) => {
  await page.addInitScript(() => {
    const calls: { src: string; volume: number; rate: number }[] = [];
    (window as any).bookAudio = calls;
    class RecordedAudio {
      src: string;
      volume = 1;
      playbackRate = 1;
      constructor(src: string) {
        this.src = src;
      }
      play() {
        calls.push({
          src: this.src,
          volume: this.volume,
          rate: this.playbackRate,
        });
        return Promise.resolve();
      }
    }
    (window as any).Audio = RecordedAudio;
  });
  const sample = {
    element: "book",
    labels: ["First page", "Second page", "Third page"],
    value: 0,
  };
  await page.goto(
    `${process.env.GRASSCN_EXPANSION_URL ?? "http://127.0.0.1:5174/adventure.html"}?scale=2&case=${encodeURIComponent(JSON.stringify(sample))}`
  );
  const book = page.getByRole("group", { name: "Book", exact: true });
  await expect(page.getByRole("button", { name: "Previous page" })).toHaveCount(
    0
  );
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(
    page.getByRole("document", { name: "Page 2", exact: true })
  ).toContainText("Second page");
  const sound = await page.evaluate(() => (window as any).bookAudio);
  expect(sound).toHaveLength(1);
  expect(sound[0].src).toMatch(/^data:audio\/ogg;base64,/);
  expect(sound[0].volume).toBe(0.5);
  expect(sound[0].rate).toBe(1);
  await book.focus();
  await book.press("PageDown");
  await expect(
    page.getByRole("document", { name: "Page 3", exact: true })
  ).toContainText("Third page");
  await expect(page.getByRole("button", { name: "Next page" })).toHaveCount(0);
  await book.press("PageDown");
  await book.press("PageUp");
  await expect(
    page.getByRole("document", { name: "Page 2", exact: true })
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).bookAudio.length)).toBe(1);
});

test("hotbar pointer, keyboard and wheel selection", async ({ page }) => {
  const sample = { element: "hotbar", value: 0, background: "#202020" };
  await page.goto(
    `${process.env.GRASSCN_EXPANSION_URL ?? "http://127.0.0.1:5174/adventure.html"}?scale=2&case=${encodeURIComponent(JSON.stringify(sample))}`
  );
  const first = page.getByRole("button", { name: "Slot 1", exact: true });
  await first.click();
  await first.press("9");
  await expect(
    page.getByRole("button", { name: "Slot 9", exact: true })
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowRight");
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await page.mouse.wheel(0, 100);
  await expect(
    page.getByRole("button", { name: "Slot 2", exact: true })
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Slot 5", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Slot 5", exact: true })
  ).toHaveAttribute("aria-pressed", "true");
});

test("player preview keyboard, pointer rotation, clamp and reset", async ({
  page,
}) => {
  const sample = {
    element: "player-preview",
    state: "wide/steve",
    width: 80,
    height: 120,
    value: 30,
    anchor: -5,
  };
  await page.goto(
    `${process.env.GRASSCN_EXPANSION_URL ?? "http://127.0.0.1:5174/adventure.html"}?scale=2&case=${encodeURIComponent(JSON.stringify(sample))}`
  );
  const player = page.locator("[data-subject]");
  await expect(player).toHaveAttribute("data-ready", "true");
  const before = await player.screenshot();
  await player.focus();
  await player.press("ArrowLeft");
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(document.documentElement.dataset.rotation ?? "null")
      )
    )
    .toEqual({ yaw: 25, pitch: -5 });
  await player.press("Home");
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(document.documentElement.dataset.rotation ?? "null")
      )
    )
    .toEqual({ yaw: 30, pitch: -5 });
  await player.blur();
  expect(await player.screenshot()).toEqual(before);
  const box = (await player.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 200, { steps: 5 });
  await page.mouse.up();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(document.documentElement.dataset.rotation ?? "null")?.pitch
      )
    )
    .toBe(-50);
  expect(await player.screenshot()).not.toEqual(before);
});
