import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { test, expect } from "@grasscn/pixel-perfect/test";
import { PNG } from "pngjs";

const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176"
).replace(/\/$/, "");

test("mobile documentation Preview and Code remain visible and match compact native tabs", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/docs/components/button`);
  const example = page.getByRole("region", {
    name: "Button example",
    exact: true,
  });
  const tabs = example.getByRole("tablist", {
    name: "Button example view",
    exact: true,
  });
  await tabs.scrollIntoViewIfNeeded();
  for (const name of ["Preview", "Code"])
    await expect(tabs.getByRole("tab", { name, exact: true })).toBeInViewport({
      ratio: 1,
    });
  const geometry = await tabs.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    scroll: element.parentElement!.scrollLeft,
    background: getComputedStyle(element.parentElement!).backgroundColor,
  }));
  expect(geometry).toEqual({
    width: 240,
    scroll: 0,
    background: "rgb(32, 32, 32)",
  });
  const family = new URL(
    "../../reference/showcase-code-tabs/",
    import.meta.url
  );
  const manifest = JSON.parse(
    await readFile(new URL("manifest.json", family), "utf8")
  );
  for (const state of ["preview", "code"]) {
    if (state === "code") {
      await tabs.getByRole("tab", { name: "Code", exact: true }).click();
      await example.getByRole("button", { name: "Copy", exact: true }).focus();
      await expect(example.locator("pre")).toContainText(
        "function ButtonExample"
      );
    }
    await expect(tabs).toHaveAttribute("data-mc-tabs-ready", "true");
    await page.mouse.move(0, 0);
    const name = `showcase-tabs-${state}-s2.png`;
    const bytes = await readFile(new URL(`captures/${name}`, family));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      manifest.cases.find((entry: { name: string }) => entry.name === name)
        .sha256
    );
    const expected = PNG.sync.read(bytes),
      actualBytes = await tabs.screenshot(),
      actual = PNG.sync.read(actualBytes);
    expect([actual.width, actual.height]).toEqual([
      expected.width,
      expected.height,
    ]);
    const compare = (left: PNG, right: PNG) => {
      let count = 0;
      const diff = new PNG({ width: left.width, height: left.height });
      for (let offset = 0; offset < left.data.length; offset += 4)
        if (
          !left.data
            .subarray(offset, offset + 4)
            .equals(right.data.subarray(offset, offset + 4))
        ) {
          count++;
          diff.data.set([255, 0, 255, 255], offset);
        }
      return { count, diff };
    };
    const mutation = PNG.sync.read(PNG.sync.write(expected));
    mutation.data[0] ^= 1;
    expect(compare(mutation, expected).count).toBe(1);
    const result = compare(actual, expected);
    await writeFile(info.outputPath(`${state}-actual.png`), actualBytes);
    await writeFile(
      info.outputPath(`${state}-diff.png`),
      PNG.sync.write(result.diff)
    );
    await writeFile(
      info.outputPath(`${state}-metrics.json`),
      JSON.stringify({
        reference: name,
        referenceSha256: manifest.cases.find(
          (entry: { name: string }) => entry.name === name
        ).sha256,
        mismatchedPixels: result.count,
        mutationRejected: true,
        geometry,
        route: page.url(),
      })
    );
    expect(result.count).toBe(0);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("mobile-docs-code.png"),
    fullPage: true,
  });
});
