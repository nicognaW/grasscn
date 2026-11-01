import { readFile } from "node:fs/promises";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { resolveRepositoryPath, pixelPerfectRoot } from "@ppt/paths";
import { PNG } from "pngjs";

test("Progress custom maximum and label retain native half-fill pixels", async ({
  page,
}) => {
  await page.goto("/?component=progress&value=125&max=250&customLabel=1");
  const progress = page.getByRole("progressbar");
  await expect(progress).toHaveAttribute("aria-valuemax", "250");
  await expect(progress).toHaveAttribute("aria-valuenow", "125");
  await expect(progress).toHaveAttribute("aria-valuetext", "125 of 250 loaded");
  const expected = PNG.sync.read(
    await readFile(
      resolveRepositoryPath(
        "tests/reference/progress/captures/progress-c6-s2.png",
        pixelPerfectRoot
      )
    )
  );
  const actual = PNG.sync.read(await progress.screenshot());
  expect(actual.data.equals(expected.data)).toBe(true);
});

test("Progress unknown value keeps indeterminate semantics on the native empty surface", async ({
  page,
}) => {
  await page.goto("/?component=progress&value=50");
  await page.locator("#unknown-progress").click();
  const progress = page.getByRole("progressbar");
  await expect(progress).toHaveAttribute("data-indeterminate", "");
  await expect(progress).not.toHaveAttribute("aria-valuenow");
  await expect(progress).not.toHaveAttribute("aria-valuetext");
  const expected = PNG.sync.read(
    await readFile(
      resolveRepositoryPath(
        "tests/reference/progress/captures/progress-c0-s2.png",
        pixelPerfectRoot
      )
    )
  );
  const actual = PNG.sync.read(await progress.screenshot());
  expect(actual.data.equals(expected.data)).toBe(true);
});
