import { test, expect } from "@grasscn/tests/test";
import { minecraftClickSound } from "@grasscn/web/ui/minecraft-sound-assets";
import type { RecordedAudioPlayback } from "@tests/harness/audio-playback";

interface SwitchAudioState {
  switchSounds: RecordedAudioPlayback[];
}

test("Switch toggles with pointer, Space and Enter, preserving role and native words", async ({
  page,
}) => {
  await page.goto("/?component=switch");

  const control = page.getByRole("switch", {
    exact: true,
    name: "Test switch",
  });

  await expect(control).not.toBeChecked();
  await expect(control.locator(".mc-switch-off")).toBeVisible();
  await control.click();
  await expect(control).toBeChecked();
  await expect(control.locator(".mc-switch-on")).toBeVisible();
  await expect(control.locator(".mc-switch-off")).toBeHidden();
  await page.keyboard.press("Space");
  await expect(control).not.toBeChecked();
  await page.keyboard.press("Enter");
  await expect(control).toBeChecked();
  await expect(page.getByLabel("Switch changes", { exact: true })).toHaveText(
    "3"
  );
});

test("Switch preserves controlled acceptance, rejection and external updates", async ({
  page,
}) => {
  await page.goto("/?component=switch&controlled=1");
  await page.getByRole("switch").click();
  await expect(page.getByRole("switch")).toBeChecked();
  await page.locator("#switch-external").click();
  await expect(page.getByRole("switch")).not.toBeChecked();
  await expect(page.getByLabel("Switch changes", { exact: true })).toHaveText(
    "1"
  );
  await page.goto("/?component=switch&controlled=1&reject=1");
  await page.getByRole("switch").click();
  await expect(page.getByRole("switch")).not.toBeChecked();
  await expect(page.getByLabel("Switch changes", { exact: true })).toHaveText(
    "1"
  );
});

test("Switch supports native form requirements, custom values and disabled exclusion", async ({
  page,
}) => {
  await page.goto("/?component=switch&form=1&required=1&formValue=custom");
  await page.getByRole("button", { exact: true, name: "Save switch" }).click();
  await expect(page.getByLabel("Submitted switch", { exact: true })).toHaveText(
    ""
  );
  await page.getByRole("switch").click();
  await page.getByRole("button", { exact: true, name: "Save switch" }).click();
  await expect(page.getByLabel("Submitted switch", { exact: true })).toHaveText(
    "custom"
  );
  await page.goto("/?component=switch&form=1&checked=true&state=disabled");
  await expect(page.getByRole("switch")).toBeDisabled();
  await page.getByRole("button", { exact: true, name: "Save switch" }).click();
  await expect(page.getByLabel("Submitted switch", { exact: true })).toHaveText(
    "missing"
  );
});

test("Switch retains label association, refs and asChild composition", async ({
  page,
}) => {
  await page.goto("/?component=switch&labelled=1&asChild=1");
  await page.locator('label[for="subject"]').click();
  await expect(
    page.getByRole("switch", { exact: true, name: "Switch setting" })
  ).toBeChecked();
  await page.locator("#switch-read-ref").click();
  await expect(page.getByLabel("Switch ref", { exact: true })).toHaveText(
    "BUTTON"
  );
  await page.goto("/?component=switch&asChild=1&anchor=1");
  await page.getByRole("switch").click();
  await expect(page.getByRole("switch")).toBeChecked();
  await page.locator("#switch-read-ref").click();
  await expect(page.getByLabel("Switch ref", { exact: true })).toHaveText("A");
  await page.goto("/?component=switch&asChild=1&anchor=1&state=disabled");
  await expect(page.getByRole("switch")).toBeDisabled();
  await page.getByRole("switch").dispatchEvent("click");
  await expect(page.getByRole("switch")).not.toBeChecked();
  await expect(page.getByLabel("Switch events", { exact: true })).toHaveText(
    "0"
  );
});

test("Switch uses original click audio once per activation, and respects cancellation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // SAFETY: This addInitScript owns switchSounds, creating its empty audio trace before navigation and playback.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned audio state initialized by the paired addInitScript.
    (window as typeof window & SwitchAudioState).switchSounds = [];
    // oxlint-disable-next-line typescript/promise-function-async -- This browser API stub records synchronously and returns its original fulfilled Promise; async would change throw and Promise-adoption timing.
    HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) {
      // SAFETY: The init script creates switchSounds; this unchanged media play mock records only rate, source and volume.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned audio state initialized by the paired addInitScript.
      (window as typeof window & SwitchAudioState).switchSounds.push({
        rate: this.playbackRate,
        source: this.src,
        volume: this.volume,
      });

      return Promise.resolve();
    };
  });

  const sounds = async () =>
    await page.evaluate(
      () =>
        // SAFETY: This paired reader runs after navigation's init script creates switchSounds with the recorded audio contract.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned audio state initialized by the paired addInitScript.
        (window as typeof window & SwitchAudioState).switchSounds
    );

  await page.goto("/?component=switch");
  const control = page.getByRole("switch");
  await control.hover();
  await control.focus();
  expect(await sounds()).toEqual([]);
  await control.click();
  expect(await sounds()).toEqual([
    { rate: 1, source: minecraftClickSound, volume: 0.25 },
  ]);
  await page.keyboard.press("Space");
  expect(await sounds()).toHaveLength(2);
  await page.keyboard.press("Enter");
  expect(await sounds()).toHaveLength(3);
  await page.goto("/?component=switch&state=disabled");
  await page.getByRole("switch").dispatchEvent("click");
  expect(await sounds()).toEqual([]);
  await page.goto("/?component=switch&prevent=1");
  await page.getByRole("switch").click();
  await expect(page.getByRole("switch")).not.toBeChecked();
  await expect(page.getByLabel("Switch events", { exact: true })).toHaveText(
    "1"
  );
  await expect(page.getByLabel("Switch changes", { exact: true })).toHaveText(
    "0"
  );
  expect(await sounds()).toEqual([]);
});
