import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { test, expect } from "@grasscn/tests/test";
import { registryDocument } from "@grasscn/tests/verification-types";
import { minecraftTextareaAssets } from "@grasscn/web/ui/minecraft-textarea-assets";
import { webFile } from "@tests/paths";

const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/u, "/");

test("Page scrollbars embed the unchanged original game textures", () => {
  const css = readFileSync(webFile("minecraft-scrollbars.css"), "utf-8");
  expect(css).toContain(minecraftTextareaAssets.scroller);
  expect(css).toContain(minecraftTextareaAssets.scroller_background);
});

for (const scale of [2]) {
  test(`Document, nested and horizontal bars use Minecraft artwork at GUI scale ${scale}`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await page.goto(origin + "docs/components/textarea");

    await expect
      .poll(
        async () =>
          await page.evaluate(
            () =>
              getComputedStyle(document.documentElement, "::-webkit-scrollbar")
                .width
          )
      )
      .toBe(`${6 * scale}px`);
    const example = page.getByRole("region", {
      exact: true,
      name: "Textarea example",
    });
    await expect(example).toHaveAttribute("aria-busy", "false");
    await expect(
      example.getByRole("textbox", { exact: true, name: "Journey notes" })
    ).toHaveAttribute("data-mc-ready", "true");

    // Exercise native overflow on ordinary content and body-portaled content.
    await page.evaluate(() => {
      for (const portal of [false, true]) {
        const region = document.createElement("div");
        region.id = portal
          ? "scrollbar-portal-proof"
          : "scrollbar-nested-proof";
        region.tabIndex = 0;
        region.style.cssText = "width:120px;height:80px;overflow:auto";
        const content = document.createElement("div");
        content.style.cssText = "width:600px;height:800px";
        content.textContent = "Scrollable world list";
        region.append(content);
        (portal ? document.body : document.querySelector("main")!).append(
          region
        );
      }
    });

    for (const selector of [
      "html",
      "#scrollbar-nested-proof",
      "#scrollbar-portal-proof",
      ".minecraft-docs-sidebar nav",
    ]) {
      const result = await page.locator(selector).evaluate((element) => {
        const bar = getComputedStyle(element, "::-webkit-scrollbar");
        const track = getComputedStyle(element, "::-webkit-scrollbar-track");
        const thumb = getComputedStyle(element, "::-webkit-scrollbar-thumb");

        return {
          buttons: getComputedStyle(element, "::-webkit-scrollbar-button")
            .display,
          color: getComputedStyle(element).scrollbarColor,
          height: bar.height,
          radius: thumb.borderRadius,
          thumb: thumb.borderImageSource,
          track: track.borderImageSource,
          width: bar.width,
        };
      });

      expect(result.width).toBe(`${6 * scale}px`);
      expect(result.height).toBe(`${6 * scale}px`);
      expect(result.color).toBe("auto");
      expect(result.thumb).toContain(minecraftTextareaAssets.scroller);
      expect(result.track).toContain(
        minecraftTextareaAssets.scroller_background
      );
      expect(result.radius).toBe("0px");
      expect(result.buttons).toBe("none");
    }

    const nested = page.locator("#scrollbar-nested-proof");
    await nested.focus();
    await nested.press("End");
    await expect
      .poll(async () => await nested.evaluate((e) => e.scrollTop))
      .toBeGreaterThan(0);
    const nav = page.locator(".minecraft-docs-sidebar nav");
    await expect(nav).toBeAttached();
    // Textarea has a separate verified native scroller; avoid a second OS scrollbar.
    expect(
      await page
        .locator(".documentation-playground textarea")
        .first()
        .evaluate((e) => getComputedStyle(e, "::-webkit-scrollbar").display)
    ).toBe("none");
  });
}

const componentMapCount = (text: string) => {
  const value: unknown = JSON.parse(text);

  assert.ok(
    value instanceof Object &&
      "components" in value &&
      Array.isArray(value.components),
    "Authored component map list required"
  );

  return value.components.length;
};

test("Retired components are absent from supported catalog and served payloads", async ({
  page,
  request,
}) => {
  const registry = registryDocument(
    readFileSync(webFile("registry.json"), "utf-8")
  );

  const mapSize = componentMapCount(
    readFileSync(webFile("registry/minecraft-map.json"), "utf-8")
  );

  expect(registry.items.length).toBe(mapSize);

  const awaitedGet1 = await request.get(
    new URL("r/registry.json", origin).href
  );

  // SAFETY: the owned registry generator serves this catalogue's items; keep the original HTTP parse and existing count assertion unchanged.
  // oxlint-disable typescript/no-unsafe-type-assertion -- Exact consumed items protocol from the authored/generated registry producer.
  const served = (await awaitedGet1.json()) as Pick<
    ReturnType<typeof registryDocument>,
    "items"
  >;
  // oxlint-enable typescript/no-unsafe-type-assertion

  expect(served.items).toHaveLength(registry.items.length);
  await page.goto(`${origin}docs`);

  for (const name of [
    "Direction",
    "Toast",
    "Hover Card",
    "Navigation Menu",
    "Accordion",
    "Alert",
  ]) {
    await expect(
      page
        .getByRole("navigation", { name: "Documentation" })
        .getByRole("link", { exact: true, name })
    ).toHaveCount(0);
    expect(
      registry.items.some(
        (item: { name: string }) =>
          item.name === name.toLowerCase().replaceAll(" ", "-")
      )
    ).toBe(false);

    const awaitedGet2 = await request.get(
      `${new URL(origin).origin}/r/${name.toLowerCase().replaceAll(" ", "-")}.json`
    );

    expect(awaitedGet2.status()).toBe(404);
  }
});
