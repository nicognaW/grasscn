import { writeFileSync } from "node:fs";

import { test, expect } from "@grasscn/tests/test";
import { PNG } from "pngjs";

test.beforeEach(({ page }) => {
  (page as any).__errors = [];
  page.on("pageerror", (e) => (page as any).__errors.push(e.message));
});

test.afterEach(({ page, browser }, info) => {
  const errors = (page as any).__errors;
  writeFileSync(
    info.outputPath("runtime.json"),
    JSON.stringify({ browser: browser.version(), pageErrors: errors })
  );
  expect(errors).toEqual([]);
});

test("ChartContainer applies config color/theme variables and responds to width changes", async ({
  page,
}) => {
  await page.goto("/?component=chart");
  const chart = page.locator("[data-chart=chart-world-activity]");
  await expect(chart).toBeVisible();
  expect(
    await chart.evaluate((n) =>
      getComputedStyle(n).getPropertyValue("--color-desktop").trim()
    )
  ).toBe("#22dd44");
  await expect(chart.locator(".recharts-surface").first()).toHaveAttribute(
    "width",
    "480"
  );
  await page.locator("#resize").click();
  await expect(chart.locator(".recharts-surface").first()).toHaveAttribute(
    "width",
    "600"
  );
  await page.locator("#theme").click();
  expect(
    await chart.evaluate((n) =>
      getComputedStyle(n).getPropertyValue("--color-desktop").trim()
    )
  ).toBe("#00aa11");
  expect(
    await chart.evaluate((n) =>
      getComputedStyle(n).getPropertyValue("--color-mobile").trim()
    )
  ).toBe("#ffcc00");
});

test("ChartLegendContent preserves labels, custom icons and CJK bitmap readiness", async ({
  page,
}) => {
  await page.goto("/?component=chart");
  const legend = page.locator(".mc-chart-legend");
  await expect(legend).toContainText("世界");
  await expect(legend.getByLabel("Desktop icon")).toBeVisible();
  await expect(
    legend.locator("[data-mc-label-layout-ready]").first()
  ).toHaveAttribute("data-mc-label-layout-ready", "true");

  for (const text of await legend.locator("[data-mc-label-ready]").all()) {
    await expect(text).toHaveAttribute("data-mc-label-ready", "true");
  }

  await page.goto("/?component=chart&hideIcon=1");
  await expect(
    page.locator(".mc-chart-legend").getByLabel("Desktop icon")
  ).toHaveCount(0);
});

test("ChartTooltipContent receives real Recharts payload and preserves custom formatters", async ({
  page,
}) => {
  await page.goto("/?component=chart&active=1&formatter=1&labelFormatter=1");
  await expect(page.getByTestId("formatted")).toHaveCount(2);
  await expect(page.getByTestId("formatted").first()).toHaveText("desktop:20");
  await expect(page.getByTestId("label-formatted")).toHaveText("Season:Spring");
  const tooltip = page.locator(".mc-chart-tooltip");
  await expect(tooltip.locator(".mc-surface")).toHaveCount(2);
  await page.locator("#update").click();
  await expect(page.getByTestId("formatted").first()).toHaveText("desktop:21");
});

test("Chart tooltip supports native-font default rows and hide label/indicator controls", async ({
  page,
}) => {
  await page.goto("/?component=chart&active=1");
  const tooltip = page.locator(".mc-chart-tooltip");
  await expect(tooltip).toContainText("Spring");
  await expect(tooltip).toContainText("世界");
  await expect(tooltip).toContainText("20");
  await page.goto("/?component=chart&active=1&hideLabel=1&hideIndicator=1");
  await expect(page.locator(".mc-chart-tooltip")).not.toContainText("Spring");
  await expect(page.locator(".mc-chart-tooltip")).toContainText("20");
  await page.goto("/?component=chart&active=1&indicator=dashed");
  await expect(
    page.locator('.mc-chart-tooltip [style*="--color-bg"]')
  ).toHaveCount(1);
});

test("Profiler WebGL rerenders changed data without losing its context", async ({
  page,
}) => {
  await page.goto("/?component=chart");
  const plot = page.locator("#reactive-pie");
  await expect(
    plot.locator("[data-slot=chart-profiler-frame]")
  ).toHaveAttribute("data-mc-ready", "true");
  const first = PNG.sync.read(await plot.screenshot()).data;
  await page.locator("#plot-update").click();
  await expect(
    plot.locator("[data-slot=chart-profiler-frame]")
  ).toHaveAttribute("data-mc-ready", "true");
  const second = PNG.sync.read(await plot.screenshot()).data;
  expect(first.equals(second)).toBe(false);
  await page.locator("#theme").click();
  await expect(
    plot.locator("[data-slot=chart-profiler-frame]")
  ).toHaveAttribute("data-mc-ready", "true");
  expect(
    await plot
      .locator("canvas")
      .evaluate((n) => (n as HTMLCanvasElement).getContext("2d") !== null)
  ).toBe(true);
});

test("Profiler recovers transient GPU creation failures without unmounting its container", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    let attempts = 0;
    HTMLCanvasElement.prototype.getContext = function getContext(
      this: HTMLCanvasElement,
      kind: any,
      ...args: any[]
    ) {
      if (kind === "webgl2") {
        const previousAttempts = attempts;
        attempts += 1;

        if (previousAttempts < 2) {
          return null;
        }
      }

      return original.apply(this, [kind, ...args] as any);
    } as any;
  });
  await page.goto("/?component=chart");
  const plot = page.locator("#reactive-pie");
  await expect(
    plot.locator("[data-slot=chart-profiler-frame]")
  ).toHaveAttribute("data-mc-ready", "true");
  await expect(page.locator("[data-chart=chart-world-activity]")).toBeVisible();
  await page.locator("#plot-update").click();
  await expect(
    plot.locator("[data-slot=chart-profiler-frame]")
  ).toHaveAttribute("data-mc-ready", "true");
});

test("pixel shapes follow the same ChartConfig theme variables as Recharts SVG shapes", async ({
  page,
}) => {
  await page.goto("/?component=chart");
  const canvas = page.locator("#themed-pixels canvas");

  const hasColor = async (color: number[]) =>
    canvas.evaluate((element: HTMLCanvasElement, color) => {
      const pixels = element
        .getContext("2d")!
        .getImageData(0, 0, element.width, element.height).data;

      for (let i = 0; i < pixels.length; i += 4) {
        if (
          pixels[i] === color[0] &&
          pixels[i + 1] === color[1] &&
          pixels[i + 2] === color[2]
        ) {
          return true;
        }
      }

      return false;
    }, color);

  await expect.poll(async () => hasColor([34, 221, 68])).toBe(true);
  await page.locator("#theme").click();
  await expect.poll(async () => hasColor([0, 170, 17])).toBe(true);
  expect(await hasColor([34, 221, 68])).toBe(false);
});
