import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { expect, pixelPerfectTest } from "@grasscn/pixel-perfect/test";
import {
  parseNativeManifest,
  nativeReference,
} from "@ppt/runtime/docs-reference-types";
import { PNG } from "pngjs";

const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176";

pixelPerfectTest(
  "documentation empty Hotbar matches native selection zero on explicit backdrop",
  async ({ page }, info) => {
    await page.goto(`${origin}/docs/components/hotbar`);
    await page.mouse.move(0, 0);

    const subject = page
      .locator(".documentation-example")
      .first()
      .getByRole("toolbar", { name: "Quick slots" });

    await expect(subject).toBeVisible();
    const reference = new URL("../../reference/hotbar/", import.meta.url);

    const manifest = parseNativeManifest(
      await readFile(new URL("manifest.json", reference), "utf-8")
    );

    expect(manifest.sourceJarSha256).toBe(
      "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290"
    );
    expect(manifest.background).toBe("#202020");

    const sample = nativeReference(manifest, "hotbar-0-s2.png");

    const captured = await readFile(
      new URL("captures/hotbar-0-s2.png", reference)
    );

    expect(createHash("sha256").update(captured).digest("hex")).toBe(
      sample.sha256
    );
    const image = await subject.screenshot();

    const actual = PNG.sync.read(image);
    const expected = PNG.sync.read(captured);

    expect([actual.width, actual.height]).toEqual([
      expected.width,
      expected.height,
    ]);
    let differences = 0;

    for (let offset = 0; offset < actual.data.length; offset += 4) {
      if (
        !actual.data
          .subarray(offset, offset + 4)
          .equals(expected.data.subarray(offset, offset + 4))
      ) {
        differences += 1;
      }
    }

    await info.attach("hotbar-actual", {
      body: image,
      contentType: "image/png",
    });
    expect(differences).toBe(0);
  }
);
