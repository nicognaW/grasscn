import { readFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { fixtureFile, pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

test("website loads Dream with slim arms after both presets", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://mc-heads.net/skin/Dream", async (route) => {
    await route.fulfill({
      body: readFileSync(fixtureFile("dream-skin.png")),
      contentType: "image/png",
      headers: { "access-control-allow-origin": "*" },
      status: 200,
    });
  });
  await page.goto("http://127.0.0.1:5176/components/player-preview");

  const player = page.getByRole("group", {
    exact: true,
    name: "Player preview",
  });

  for (const preset of ["Steve", "Alex"]) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- Apply each input to the same player state in order before sending the next input.
    await page.getByRole("button", { exact: true, name: preset }).click();
    // oxlint-disable-next-line eslint/no-await-in-loop -- Apply each input to the same player state in order before sending the next input.
    await expect(player).toHaveAttribute("data-ready", "true");
    // oxlint-disable-next-line eslint/no-await-in-loop -- Apply each input to the same player state in order before sending the next input.
    await page
      .getByRole("textbox", { exact: true, name: "Player name" })
      .fill("Dream");
    // oxlint-disable-next-line eslint/no-await-in-loop -- Apply each input to the same player state in order before sending the next input.
    await page.getByRole("button", { exact: true, name: "Load skin" }).click();
    // oxlint-disable-next-line eslint/no-await-in-loop -- Apply each input to the same player state in order before sending the next input.
    await expect(player).toHaveAttribute("data-model", "slim");
    // oxlint-disable-next-line eslint/no-await-in-loop -- Apply each input to the same player state in order before sending the next input.
    await expect(player).toHaveAttribute("data-ready", "true");
  }

  await player.focus();
  await player.press("ArrowDown");

  for (let i = 0; i < 30; i += 1) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- Apply each input to the same player state in order before sending the next input.
    await player.press("ArrowRight");
  }

  await player.blur();

  const actual = await player.locator("canvas").screenshot();
  const a = PNG.sync.read(actual);

  const b = PNG.sync.read(
    readFileSync(
      pixelPerfectFile(
        "tests/reference/player-preview/custom-skins/captures/player-back-1-s2.png"
      )
    )
  );

  expect([a.width, a.height]).toEqual([b.width, b.height]);
  expect(a.data.equals(b.data)).toBe(true);
  await page.screenshot({ path: info.outputPath("dream-back-website.png") });
  expect(errors).toEqual([]);
});
