import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { test, expect } from "@grasscn/pixel-perfect/test";
import {
  parseNativeManifest,
  nativeReference,
} from "@ppt/runtime/docs-reference-types";
import { PNG } from "pngjs";

const compare = (left: PNG, right: PNG) => {
  let count = 0;
  const diff = new PNG({ height: left.height, width: left.width });

  for (let offset = 0; offset < left.data.length; offset += 4) {
    if (
      !left.data
        .subarray(offset, offset + 4)
        .equals(right.data.subarray(offset, offset + 4))
    ) {
      count += 1;
      diff.data.set([255, 0, 255, 255], offset);
    }
  }

  return { count, diff };
};

const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176"
).replace(/\/$/u, "");

test("mobile documentation Preview and Code remain visible and match compact native tabs", async ({
  page,
}, info) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto(`${origin}/docs/components/button`);

  const example = page.getByRole("region", {
    exact: true,
    name: "Button example",
  });

  const tabs = example.getByRole("tablist", {
    exact: true,
    name: "Button example view",
  });

  await tabs.scrollIntoViewIfNeeded();

  /* eslint-disable no-await-in-loop -- Apply each declared browser state and capture its evidence before changing that same page. */
  for (const name of ["Preview", "Code"]) {
    await expect(tabs.getByRole("tab", { exact: true, name })).toBeInViewport({
      ratio: 1,
    });
  }
  /* eslint-enable no-await-in-loop */

  const geometry = await tabs.evaluate((element) => {
    const parent = element.parentElement;

    if (parent === null) {
      throw new Error("Example tab strip needs its scroll container");
    }

    return {
      background: getComputedStyle(parent).backgroundColor,
      scroll: parent.scrollLeft,
      width: element.getBoundingClientRect().width,
    };
  });

  expect(geometry).toEqual({
    background: "rgb(32, 32, 32)",
    scroll: 0,
    width: 240,
  });

  const family = new URL(
    "../../reference/showcase-code-tabs/",
    import.meta.url
  );

  const manifest = parseNativeManifest(
    await readFile(new URL("manifest.json", family), "utf-8")
  );

  /* eslint-disable no-await-in-loop -- Apply each declared browser state and capture its evidence before changing that same page. */
  for (const state of ["preview", "code"]) {
    if (state === "code") {
      await tabs.getByRole("tab", { exact: true, name: "Code" }).click();
      await example.getByRole("button", { exact: true, name: "Copy" }).focus();
      await expect(example.locator("pre")).toContainText(
        "const ButtonExample ="
      );
    }

    await expect(tabs).toHaveAttribute("data-mc-tabs-ready", "true");
    await page.mouse.move(0, 0);
    const name = `showcase-tabs-${state}-s2.png`;
    const bytes = await readFile(new URL(`captures/${name}`, family));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      nativeReference(manifest, name).sha256
    );

    const expected = PNG.sync.read(bytes);
    const actualBytes = await tabs.screenshot();
    const actual = PNG.sync.read(actualBytes);

    expect([actual.width, actual.height]).toEqual([
      expected.width,
      expected.height,
    ]);

    const mutation = PNG.sync.read(PNG.sync.write(expected));
    // eslint-disable-next-line no-bitwise -- Preserve the established exact byte operation for one-pixel negative controls or diagnostic RGBA shading.
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
        geometry,
        mismatchedPixels: result.count,
        mutationRejected: true,
        reference: name,
        referenceSha256: nativeReference(manifest, name).sha256,
        route: page.url(),
      })
    );
    expect(result.count).toBe(0);
  }
  /* eslint-enable no-await-in-loop */

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  await page.screenshot({
    fullPage: true,
    path: info.outputPath("mobile-docs-code.png"),
  });
});
