import { test, expect } from "./verified-test";
import { PNG } from "pngjs";

// Explicit preview origin: the main suite's baseURL is the installed fixture.
const preview = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/";
for (const scale of [2] as const) for (const container of ["narrow", "padded"] as const) {
  test(`Chart retains its integer pixel grid in ${container} container at GUI${scale}`, async ({page}, info) => {
    await page.setViewportSize({width:1280,height:1000});
    await page.goto(`${preview.replace(/\/$/, "")}/#/components/chart`);

    const chart = page.locator('[data-slot="pixel-chart"]');
    await expect(chart).toHaveAttribute("data-mc-ready", "true");
    // Isolate a real narrow/padded consumer container from unrelated page-header overflow.
    await chart.evaluate((node, {scale,container}) => {
      const wrapper = document.createElement("div");
      wrapper.style.width = `${(container === "narrow" ? 72 : 100) * scale}px`;
      wrapper.style.overflow = "auto";
      wrapper.dataset.integerChartContainer = container;
      node.before(wrapper); wrapper.append(node);
      node.style.width = "100%";
      if (container === "padded") node.style.padding = `${7 * scale}px`;
    }, {scale,container});
    const canvas = chart.locator("canvas");
    await expect.poll(async () => canvas.evaluate((node:HTMLCanvasElement) => node.width)).toBe(container === "narrow" ? 80 : 100);
    const geometry = await canvas.evaluate((node:HTMLCanvasElement) => ({
      raster:[node.width,node.height],
      css:[node.getBoundingClientRect().width,node.getBoundingClientRect().height],
      sampling:getComputedStyle(node).imageRendering,
    }));
    await info.attach("geometry.json", {body:JSON.stringify(geometry),contentType:"application/json"});
    expect(geometry.sampling).toBe("pixelated");
    expect(geometry.css).toEqual(geometry.raster.map(size => size * scale));
    const bytes = await canvas.screenshot();
    await info.attach("canvas.png", {body:bytes,contentType:"image/png"});
    const image = PNG.sync.read(bytes);
    // Ignore clipped fractional edge blocks; every complete visible block must be uniform.
    // Both test containers have integer-scale clip boundaries.
    let differing = 0;
    for (let y=0; y+scale<=image.height; y+=scale) for (let x=0; x+scale<=image.width; x+=scale) {
      const start=(y*image.width+x)*4;
      for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++) {
        const offset=((y+dy)*image.width+x+dx)*4;
        if (!image.data.subarray(start,start+4).equals(image.data.subarray(offset,offset+4))) differing++;
      }
    }
    expect(differing).toBe(0);
  });
}

