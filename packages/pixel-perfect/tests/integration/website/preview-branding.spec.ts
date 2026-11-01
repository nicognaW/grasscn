import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectRoot, webFile, pixelPerfectFile } from "@ppt/paths";
import { evidenceFile } from "@ppt/runtime/evidence-paths";
import { PNG } from "pngjs";

const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/";

test("Grasscn project identity and native branding assets are consistent", async () => {
  for (const file of ["package.json", "package-lock.json", "registry.json"]) {
    const metadata = JSON.parse(
      await readFile(evidenceFile(file, pixelPerfectRoot), "utf8")
    );
    expect(metadata.name).toBe("grasscn");
    if (metadata.packages?.[""])
      expect(metadata.packages[""].name).toBe("grasscn");
  }
  const provenance = JSON.parse(
    await readFile(webFile("branding.provenance.json"), "utf8")
  );
  expect(provenance.sourceJarSha256).toBe(
    "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290"
  );
  for (const [file, record] of Object.entries(provenance.generated) as [
    string,
    { sha256: string },
  ][]) {
    const bytes = await readFile(webFile(`assets/${file}`));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      record.sha256
    );
  }
  for (const c of provenance.cases) {
    const one = PNG.sync.read(
      await readFile(
        pixelPerfectFile(`tests/reference/branding/native-one/${c.filename}`)
      )
    );
    const two = PNG.sync.read(
      await readFile(
        pixelPerfectFile(`tests/reference/branding/native-two/${c.filename}`)
      )
    );
    expect(one.data.equals(two.data)).toBe(true);
    expect(c.mismatchedPixels).toBe(0);
  }
});

test("Header keeps the original grass and badge asset exact at its native capture size", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}#all`);
  await expect(page).toHaveTitle("Components · grasscn");
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
  await page.addStyleTag({
    content:
      ".grass-site .grass-header { background: #000!important; }.grass-brand img {width:176px!important;height:64px!important;}",
  });
  const image = PNG.sync.read(await logo.screenshot());
  expect([image.width, image.height]).toEqual([176, 64]);
  const expected = PNG.sync.read(
    await readFile(
      pixelPerfectFile(
        "tests/reference/branding/native-one/grass-block-black-s3.png"
      )
    )
  );
  for (let y = 0; y < 48; y++)
    for (let x = 0; x < 48; x++) {
      const from = (y * 48 + x) * 4,
        to = ((y + 8) * image.width + x) * 4;
      expect(
        image.data
          .subarray(to, to + 4)
          .equals(expected.data.subarray(from, from + 4))
      ).toBe(true);
    }
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
      await readFile(webFile("assets/grass-block-16.png"))
    )
  ).toBe(true);
  expect(errors).toEqual([]);
});
