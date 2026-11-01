import { test, expect } from "@grasscn/tests/test";

const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/u, "/");

for (const width of [320, 390, 768, 1024, 1565]) {
  test(`homepage examples render without overflow or runtime errors at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ height: 951, width });
    await page.goto(origin);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("grasscn");
    await expect(
      page
        .getByRole("region", { name: "Interactive application examples" })
        .getByRole("region")
    ).toHaveCount(14);
    await expect(
      page.getByRole("application", {
        exact: true,
        name: "API response time example",
      })
    ).toBeVisible();
    await expect(
      page.getByRole("img", { exact: true, name: "Sam Rivera" })
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);

    const escaped = await page.locator(".grass-panel").evaluateAll((panels) =>
      panels.flatMap((panel) =>
        [
          ...panel.querySelectorAll(
            "input:not([type=hidden]):not([aria-hidden=true]),textarea,button[data-slot]"
          ),
        ]
          .filter((el) => {
            // Base UI form proxy inputs are visually hidden; measure the visible controls.
            if (
              el.tagName === "INPUT" &&
              getComputedStyle(el).opacity === "0"
            ) {
              return false;
            }

            const box = el.getBoundingClientRect();
            const outer = panel.getBoundingClientRect();

            return (
              box.width > 0 &&
              (box.left < outer.left - 1 || box.right > outer.right + 1)
            );
          })
          .map((el) => el.getAttribute("aria-label") ?? el.textContent)
      )
    );

    expect(escaped).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("homepage links, search and component gallery remain connected", async ({
  page,
}) => {
  await page.goto(origin);

  const search = page.getByRole("combobox", {
    exact: true,
    name: "Search documentation",
  });

  await search.fill("Textarea");
  await page
    .getByRole("option", { exact: true, name: "Textarea" })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { exact: true, name: "Textarea" })
  ).toBeVisible();
  await page
    .getByRole("banner")
    .getByRole("link", { exact: true, name: "grasscn home" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("grasscn");
  await page
    .getByRole("link", { exact: true, name: "Browse components" })
    .click();
  await expect(
    page
      .getByRole("navigation", { exact: true, name: "Documentation" })
      .getByRole("link", { exact: true, name: "Button" })
  ).toBeVisible();
  await page.goBack();
  await expect(search).toBeVisible();
});

test("project form, launch checklist and preferences reflect user choices", async ({
  page,
}) => {
  await page.goto(origin);
  await page
    .getByRole("textbox", { exact: true, name: "Project name" })
    .fill("客户门户");
  await page
    .getByRole("combobox", { exact: true, name: "Project category" })
    .click();
  await page.getByRole("option", { exact: true, name: "Engineering" }).click();
  await page
    .getByRole("button", { exact: true, name: "Create project" })
    .click();
  await expect(page.getByLabel("Project result")).toHaveText(
    "Created: 客户门户"
  );
  await page
    .getByRole("checkbox", { exact: true, name: "Ship something memorable" })
    .check();
  await expect(page.getByLabel("Launch progress")).toHaveText(
    "3 of 4 complete"
  );
  await page.getByRole("switch", { exact: true, name: "Product news" }).click();
  await page
    .getByRole("button", { exact: true, name: "Save preferences" })
    .click();
  await expect(page.getByLabel("Preferences status")).toHaveText(
    "Preferences saved for this demo."
  );
});

test("chat sends CJK, charts switch, and payout threshold can be saved", async ({
  page,
}) => {
  await page.goto(origin);
  await page
    .getByRole("textbox", { exact: true, name: "Team message" })
    .fill("你好，团队！");
  await page.getByRole("button", { exact: true, name: "Send" }).click();
  await expect(
    page.getByRole("log", { name: "Team conversation" })
  ).toContainText("<You> 你好，团队！");
  await expect(
    page.getByRole("textbox", { exact: true, name: "Team message" })
  ).toHaveValue("");
  await page.getByRole("button", { exact: true, name: "Area" }).click();
  await expect(
    page.getByRole("button", { exact: true, name: "Area" })
  ).toHaveAttribute("aria-pressed", "true");

  const slider = page.getByRole("slider", {
    name: "Payout threshold",
  });

  await slider.focus();
  await slider.press("ArrowRight");
  await page
    .getByRole("button", { exact: true, name: "Save threshold" })
    .click();
  await expect(page.getByLabel("Payout status")).toHaveText(
    "Threshold set to $275."
  );
});

test("installation picker copies the selected real registry command", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`${origin}#install`);
  await page
    .getByRole("combobox", { exact: true, name: "Component to install" })
    .click();
  await page.getByRole("option", { name: "card", exact: true }).click();
  await page
    .locator(".grass-install")
    .getByRole("button", { exact: true, name: "Copy" })
    .click();
  await expect(page.locator(".grass-install").getByRole("status")).toHaveText(
    "Copied"
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `npx shadcn@latest add ${new URL(origin).origin}/r/card.json`
  );
});

test("Minecraft-style title has a yellow splash and respects reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(origin);
  await expect(page.locator(".grass-title-scene img")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("grasscn");
  await expect(page.locator(".grass-title-splash")).toHaveText(
    "Now with components!"
  );
  await expect(page.locator(".grass-title-splash")).toHaveAttribute(
    "data-motion",
    "paused"
  );
  await expect(page.locator(".grass-title-splash .mc-glyph").first()).toHaveCSS(
    "background-color",
    "rgb(255, 255, 0)"
  );
});
