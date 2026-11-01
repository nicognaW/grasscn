import { test, expect } from "./verified-test";
const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/, "/");
for (const selection of ["alert-dialog"])
  for (const scale of [2])
    test(`Long CJK confirmation keeps its GPU backdrop and readable text at mobile GUI ${scale} in ${selection}`, async ({
      page,
    }) => {
      const warnings: string[] = [];
      page.on("console", (m) => {
        if (m.text().includes("Too many active WebGL contexts"))
          warnings.push(m.text());
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
          Array(14)
            .fill("这是一个很长的描述。请确认您是否删除世界。")
            .join("\n")
        );
      await stage.getByRole("button", { name: "Open confirmation" }).click();
      const overlay = page.locator('[data-slot="alert-dialog-overlay"]'),
        dialog = page.getByRole("alertdialog");
      await expect(overlay).toHaveAttribute(
        "data-mc-confirmation-frame",
        /^[1-9]\d*$/
      );
      await expect(dialog.locator('[data-mc-label-ready="false"]')).toHaveCount(
        0
      );
      const state = await overlay.locator("canvas").evaluate((node) => {
        const canvas = node as HTMLCanvasElement,
          gl = canvas.getContext("webgl")!,
          pixel = new Uint8Array(4);
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
      await dialog.getByRole("button", { name: "No", exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expect(
        stage.getByRole("button", { name: "Open confirmation" })
      ).toBeFocused();
    });

for (const scene of ["fixed-pseudo", "nested-fixed"])
  test(`Scrolled confirmation preserves ${scene} viewport paint`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + "docs/components/alert-dialog");
    await page.evaluate((scene) => {
      const owner = document.createElement("div");
      owner.id = "snapshot-viewport-proof";
      if (scene === "fixed-pseudo") {
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
      .getByRole("button", { name: "Open confirmation", exact: true })
      .click();
    const overlay = page.locator('[data-slot="alert-dialog-overlay"]');
    await expect(overlay).toHaveAttribute(
      "data-mc-confirmation-frame",
      /^[1-9]\d*$/
    );
    const pixel = await overlay.locator("canvas").evaluate((node, scene) => {
      const canvas = node as HTMLCanvasElement,
        gl = canvas.getContext("webgl")!,
        rgba = new Uint8Array(4);
      gl.readPixels(
        scene === "fixed-pseudo" ? 30 : 315,
        canvas.height - (scene === "fixed-pseudo" ? 30 : 75),
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
