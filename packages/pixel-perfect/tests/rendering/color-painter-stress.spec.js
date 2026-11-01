import fs from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { PNG } from "pngjs";

test("Colored CJK labels share bounded GPU resources and preserve native pixels", async ({
  page,
}, info) => {
  await page.setViewportSize({ height: 900, width: 1536 });

  const errors = [];
  const warnings = [];

  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (/too many active webgl|context.*lost|shader failed/i.test(msg.text())) {
      warnings.push(msg.text());
    }
  });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    window.__gpu = [];
    HTMLCanvasElement.prototype.getContext = function getContext(
      kind,
      ...args
    ) {
      const result = original.call(this, kind, ...args);

      if (
        (kind === "webgl" || kind === "webgl2") &&
        result &&
        !window.__gpu.includes(result)
      ) {
        window.__gpu.push(result);
      }

      return result;
    };
  });

  await page.goto("/?component=color-painter-stress");
  await expect(page.locator("[data-stress-label]")).toHaveCount(64);

  for (const label of await page.locator("[data-mc-label-ready]").all()) {
    await expect(label).toHaveAttribute("data-mc-label-ready", "true");
  }

  const checks = [];

  async function verify(scale) {
    await page
      .getByRole("button", { exact: true, name: `Scale ${scale}` })
      .click();
    await expect(page.locator("#subject")).toHaveCSS(
      "width",
      `${252 * scale}px`
    );
    await page.evaluate(
      async () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r))
        )
    );

    const expected = PNG.sync.read(
      fs.readFileSync(`tests/reference/message/captures/chat-c48-s${scale}.png`)
    );

    const actual = PNG.sync.read(await page.locator("#subject").screenshot());

    let different = 0;

    for (let i = 0; i < expected.data.length; i += 4) {
      different += +!expected.data
        .subarray(i, i + 4)
        .equals(actual.data.subarray(i, i + 4));
    }

    expect(different).toBe(0);
    checks.push({ mismatchedPixels: different, scale });
  }

  for (const scale of [1, 2, 3, 1, 3]) {
    await verify(scale);
  }

  expect(await page.evaluate(() => window.__gpu.length)).toBe(1);
  await page.getByRole("button", { name: "Toggle siblings" }).click();
  await expect(page.locator("[data-stress-label]")).toHaveCount(0);
  await verify(2);
  expect(await page.evaluate(() => window.__gpu.length)).toBe(1);
  await page.getByRole("button", { name: "Toggle all" }).click();
  await expect(page.locator("#subject")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => window.__gpu.filter((gl) => !gl.isContextLost()).length
    )
  ).toBe(0);
  await page.getByRole("button", { name: "Toggle all" }).click();

  for (const label of await page.locator("[data-mc-label-ready]").all()) {
    await expect(label).toHaveAttribute("data-mc-label-ready", "true");
  }

  await verify(3);
  expect(await page.evaluate(() => window.__gpu.length)).toBe(2);
  expect(
    await page.evaluate(
      () => window.__gpu.filter((gl) => !gl.isContextLost()).length
    )
  ).toBe(1);
  expect(errors).toEqual([]);
  expect(warnings).toEqual([]);
  fs.writeFileSync(
    info.outputPath("color-stress-report.json"),
    JSON.stringify(
      {
        checks,
        errors,
        leaseReleaseAndRecreate: true,
        maximumConcurrentWebGLContexts: 1,
        targets: 65,
        warnings,
      },
      null,
      2
    )
  );
  console.log(
    "65 colored CJK targets: one shared WebGL context; all7 native snapshots exact; lease disposal/recreation passed"
  );
});

test("Colored CJK labels recover native pixels after forced GPU context loss", async ({
  page,
}, info) => {
  await page.setViewportSize({ height: 900, width: 1536 });

  const errors = [];
  const warnings = [];

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      /too many active webgl|shader failed|program failed/i.test(message.text())
    ) {
      warnings.push(message.text());
    }
  });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    window.__gpu = [];
    HTMLCanvasElement.prototype.getContext = function getContext(
      kind,
      ...args
    ) {
      const context = original.call(this, kind, ...args);

      if (
        (kind === "webgl" || kind === "webgl2") &&
        context &&
        !window.__gpu.includes(context)
      ) {
        window.__gpu.push(context);
      }

      return context;
    };
  });
  await page.goto("/?component=color-painter-stress");
  await expect(page.locator("[data-stress-label]")).toHaveCount(64);

  for (const label of await page.locator("[data-mc-label-ready]").all()) {
    await expect(label).toHaveAttribute("data-mc-label-ready", "true");
  }

  expect(await page.evaluate(() => window.__gpu.length)).toBe(1);
  expect(
    await page.evaluate(
      () => !!window.__gpu[0].getExtension("WEBGL_lose_context")
    )
  ).toBe(true);
  await page.evaluate(() =>
    window.__gpu[0].getExtension("WEBGL_lose_context").loseContext()
  );
  const checks = [];

  for (const scale of [1, 2, 3]) {
    await page
      .getByRole("button", { exact: true, name: `Scale ${scale}` })
      .click();
    await expect(page.locator("#subject")).toHaveCSS(
      "width",
      `${252 * scale}px`
    );
    await page.evaluate(
      async () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve))
        )
    );

    const bytes = await page.locator("#subject").screenshot();
    const actual = PNG.sync.read(bytes);

    const expected = PNG.sync.read(
      fs.readFileSync(`tests/reference/message/captures/chat-c48-s${scale}.png`)
    );

    expect([actual.width, actual.height]).toEqual([
      expected.width,
      expected.height,
    ]);
    let mismatchedPixels = 0;

    for (let i = 0; i < expected.data.length; i += 4) {
      mismatchedPixels += +!expected.data
        .subarray(i, i + 4)
        .equals(actual.data.subarray(i, i + 4));
    }

    expect(mismatchedPixels).toBe(0);
    checks.push({ mismatchedPixels, scale });
  }

  expect(await page.evaluate(() => window.__gpu.length)).toBe(2);
  expect(
    await page.evaluate(
      () => window.__gpu.filter((context) => !context.isContextLost()).length
    )
  ).toBe(1);
  expect(errors).toEqual([]);
  expect(warnings).toEqual([]);
  fs.writeFileSync(
    info.outputPath("context-loss-recovery.json"),
    JSON.stringify(
      {
        checks,
        errors,
        forcedLossRecovered: true,
        maximumConcurrentWebGLContexts: 1,
        targets: 65,
        warnings,
      },
      null,
      2
    )
  );
});
