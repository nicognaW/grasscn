import { readFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { resolveRepositoryPath, pixelPerfectRoot } from "@ppt/paths";
import { PNG } from "pngjs";

test("website loads Dream with slim arms after both presets", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://mc-heads.net/skin/Dream", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      headers: { "access-control-allow-origin": "*" },
      body: readFileSync(
        resolveRepositoryPath("tests/fixture/dream-skin.png", pixelPerfectRoot)
      ),
    })
  );
  await page.goto("http://127.0.0.1:5176/components/player-preview");
  const player = page.getByRole("group", {
    name: "Player preview",
    exact: true,
  });
  for (const preset of ["Steve", "Alex"]) {
    await page.getByRole("button", { name: preset, exact: true }).click();
    await expect(player).toHaveAttribute("data-ready", "true");
    await page
      .getByRole("textbox", { name: "Player name", exact: true })
      .fill("Dream");
    await page.getByRole("button", { name: "Load skin", exact: true }).click();
    await expect(player).toHaveAttribute("data-model", "slim");
    await expect(player).toHaveAttribute("data-ready", "true");
  }
  await player.focus();
  await player.press("ArrowDown");
  for (let i = 0; i < 30; i++) await player.press("ArrowRight");
  await player.blur();
  const actual = await player.locator("canvas").screenshot(),
    a = PNG.sync.read(actual),
    b = PNG.sync.read(
      readFileSync(
        resolveRepositoryPath(
          "tests/reference/player-preview/custom-skins/captures/player-back-1-s2.png",
          pixelPerfectRoot
        )
      )
    );
  expect([a.width, a.height]).toEqual([b.width, b.height]);
  expect(a.data.equals(b.data)).toBe(true);
  await page.screenshot({ path: info.outputPath("dream-back-website.png") });
  expect(errors).toEqual([]);
});
