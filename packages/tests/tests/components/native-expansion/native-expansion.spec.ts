import { test, expect } from "@grasscn/tests/test";
import { expectLength } from "@grasscn/tests/assertions";
import type { PlayerRotation } from "@grasscn/web/ui/player-preview";

interface BookAudioFixtureWindow extends Window {
  bookAudio: { src: string; volume: number; rate: number }[];
}

declare global {
  interface Window {
    bookAudio?: { src: string; volume: number; rate: number }[];
  }
}

test("book navigation and native page-turn sound", async ({ page }) => {
  await page.addInitScript(() => {
    const calls: { src: string; volume: number; rate: number }[] = [];
    window.bookAudio = calls;

    class RecordedAudio {
      src: string;
      volume = 1;
      playbackRate = 1;
      constructor(src: string) {
        this.src = src;
      }
      play() {
        calls.push({
          rate: this.playbackRate,
          src: this.src,
          volume: this.volume,
        });

        return;
      }
    }

    Object.defineProperty(window, "Audio", { value: RecordedAudio });
  });

  const sample = {
    element: "book",
    labels: ["First page", "Second page", "Third page"],
    value: 0,
  };

  await page.goto(
    `${process.env.GRASSCN_EXPANSION_URL ?? "http://127.0.0.1:5174/adventure.html"}?scale=2&case=${encodeURIComponent(JSON.stringify(sample))}`
  );
  const book = page.getByRole("group", { exact: true, name: "Book" });
  await expect(page.getByRole("button", { name: "Previous page" })).toHaveCount(
    0
  );
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(
    page.getByRole("document", { exact: true, name: "Page 2" })
  ).toContainText("Second page");
  const sound = await page.evaluate(() => window.bookAudio);
  expectLength(sound, 1);
  expect(sound[0].src).toMatch(/^data:audio\/ogg;base64,/u);
  expect(sound[0].volume).toBe(0.5);
  expect(sound[0].rate).toBe(1);
  await book.focus();
  await book.press("PageDown");
  await expect(
    page.getByRole("document", { exact: true, name: "Page 3" })
  ).toContainText("Third page");
  await expect(page.getByRole("button", { name: "Next page" })).toHaveCount(0);
  await book.press("PageDown");
  await book.press("PageUp");
  await expect(
    page.getByRole("document", { exact: true, name: "Page 2" })
  ).toBeVisible();
  // SAFETY: this page's init script installs the same recorded-book array before app code; Page 2/3 assertions above establish the mounted fixture before this read.
  // oxlint-disable typescript/no-unsafe-type-assertion -- Exact page-local recorded-book playback protocol; no extra check or changed read.
  expect(
    await page.evaluate(
      () => (window as BookAudioFixtureWindow).bookAudio.length
    )
  ).toBe(1);
  // oxlint-enable typescript/no-unsafe-type-assertion
});

test("hotbar pointer, keyboard and wheel selection", async ({ page }) => {
  const sample = { background: "#202020", element: "hotbar", value: 0 };
  await page.goto(
    `${process.env.GRASSCN_EXPANSION_URL ?? "http://127.0.0.1:5174/adventure.html"}?scale=2&case=${encodeURIComponent(JSON.stringify(sample))}`
  );
  const first = page.getByRole("button", { exact: true, name: "Slot 1" });
  await first.click();
  await first.press("9");
  await expect(
    page.getByRole("button", { exact: true, name: "Slot 9" })
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowRight");
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await page.mouse.wheel(0, 100);
  await expect(
    page.getByRole("button", { exact: true, name: "Slot 2" })
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { exact: true, name: "Slot 5" }).click();
  await expect(
    page.getByRole("button", { exact: true, name: "Slot 5" })
  ).toHaveAttribute("aria-pressed", "true");
});

test("player preview keyboard, pointer rotation, clamp and reset", async ({
  page,
}) => {
  const sample = {
    anchor: -5,
    element: "player-preview",
    height: 120,
    state: "wide/steve",
    value: 30,
    width: 80,
  };

  await page.goto(
    `${process.env.GRASSCN_EXPANSION_URL ?? "http://127.0.0.1:5174/adventure.html"}?scale=2&case=${encodeURIComponent(JSON.stringify(sample))}`
  );
  const player = page.locator("[data-subject]");
  await expect(player).toHaveAttribute("data-ready", "true");
  const before = await player.screenshot();
  await player.focus();
  await player.press("ArrowLeft");
  // SAFETY: the owned player-preview fixture serializes its actual PlayerRotation callback value into dataset.rotation; the unchanged missing-data fallback parses null.
  // oxlint-disable typescript/no-unsafe-type-assertion -- Exact fixture JSON producer protocol; preserve parse position, optional pitch access and existing polling assertions.
  await expect
    .poll(
      async () =>
        await page.evaluate(() =>
          (JSON.parse(document.documentElement.dataset.rotation ?? "null") as PlayerRotation | null)
        )
    )
    .toEqual({ pitch: -5, yaw: 25 });
  // oxlint-enable typescript/no-unsafe-type-assertion
  await player.press("Home");
  // SAFETY: the owned player-preview fixture serializes its actual PlayerRotation callback value into dataset.rotation; the unchanged missing-data fallback parses null.
  // oxlint-disable typescript/no-unsafe-type-assertion -- Exact fixture JSON producer protocol; preserve parse position, optional pitch access and existing polling assertions.
  await expect
    .poll(
      async () =>
        await page.evaluate(() =>
          (JSON.parse(document.documentElement.dataset.rotation ?? "null") as PlayerRotation | null)
        )
    )
    .toEqual({ pitch: -5, yaw: 30 });
  // oxlint-enable typescript/no-unsafe-type-assertion
  await player.blur();
  expect(await player.screenshot()).toEqual(before);
  const box = (await player.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 200, { steps: 5 });
  await page.mouse.up();
  // SAFETY: the owned player-preview fixture serializes its actual PlayerRotation callback value into dataset.rotation; the unchanged missing-data fallback parses null.
  // oxlint-disable typescript/no-unsafe-type-assertion -- Exact fixture JSON producer protocol; preserve parse position, optional pitch access and existing polling assertions.
  await expect
    .poll(
      async () =>
        await page.evaluate(
          () =>
            (JSON.parse(document.documentElement.dataset.rotation ?? "null") as PlayerRotation | null)
              ?.pitch
        )
    )
    .toBe(-50);
  // oxlint-enable typescript/no-unsafe-type-assertion
  expect(await player.screenshot()).not.toEqual(before);
});
