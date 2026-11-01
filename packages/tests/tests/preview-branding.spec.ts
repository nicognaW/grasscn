import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { PNG } from "pngjs";

import { resolveRepositoryPath, testRoot } from "../../../workspace-paths.mjs";
import { pixelPerfectTest as test, expect } from "./verified-test";
const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/, "/");

test("Grasscn project identity and native branding assets are consistent", async () => {
  for (const file of ["registry.json"]) {
    const metadata = JSON.parse(
      await readFile(resolveRepositoryPath(file, testRoot), "utf8")
    );
    expect(metadata.name).toBe("grasscn");
    if (metadata.packages?.[""])
      expect(metadata.packages[""].name).toBe("grasscn");
  }
  const provenance = JSON.parse(
    await readFile(
      resolveRepositoryPath("preview/branding.provenance.json", testRoot),
      "utf8"
    )
  );
  expect(provenance.sourceJarSha256).toBe(
    "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290"
  );
  for (const [file, record] of Object.entries(provenance.generated) as [
    string,
    { sha256: string },
  ][]) {
    const bytes = await readFile(
      resolveRepositoryPath(`preview/assets/${file}`, testRoot)
    );
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      record.sha256
    );
  }
  for (const c of provenance.cases) {
    const one = PNG.sync.read(
      await readFile(
        resolveRepositoryPath(
          `tests/reference/branding/native-one/${c.filename}`,
          testRoot
        )
      )
    );
    const two = PNG.sync.read(
      await readFile(
        resolveRepositoryPath(
          `tests/reference/branding/native-two/${c.filename}`,
          testRoot
        )
      )
    );
    expect(one.data.equals(two.data)).toBe(true);
    expect(c.mismatchedPixels).toBe(0);
  }
});

test("Branding source grass matches its native scale3 capture independently of website geometry", async () => {
  const svg = await readFile(
    resolveRepositoryPath("preview/assets/grasscn-logo.svg", testRoot),
    "utf8"
  );
  const encoded =
    /<image href="data:image\/png;base64,([^"]+)" x="0" y="8" width="48" height="48"\/>/.exec(
      svg
    )?.[1];
  expect(
    encoded,
    "The authored SVG must retain its embedded48px original grass image"
  ).toBeDefined();
  const grass = PNG.sync.read(Buffer.from(encoded!, "base64"));
  const native = PNG.sync.read(
    await readFile(
      resolveRepositoryPath(
        "tests/reference/branding/native-one/grass-block-black-s3.png",
        testRoot
      )
    )
  );
  expect([grass.width, grass.height]).toEqual([native.width, native.height]);
  const composite = new PNG({ width: grass.width, height: grass.height });
  for (let offset = 0; offset < grass.data.length; offset += 4) {
    const alpha = grass.data[offset + 3] / 255;
    for (let channel = 0; channel < 3; channel++)
      composite.data[offset + channel] = Math.round(
        grass.data[offset + channel] * alpha
      );
    composite.data[offset + 3] = 255;
  }
  const differences = (left: PNG, right: PNG) => {
    let count = 0;
    for (let offset = 0; offset < left.data.length; offset += 4)
      if (
        !left.data
          .subarray(offset, offset + 4)
          .equals(right.data.subarray(offset, offset + 4))
      )
        count++;
    return count;
  };
  const mutation = PNG.sync.read(PNG.sync.write(native));
  mutation.data[0] ^= 1;
  expect(differences(mutation, native)).toBe(1);
  expect(
    differences(composite, native),
    "Source asset composited on the declared black background must match original Minecraft scale3 pixels"
  ).toBe(0);
});

test("Header serves the preserved branding source at its actual production geometry", async ({
  page,
  request,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}docs`);
  await expect(page).toHaveTitle(/grasscn/);
  const brand = page
    .getByRole("banner")
    .getByRole("link", { name: "grasscn home", exact: true });
  await expect(brand).toBeVisible();
  const logo = brand.locator("img");
  await expect(logo).toHaveAttribute(
    "src",
    /grasscn-logo(?:-[A-Za-z0-9_-]+)?\.svg(?:\?.*)?$/
  );
  await logo.evaluate((node) => (node as HTMLImageElement).decode());
  const image = PNG.sync.read(
    await logo.screenshot({ path: info.outputPath("actual-header-logo.png") })
  );
  expect([image.width, image.height]).toEqual([132, 48]);
  await expect(logo).toHaveCSS("image-rendering", "pixelated");
  const response = await request.get(
    new URL((await logo.getAttribute("src")) ?? "", origin).href
  );
  expect(response.ok()).toBe(true);
  expect(
    (await response.body()).equals(
      await readFile(
        resolveRepositoryPath("preview/assets/grasscn-logo.svg", testRoot)
      )
    )
  ).toBe(true);
  // The intrinsic 176x64 source is displayed at132x48. Its grass becomes36px:
  // a fractional2.25 scale with no corresponding independently captured case.
  // This proves source delivery and production layout, not integrated native RGBA.
  const iconBytes = await page.evaluate(async () =>
    Array.from(
      new Uint8Array(
        await (
          await fetch(
            document.querySelector<HTMLLinkElement>('link[rel="icon"]')!.href
          )
        ).arrayBuffer()
      )
    )
  );
  expect(
    Buffer.from(iconBytes).equals(
      await readFile(
        resolveRepositoryPath("preview/assets/grass-block-16.png", testRoot)
      )
    )
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("Grasscn logo stays crisp and contained on narrow preview screens", async ({
  page,
}) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${origin}docs`);
    const logo = page
      .getByRole("banner")
      .getByRole("link", { name: "grasscn home", exact: true })
      .locator("img");
    await expect(logo).toHaveCSS("width", "132px");
    await expect(logo).toHaveCSS("height", "48px");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
  }
});
