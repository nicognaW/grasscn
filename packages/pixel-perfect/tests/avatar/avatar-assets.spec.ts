import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { minecraftAvatarSkins } from "@grasscn/web/ui/minecraft-avatar-assets";
import { resolveRepositoryPath, pixelPerfectRoot } from "@ppt/paths";
import { PNG } from "pngjs";
test("All18 original skins retain their PNG bytes and rawRGBA including hat transparency", () => {
  const provenance = JSON.parse(
    readFileSync(
      resolveRepositoryPath(
        "tests/reference/avatar/provenance.json",
        pixelPerfectRoot
      ),
      "utf8"
    )
  );
  expect(Object.keys(minecraftAvatarSkins)).toHaveLength(18);
  for (const [name, asset] of Object.entries(minecraftAvatarSkins)) {
    const bytes = Buffer.from(asset.png.split(",")[1], "base64"),
      png = PNG.sync.read(bytes);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      provenance.assets.find(
        (a: any) =>
          a.path === `assets/minecraft/textures/entity/player/${name}.png`
      ).sha256
    );
    expect([png.width, png.height]).toEqual([64, 64]);
    expect(Buffer.from(asset.rgba, "base64").equals(png.data)).toBe(true);
  }
});
test("Native Avatar reference guards pin real class members and no fake glyph observations", () => {
  const m = JSON.parse(
      readFileSync(
        resolveRepositoryPath(
          "tests/reference/avatar/manifest.json",
          pixelPerfectRoot
        ),
        "utf8"
      )
    ),
    p = JSON.parse(
      readFileSync(
        resolveRepositoryPath(
          "tests/reference/avatar/provenance.json",
          pixelPerfectRoot
        ),
        "utf8"
      )
    );
  expect(m.glyphObservationEnabled).toBe(false);
  expect(p.assets.filter((a: any) => a.path.endsWith(".class"))).toHaveLength(
    2
  );
  expect(p.nativeMethod).toContain("PlayerFaceExtractor.extractRenderState");
});
