import { test, expect } from "@grasscn/tests/test";
import { documentationInventory } from "@tests/checks/documentation-inventory";

const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/u, "/");

const names = documentationInventory().playgrounds.map(
  (component) => component.name
);

for (const viewport of [
  { height: 1000, width: 1440 },
  { height: 844, width: 390 },
]) {
  test(`Maintained gallery remains usable at the fixed preview scale at ${viewport.width}px`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.text().includes("Too many active WebGL contexts")) {
        errors.push(message.text());
      }
    });
    await page.setViewportSize(viewport);

    for (const name of names) {
      // oxlint-disable-next-line no-await-in-loop -- Runs the current fixture case on one shared page; its navigation, interactions and observations finish before the next case replaces that page.
      await page.goto(origin + "docs/components/" + name);
      const card = page.locator(".documentation-playground");

      // oxlint-disable-next-line no-await-in-loop -- Runs the current fixture case on one shared page; its navigation, interactions and observations finish before the next case replaces that page.
      await expect(card).toBeVisible();
      // oxlint-disable-next-line no-await-in-loop -- Runs the current fixture case on one shared page; its navigation, interactions and observations finish before the next case replaces that page.
      await expect
        .poll(
          async () =>
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth
            )
        )
        .toBe(true);
      expect(
        // oxlint-disable-next-line no-await-in-loop -- Runs the current fixture case on one shared page; its navigation, interactions and observations finish before the next case replaces that page.
        await page.locator("[id]").evaluateAll((nodes) => {
          const seen = new Set<string>();

          return nodes.flatMap((n) => {
            if (seen.has(n.id)) {
              return [n.id];
            }

            seen.add(n.id);

            return [];
          });
        })
      ).toEqual([]);
    }

    expect(errors).toEqual([]);
  });
}
