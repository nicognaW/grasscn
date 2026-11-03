import { test, expect } from "@grasscn/tests/test";

interface TabsFallbackPlaybackState extends Window {
  voices?: number;
}

interface InitializedTabsFallbackPlaybackState extends TabsFallbackPlaybackState {
  voices: number;
}

for (const reason of ["disabled", "missing"]) {
  test(`Tabs automatic ${reason} fallback stays silent`, async ({ page }) => {
    await page.addInitScript(() => {
      // SAFETY: this write installs the actual recorder field on the new page; it is optional before this producer assignment.
      (window as TabsFallbackPlaybackState).voices = 0;
      HTMLMediaElement.prototype.play = function play() {
        // SAFETY: this page init script assigns the exact recorder before installing playback; the callback and post-navigation observations read that initialized field without changing any lookup.
        // oxlint-disable typescript/no-unsafe-type-assertion -- Exact initialized page-local playback recorder protocol; preserve original field reads and resets.
        (window as InitializedTabsFallbackPlaybackState).voices += 1;
        // oxlint-enable typescript/no-unsafe-type-assertion

        return Promise.resolve();
      };
    });
    await page.goto(`/?component=tabs-fallback&reason=${reason}`);
    await expect(
      page.getByRole("tab", { exact: true, name: "Second" })
    ).toHaveAttribute("aria-selected", "true");
    await page
      .getByRole("button", { exact: true, name: "Change tabs" })
      .click();
    await expect(
      page.getByRole("tab", { exact: true, name: "First" })
    ).toHaveAttribute("aria-selected", "true");
    await page.evaluate(async () => {
      const frameCompletion = Promise.withResolvers<void>();

      try {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            frameCompletion.resolve();
          });
        });
      } catch (error) {
        frameCompletion.reject(error);
      }

      await frameCompletion.promise;
    });
    // SAFETY: this page init script assigns the exact recorder before installing playback; the callback and post-navigation observations read that initialized field without changing any lookup.
    // oxlint-disable typescript/no-unsafe-type-assertion -- Exact initialized page-local playback recorder protocol; preserve original field reads and resets.
    expect(
      await page.evaluate(
        () => (window as InitializedTabsFallbackPlaybackState).voices
      )
    ).toBe(0);
    // oxlint-enable typescript/no-unsafe-type-assertion
  });
}
