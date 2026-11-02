import { readFileSync, writeFileSync } from "node:fs";

import { test, expect } from "@grasscn/tests/test";
import { fixtureFile } from "@tests/paths";
import { PNG } from "pngjs";

const fixture =
  process.env.GRASSCN_EXPANSION_URL ?? "http://127.0.0.1:5174/adventure.html";

for (const sample of [
  {
    model: "slim",
    name: "Dream back",
    src: "/dream-skin.png",
    state: "wide/steve",
  },
  {
    model: "wide",
    name: "classic back after Alex",
    src: "/steve-skin.png",
    state: "slim/alex",
  },
] as const) {
  test(`${sample.name} automatically uses the correct arm model`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ height: 900, width: 1536 });

    const capture = async (explicit: boolean) => {
      const c = {
        anchor: 0,
        element: "player-preview",
        height: 120,
        src: sample.src,
        state: sample.state,
        value: 180,
        width: 80,
        ...(explicit ? { model: sample.model } : {}),
      };

      await page.goto(
        `${fixture}?scale=2&case=${encodeURIComponent(JSON.stringify(c))}`
      );
      await expect(page.locator("[data-subject]")).toHaveAttribute(
        "data-ready",
        "true"
      );

      return await page.locator("[data-subject] canvas").screenshot();
    };

    const actual = await capture(false);
    const explicit = await capture(true);
    const a = PNG.sync.read(actual);
    const b = PNG.sync.read(explicit);

    let differences = 0;

    for (let i = 0; i < a.data.length; i += 4) {
      if (!a.data.subarray(i, i + 4).equals(b.data.subarray(i, i + 4))) {
        differences++;
      }
    }

    writeFileSync(info.outputPath("auto.png"), actual);
    writeFileSync(info.outputPath("explicit.png"), explicit);
    writeFileSync(
      info.outputPath("pixels.json"),
      JSON.stringify({
        comparison:
          "Automatic model versus explicit model confirmed by the skin layout/profile; not a native pixel oracle",
        mismatchedPixels: differences,
      })
    );
    expect(differences).toBe(0);
  });
}

test("custom skin can fail, recover, and replace another model without remounting", async ({
  page,
}) => {
  await page.route("https://mc-heads.net/skin/*", async (route) => {
    const name = decodeURIComponent(
      new URL(route.request().url()).pathname.split("/").pop()!
    );

    if (name === "Missing") {
      return route.fulfill({ body: "", status: 404 });
    }

    return route.fulfill({
      body: readFileSync(
        fixtureFile(`${name === "Dream" ? "dream" : "steve"}-skin.png`)
      ),
      contentType: "image/png",
      headers: { "access-control-allow-origin": "*" },
      status: 200,
    });
  });
  await page.goto("http://127.0.0.1:5176/components/player-preview");

  const player = page.getByRole("group", {
    exact: true,
    name: "Player preview",
  });

  const input = page.getByRole("textbox", { exact: true, name: "Player name" });

  for (const [name, model] of [
    ["Dream", "slim"],
    ["Missing", null],
    ["Classic", "wide"],
    ["Dream", "slim"],
  ] as const) {
    await input.fill(name);
    await page.getByRole("button", { exact: true, name: "Load skin" }).click();

    if (model === null) {
      await expect(player.getByRole("status")).toHaveText(
        "3D preview unavailable"
      );
      await expect(player).toHaveAttribute("data-ready", "false");
    } else {
      await expect(player).toHaveAttribute("data-ready", "true");
      await expect(player).toHaveAttribute("data-model", model);
    }
  }
});
