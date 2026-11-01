import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { resolveRepositoryPath, pixelPerfectRoot } from "@ppt/paths";
import { PNG } from "pngjs";
const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/, "/");

test("Grasscn project identity and native branding assets are consistent", async () => {
  for (const file of ["registry.json"]) {
    const metadata = JSON.parse(
      await readFile(resolveRepositoryPath(file, pixelPerfectRoot), "utf8")
    );
    expect(metadata.name).toBe("grasscn");
    if (metadata.packages?.[""])
      expect(metadata.packages[""].name).toBe("grasscn");
  }
  const provenance = JSON.parse(
    await readFile(
      resolveRepositoryPath(
        "preview/branding.provenance.json",
        pixelPerfectRoot
      ),
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
      resolveRepositoryPath(`preview/assets/${file}`, pixelPerfectRoot)
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
          pixelPerfectRoot
        )
      )
    );
    const two = PNG.sync.read(
      await readFile(
        resolveRepositoryPath(
          `tests/reference/branding/native-two/${c.filename}`,
          pixelPerfectRoot
        )
      )
    );
    expect(one.data.equals(two.data)).toBe(true);
    expect(c.mismatchedPixels).toBe(0);
  }
});

test("Branding source grass matches its native scale3 capture independently of website geometry", async () => {
  const svg = await readFile(
    resolveRepositoryPath("preview/assets/grasscn-logo.svg", pixelPerfectRoot),
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
        pixelPerfectRoot
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
