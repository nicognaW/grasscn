import { test, expect } from "@grasscn/tests/test";

const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/u, "/");

for (const selection of ["alert-dialog"]) {
  for (const scale of [2]) {
    test(`Long CJK confirmation keeps its GPU backdrop and readable text at mobile GUI ${scale} in ${selection}`, async ({
      page,
    }) => {
      const warnings: string[] = [];
      page.on("console", (m) => {
        if (m.text().includes("Too many active WebGL contexts")) {
          warnings.push(m.text());
        }
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(origin + "docs/components/" + selection);

      const stage = page.locator('[data-stage="alert-dialog"]');
      await stage.scrollIntoViewIfNeeded();
      await page
        .getByLabel("Alert dialog title", { exact: true })
        .fill("世界設定を削除しますか？");
      await page
        .getByLabel("Alert dialog message", { exact: true })
        .fill(
          new Array(14)
            .fill("这是一个很长的描述。请确认您是否删除世界。")
            .join("\n")
        );
      await stage.getByRole("button", { name: "Open confirmation" }).click();

      const overlay = page.locator('[data-slot="alert-dialog-overlay"]');
      const dialog = page.getByRole("alertdialog");

      await expect(overlay).toHaveAttribute(
        "data-mc-confirmation-frame",
        /^[1-9]\d*$/u
      );
      await expect(dialog.locator('[data-mc-label-ready="false"]')).toHaveCount(
        0
      );

      const state = await overlay.locator("canvas").evaluate((node) => {
        const canvas = node as HTMLCanvasElement;
        const gl = canvas.getContext("webgl")!;
        const pixel = new Uint8Array(4);

        gl.readPixels(20, 20, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

        return { lost: gl.isContextLost(), pixel: [...pixel] };
      });

      expect(
        state.lost,
        "CJK text must not evict the active blur painter"
      ).toBe(false);
      expect(state.pixel[3], "Backdrop remains opaque").toBe(255);
      expect(
        Math.max(...state.pixel.slice(0, 3)),
        "Dark Minecraft page must not turn white"
      ).toBeLessThan(200);
      expect(warnings).toEqual([]);
      await dialog.getByRole("button", { exact: true, name: "No" }).click();
      await expect(dialog).toHaveCount(0);
      await expect(
        stage.getByRole("button", { name: "Open confirmation" })
      ).toBeFocused();
    });
  }
}

for (const scene of ["fixed-pseudo", "nested-fixed"]) {
  test(`Scrolled confirmation preserves ${scene} viewport paint`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + "docs/components/alert-dialog");
    await page.evaluate((viewportScene) => {
      const owner = document.createElement("div");
      owner.id = "snapshot-viewport-proof";

      if (viewportScene === "fixed-pseudo") {
        owner.style.cssText =
          "position:absolute;top:100000px;left:0;width:10px;height:10px";
        const child = document.createElement("div");
        child.className = "snapshot-pseudo-paint";
        owner.append(child);
        const style = document.createElement("style");
        style.textContent =
          '.snapshot-pseudo-paint::before{content:"";position:fixed;inset:-100px;background:#ff00cc;pointer-events:none;z-index:10}';
        document.head.append(style);
      } else {
        owner.style.cssText =
          "position:fixed;top:20px;left:20px;width:200px;height:100px;z-index:10;pointer-events:none";
        const child = document.createElement("div");
        child.style.cssText =
          "position:fixed;top:60px;left:300px;width:80px;height:80px;background:#ff0000";
        owner.append(child);
      }

      document.body.append(owner);
      window.scrollTo(0, 300);
    }, scene);
    await page
      .getByRole("button", { exact: true, name: "Open confirmation" })
      .click();
    const overlay = page.locator('[data-slot="alert-dialog-overlay"]');
    await expect(overlay).toHaveAttribute(
      "data-mc-confirmation-frame",
      /^[1-9]\d*$/u
    );

    const pixel = await overlay
      .locator("canvas")
      .evaluate((node, pixelScene) => {
        const canvas = node as HTMLCanvasElement;
        const gl = canvas.getContext("webgl")!;
        const rgba = new Uint8Array(4);

        gl.readPixels(
          pixelScene === "fixed-pseudo" ? 30 : 315,
          canvas.height - (pixelScene === "fixed-pseudo" ? 30 : 75),
          1,
          1,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          rgba
        );

        return [...rgba];
      }, scene);

    expect(pixel).toEqual(
      scene === "fixed-pseudo" ? [191, 0, 153, 255] : [191, 0, 0, 255]
    );
  });
}

test("Scrolled confirmation preserves a fixed pseudo inside its transformed originating element", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto(`${origin}docs/components/alert-dialog`);
  await page.evaluate(() => {
    const owner = document.createElement("div");
    owner.style.cssText =
      "position:fixed;top:20px;left:20px;width:80px;height:80px;z-index:10;pointer-events:none";
    const child = document.createElement("div");
    child.className = "snapshot-contained-pseudo";
    child.style.cssText = "width:80px;height:80px;transform:translateZ(0)";
    owner.append(child);
    const style = document.createElement("style");
    style.textContent =
      '.snapshot-contained-pseudo::before{content:"";position:fixed;inset:0;background:#ff00cc;pointer-events:none}';
    document.head.append(style);
    document.body.append(owner);
    window.scrollTo(0, 300);
  });
  await page
    .getByRole("button", { exact: true, name: "Open confirmation" })
    .click();
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);

  const overlay = page.locator('[data-slot="alert-dialog-overlay"]');
  await expect(overlay).toHaveAttribute(
    "data-mc-confirmation-frame",
    /^[1-9]\d*$/u
  );

  const pixel = await overlay.locator("canvas").evaluate((node) => {
    if (!(node instanceof HTMLCanvasElement)) {
      throw new TypeError("Expected the confirmation canvas");
    }

    const canvas = node;

    const gl = canvas.getContext("webgl");

    if (gl === null) {
      throw new Error("Expected the confirmation WebGL context");
    }

    const rgba = new Uint8Array(4);

    gl.readPixels(
      60,
      canvas.height - 60,
      1,
      1,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      rgba
    );

    return [...rgba];
  });

  expect(pixel).toEqual([191, 0, 153, 255]);
});
