import { test, expect } from "@grasscn/tests/test";
import type { Page } from "@playwright/test";
import { PNG } from "pngjs";
const types = [
  ["bar", "Bar"],
  ["stacked-bar", "Stacked bar"],
  ["line", "Line"],
  ["area", "Area"],
  ["pie", "Pie"],
  ["donut", "Donut"],
  ["radar", "Radar"],
  ["radial", "Radial"],
] as const;

async function select(page: Page, label: string, value: string) {
  await page.getByRole("combobox", { exact: true, name: label }).click();
  await page.getByRole("option", { exact: true, name: value }).click();
}

async function open(page: Page, scale: number, mobile = false) {
  await page.setViewportSize({ height: 1000, width: mobile ? 390 : 1440 });
  await page.goto(
    `${process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"}docs/components/chart`
  );

  await expect(
    page.locator('[data-stage="chart"] [data-slot="chart-example"] canvas')
  ).toHaveAttribute("data-mc-ready", "true");
}
for (const scale of [2])
  { for (const mobile of [false, true])
    { test(`Analytics types preserve integer pixels and fit ${mobile ? "mobile" : "desktop"} GUI${scale}`, async ({
      page,
    }, info) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await open(page, scale, mobile);

      const stage = page.locator('[data-stage="chart"]');
      const chart = stage.locator('[data-slot="chart-example"]');

      for (const [type, label] of types) {
        await select(page, "Chart type", label);
        await expect(chart).toHaveAttribute("data-chart-type", type);

        for (const control of await stage.getByRole("combobox").all()) {
          const b = await control.boundingBox();
          expect(b!.x).toBeGreaterThanOrEqual(0);
          expect(b!.x + b!.width).toBeLessThanOrEqual(mobile ? 390 : 1440);
        }

        const canvas = chart.locator("canvas");
        await expect(canvas).toBeVisible();
        const bounds = await canvas.boundingBox();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
          mobile ? 390 : 1440
        );
        const buffer = await canvas.screenshot();
        await info.attach(`${type}.png`, {
          body: buffer,
          contentType: "image/png",
        });
        const image = PNG.sync.read(buffer);
        expect(image.width % scale).toBe(0);
        expect(image.height % scale).toBe(0);

        for (let y = 0; y < image.height; y += scale) {
          for (let x = 0; x < image.width; x += scale) {
            for (let sy = 0; sy < scale; sy += 1) {
              for (let sx = 0; sx < scale; sx += 1) {
                const a = (y * image.width + x) * 4;
                const b = ((y + sy) * image.width + x + sx) * 4;

                if (
                  !image.data
                    .subarray(a, a + 4)
                    .equals(image.data.subarray(b, b + 4))
                ) {
                  throw new Error(
                    `${type}: noninteger pixel block at${x},${y}`
                  );
                }
              }
            }
          }
        }
      }

      expect(errors).toEqual([]);
    }); } }
test("Website analytics filters update real data and accessible table", async ({
  page,
}) => {
  await open(page, 2);
  const chart = page.locator('[data-slot="chart-example"]');
  await chart.locator("summary").click();
  await expect(chart.getByRole("row")).toHaveCount(7);
  await expect(
    chart.getByRole("cell", { exact: true, name: "186" })
  ).toBeVisible();
  const before = await chart.locator("canvas").screenshot();
  await select(page, "Chart period", "Last 3 months");
  await expect(chart.getByRole("row")).toHaveCount(4);
  await expect(page.locator("[data-stage=chart]")).toContainText(
    "Apr to Jun 2024"
  );
  expect((await chart.locator("canvas").screenshot()).equals(before)).toBe(
    false
  );
  await select(page, "Chart devices", "Desktop");
  await expect(chart.getByRole("columnheader")).toHaveCount(2);
  const plot = chart.getByRole("application");
  await plot.focus();
  await page.mouse.move(0, 0);
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(chart.locator(".mc-chart-tooltip")).toContainText("April");
  await expect(chart.locator(".mc-chart-tooltip")).toContainText("73");
  await page.keyboard.press("ArrowRight");
  await expect(chart.locator(".mc-chart-tooltip")).toContainText("May");
  await expect(chart.locator(".mc-chart-tooltip")).toContainText("209");
});
test("Analytics chart rerasterizes when available width changes", async ({
  page,
}) => {
  await open(page, 2);

  const chart = page.locator('[data-slot="chart-example"]');
  const canvas = chart.locator("canvas");

  const width = await canvas.getAttribute("width");
  await page.setViewportSize({ height: 1000, width: 540 });
  await expect.poll(async () => canvas.getAttribute("width")).not.toBe(width);
  await expect(chart.locator("canvas")).toHaveAttribute(
    "data-mc-ready",
    "true"
  );
});

test("Hover inspection reports the plotted datum and leaving clears the readout", async ({
  page,
}) => {
  await open(page, 2);

  const chart = page.locator('[data-slot="chart-example"]');
  const canvas = chart.locator("canvas");

  const b = await canvas.boundingBox();
  await chart.getByRole("application").hover({ position: { x: 80, y: 40 } });
  await expect(chart.locator(".mc-chart-tooltip")).toContainText("January");
  await expect(chart.locator(".mc-chart-tooltip")).toContainText("186");
  await expect(chart.locator(".mc-chart-tooltip")).toContainText("80");
  await page.mouse.move(0, 0);
  await expect(chart.locator(".mc-chart-tooltip")).not.toBeVisible();
});
