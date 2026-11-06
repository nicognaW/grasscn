import { expectNotNull } from "@grasscn/tests/assertions";
import { test, expect } from "@grasscn/tests/test";
import { minecraftClickSound } from "@grasscn/web/ui/minecraft-sound-assets";

interface InputGroupPlayback {
  rate: number;
  src: string;
  volume: number;
}

interface InputGroupPlaybackState {
  sounds: InputGroupPlayback[];
}

for (const part of ["input", "textarea"]) {
  test(`Input Group ${part} supports editing, addon focus and refs`, async ({
    page,
  }) => {
    await page.goto(`/?component=input-group&part=${part}`);
    const field = page.getByRole("textbox", { name: "Group field" });
    await expect(field).toHaveAttribute("spellcheck", "false");
    await expect(field).toHaveAttribute("autocorrect", "off");
    await field.fill(
      "こんにちは\n안녕하세요".replace(part === "input" ? "\n" : "\r", " ")
    );
    await expect(page.getByLabel("Group value")).toHaveText(
      part === "input" ? "こんにちは 안녕하세요" : "こんにちは\n안녕하세요"
    );
    await page.locator("[data-slot=input-group-text]").click();
    await expect(field).toBeFocused();
    await page.locator("#read-ref").click();
    await expect(page.getByLabel("Group refs")).toHaveText(
      `${part === "input" ? "INPUT" : "TEXTAREA"}/BUTTON`
    );
  });
}

test("Input Group addon alignment and cancelled focus remain functional", async ({
  page,
}) => {
  for (const align of [
    "inline-start",
    "inline-end",
    "block-start",
    "block-end",
  ]) {
    // oxlint-disable-next-line no-await-in-loop -- Runs the current fixture case on one shared page; its navigation, interactions and observations finish before the next case replaces that page.
    await page.goto(`/?component=input-group&align=${align}`);

    const addon = page.locator("[data-slot=input-group-addon]");
    const field = page.getByRole("textbox");

    // oxlint-disable-next-line no-await-in-loop -- Runs the current fixture case on one shared page; its navigation, interactions and observations finish before the next case replaces that page.
    await expect(addon).toHaveAttribute("data-align", align);

    // oxlint-disable-next-line no-await-in-loop -- Runs the current fixture case on one shared page; its navigation, interactions and observations finish before the next case replaces that page.
    const a = await addon.boundingBox();
    expectNotNull(a, "Missing required bounding box: a");
    // oxlint-disable-next-line no-await-in-loop -- Runs the current fixture case on one shared page; its navigation, interactions and observations finish before the next case replaces that page.
    const f = await field.boundingBox();
    expectNotNull(f, "Missing required bounding box: f");

    expect(
      align.startsWith("block") ? Math.abs(a.y - f.y) : Math.abs(a.x - f.x)
    ).toBeGreaterThan(1);
  }

  await page.goto("/?component=input-group&cancelAddon=1");
  await page.locator("[data-slot=input-group-text]").click();
  await expect(page.getByRole("textbox")).not.toBeFocused();
});

test("Input Group native buttons do not submit forms or steal focus", async ({
  page,
}) => {
  await page.goto("/?component=input-group");
  const button = page.getByRole("button", { exact: true, name: "Send" });
  await button.click();
  await expect(button).toBeFocused();
  await expect(page.getByLabel("Group actions")).toHaveText("1");
  await expect(page.getByLabel("Group refs")).not.toHaveText("submitted");
  await page.goto("/?component=input-group&disabled=1");
  await page
    .getByRole("button", { exact: true, name: "Send" })
    .dispatchEvent("click");
  await expect(page.getByLabel("Group actions")).toHaveText("0");
});

test("Input Group plays only the original button audio", async ({ page }) => {
  await page.addInitScript(() => {
    // SAFETY: This Input Group initScript creates sounds as an empty playback trace before navigation and playback.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned media state initialized by the paired addInitScript.
    (window as typeof window & InputGroupPlaybackState).sounds = [];
    // oxlint-disable-next-line typescript/promise-function-async -- This browser API stub records synchronously and returns its original fulfilled Promise; async would change throw and Promise-adoption timing.
    HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) {
      // SAFETY: The paired Input Group initializer owns sounds; this unchanged native play mock appends only rate, src and volume.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned media state initialized by the paired addInitScript.
      (window as typeof window & InputGroupPlaybackState).sounds.push({
        rate: this.playbackRate,
        src: this.src,
        volume: this.volume,
      });

      return Promise.resolve();
    };
  });
  await page.goto("/?component=input-group");
  await page.locator("[data-slot=input-group-text]").click();
  await page.getByRole("textbox").fill("世界");
  expect(
    await page.evaluate(
      () =>
        // SAFETY: This Input Group reader follows navigation initialized with the exact paired sounds producer.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned media state initialized by the paired addInitScript.
        (window as typeof window & InputGroupPlaybackState).sounds
    )
  ).toEqual([]);
  await page.getByRole("button", { exact: true, name: "Send" }).click();
  expect(
    await page.evaluate(
      () =>
        // SAFETY: This Input Group reader follows navigation initialized with the exact paired sounds producer.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned media state initialized by the paired addInitScript.
        (window as typeof window & InputGroupPlaybackState).sounds
    )
  ).toEqual([{ rate: 1, src: minecraftClickSound, volume: 0.25 }]);
});
