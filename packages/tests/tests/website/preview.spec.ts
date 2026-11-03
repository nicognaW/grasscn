import { test, expect } from "@grasscn/tests/test";
import { documentationInventory } from "@tests/checks/documentation-inventory";
import { PNG } from "pngjs";

const catalog = { components: documentationInventory().playgrounds };

const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/u, "/");

test("Toggle preview supports CJK labels, native pressed state and disabling", async ({
  page,
}) => {
  await page.goto(`${origin}docs/components/toggle`);
  await page
    .locator(".documentation-playground")
    .getByRole("textbox", { name: "Toggle filter label" })
    .fill("只显示可合成的配方");

  const control = page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "只显示可合成的配方" });

  await expect(control).toHaveAttribute("aria-pressed", "false");
  await control.click();
  await expect(control).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator(".documentation-playground").getByLabel("Recipe filter state")
  ).toHaveText("Craftable recipes");
  await page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Disable filter" })
    .click();
  await expect(control).toBeDisabled();
  await page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Enable filter" })
    .click();
  await control.focus();
  await page.keyboard.press("Space");
  await expect(control).toHaveAttribute("aria-pressed", "false");
});

test("Toggle Group preview exposes independent single and multiple values", async ({
  page,
}) => {
  await page.goto(`${origin}docs/components/toggle-group`);

  const single = page
    .locator(".documentation-playground")
    .getByRole("group", { name: "One recipe station" });

  const multiple = page
    .locator(".documentation-playground")
    .getByRole("group", { name: "Several recipe stations" });

  await single.getByRole("button", { name: "Furnace recipes" }).click();
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Single recipe station")
  ).toHaveText("furnace");
  await multiple.getByRole("button", { name: "Stonecutter recipes" }).click();
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Multiple recipe stations")
  ).toHaveText("crafting, stonecutter");
  await page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Disable filters" })
    .click();
  await expect(single.getByRole("button").first()).toBeDisabled();
  await expect(multiple.getByRole("button").first()).toBeDisabled();
  await page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Reset filters" })
    .click();
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Single recipe station")
  ).toHaveText("crafting");
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Multiple recipe stations")
  ).toHaveText("crafting");
});

test("Collapsible preview supports CJK content, line breaks and external control", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}docs/components/collapsible`);
  await page
    .locator(".documentation-playground")
    .getByRole("textbox", { exact: true, name: "Collapsible title" })
    .fill("你好，世界");
  await page
    .locator(".documentation-playground")
    .getByRole("textbox", { exact: true, name: "Collapsible message" })
    .fill("こんにちは\n안녕하세요");

  const trigger = page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "你好，世界" });

  await expect(trigger.locator("[data-mc-label-ready]")).toHaveAttribute(
    "data-mc-label-ready",
    "true"
  );
  await trigger.click();

  const body = page.locator(
    '[data-stage="collapsible"] [data-slot="collapsible-content"]'
  );

  await expect(body).toBeVisible();
  await expect(body).toContainText("こんにちは\n안녕하세요");
  await expect(body.locator("[data-mc-label-layout-ready]")).toHaveAttribute(
    "data-mc-label-layout-ready",
    "true"
  );

  for (const glyphs of await body.locator("[data-mc-label-ready]").all()) {
    await expect(glyphs).toHaveAttribute("data-mc-label-ready", "true");
  }

  await trigger.press("Enter");
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Collapsible status", { exact: true })
  ).toHaveText("Details closed");
  await page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Show details" })
    .click();
  await expect(body).toBeVisible();
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Collapsible status", { exact: true })
  ).toHaveText("Details open");
  expect(errors).toEqual([]);
});

test("Menubar preview supports CJK titles, menu switching and nested actions", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}docs/components/menubar`);
  await page
    .locator(".documentation-playground")
    .getByRole("textbox", { exact: true, name: "Menubar title" })
    .fill("你好，世界");
  await page
    .locator(".documentation-playground")
    .getByRole("textbox", { exact: true, name: "Menubar action" })
    .fill("こんにちは");

  const bar = page
    .getByRole("region", {
      exact: true,
      name: "Interactive menubar playground",
    })
    .getByRole("menubar", {
      name: "World command bar",
    });

  const trigger = bar.getByRole("menuitem", {
    exact: true,
    name: "你好，世界",
  });

  await expect(trigger.locator("[data-mc-label-ready]")).toHaveAttribute(
    "data-mc-label-ready",
    "true"
  );
  await expect(
    bar.getByRole("menuitem", { exact: true, name: "Unavailable" })
  ).toBeDisabled();
  await trigger.press("ArrowDown");
  await expect(
    page.getByRole("menuitem", { name: /こんにちは/u })
  ).toBeFocused();

  const checkbox = page.getByRole("menuitemcheckbox", {
    name: "Show coordinates",
  });

  await checkbox.click();
  await expect(checkbox).toBeChecked();
  const radio = page.getByRole("menuitemradio", { exact: true, name: "Game" });
  await radio.click();
  await expect(radio).toBeChecked();
  await page.getByRole("menuitem", { exact: true, name: "More" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("menuitem", { exact: true, name: "Video settings" })
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Menubar status", { exact: true })
  ).toHaveText("Video settings");
  await expect(trigger).toBeFocused();
  await page.keyboard.press("ArrowRight");
  const world = bar.getByRole("menuitem", { exact: true, name: "World" });
  await expect(world).toBeFocused();
  await world.press("Enter");
  await page
    .getByRole("menuitem", { exact: true, name: "Create world" })
    .click();
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Menubar status", { exact: true })
  ).toHaveText("Create world");
  await trigger.click();
  await page.getByRole("menuitem", { name: /こんにちは/u }).click();
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Menubar status", { exact: true })
  ).toHaveText("こんにちは");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  const reopened = page.getByRole("menu", { exact: true, name: "你好，世界" });

  await expect(reopened).toBeVisible();
  await expect
    .poll(
      async () =>
        await reopened.evaluate((element) =>
          element.contains(document.activeElement)
        )
    )
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(errors).toEqual([]);
});

test("Context Menu preview supports CJK actions, toggles and right-click submenus", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}docs/components/context-menu`);
  await page
    .locator(".documentation-playground")
    .getByRole("textbox", { exact: true, name: "Context menu title" })
    .fill("你好，世界");
  await page
    .locator(".documentation-playground")
    .getByRole("textbox", { exact: true, name: "Context menu action" })
    .fill("こんにちは");

  const trigger = page
    .locator(".documentation-playground")
    .getByLabel("World context menu target", { exact: true });

  const open = () =>
    trigger.click({ button: "right", position: { x: 24, y: 24 } });

  await open();
  const menu = page.getByRole("menu").first();
  await expect(
    menu.locator('[data-slot="context-menu-label"] .mc-menu-accessible')
  ).toHaveText("你好，世界");

  for (const glyphs of await menu
    .locator("[data-mc-menu-unicode-ready]")
    .all()) {
    await expect(glyphs).toHaveAttribute("data-mc-menu-unicode-ready", "true");
  }

  const checkbox = page.getByRole("menuitemcheckbox", {
    name: "Show coordinates",
  });

  await checkbox.click();
  await expect(checkbox).toBeChecked();
  const radio = page.getByRole("menuitemradio", { exact: true, name: "Game" });
  await radio.click();
  await expect(radio).toBeChecked();
  await page.getByRole("menuitem", { exact: true, name: "More" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("menuitem", { exact: true, name: "Video settings" })
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Context menu status", { exact: true })
  ).toHaveText("Video settings");
  await open();
  await page.getByRole("menuitem", { name: /こんにちは/u }).click();
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Context menu status", { exact: true })
  ).toHaveText("こんにちは");
  await open();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Dropdown Menu preview supports CJK actions, toggles and nested menus", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}docs/components/dropdown-menu`);
  await page
    .locator(".documentation-playground")
    .getByRole("textbox", { exact: true, name: "Dropdown menu title" })
    .fill("你好，世界");
  await page
    .locator(".documentation-playground")
    .getByRole("textbox", { exact: true, name: "Dropdown menu action" })
    .fill("こんにちは");

  const trigger = page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Game menu" });

  await trigger.click();
  const menu = page.getByRole("menu").first();
  await expect(
    menu.locator('[data-slot="dropdown-menu-label"] .mc-menu-accessible')
  ).toHaveText("你好，世界");

  for (const glyphs of await menu
    .locator("[data-mc-menu-unicode-ready]")
    .all()) {
    await expect(glyphs).toHaveAttribute("data-mc-menu-unicode-ready", "true");
  }

  await expect(
    page.getByRole("menuitem", { exact: true, name: "Unavailable" })
  ).toBeDisabled();

  const checkbox = page.getByRole("menuitemcheckbox", {
    name: "Show coordinates",
  });

  await checkbox.click();
  await expect(checkbox).toBeChecked();
  const radio = page.getByRole("menuitemradio", { exact: true, name: "Game" });
  await radio.click();
  await expect(radio).toBeChecked();
  await page.getByRole("menuitem", { exact: true, name: "More" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("menuitem", { exact: true, name: "Video settings" })
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Dropdown menu status", { exact: true })
  ).toHaveText("Video settings");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("menuitem", { name: /こんにちは/u }).click();
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Dropdown menu status", { exact: true })
  ).toHaveText("こんにちは");
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(errors).toEqual([]);
});

test("Every component has a working dedicated preview and navigation", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  for (const component of documentationInventory().pages) {
    await page.goto(`${origin}${component.route.slice(1)}`);
    await expect(
      page.getByRole("heading", { exact: true, name: component.title }).first()
    ).toBeVisible();

    if (component.playground) {
      await expect(page.locator(".documentation-playground")).toBeVisible();
    }
  }

  await page.goto(`${origin}docs/components/button`);
  await page
    .locator(
      '.documentation-playground [data-stage="button"] [data-slot="button"]'
    )
    .first()
    .click();
  await expect(page.getByLabel("Button activations")).toHaveText(
    "Pressed 1 time"
  );
  await page
    .getByRole("navigation", { exact: true, name: "Documentation" })
    .getByRole("link", { exact: true, name: "Checkbox" })
    .click();
  const playground = page.locator(".documentation-playground");
  await playground.getByRole("checkbox", { name: "Enable shadows" }).check();
  await expect(playground.getByLabel("Checkbox value")).toHaveText("Checked");

  const search = page.getByRole("combobox", {
    exact: true,
    name: "Search documentation",
  });

  await search.fill("Slider");
  await page
    .getByRole("option", { exact: true, name: "Slider" })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { exact: true, name: "Slider" }).first()
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("Preview Label supports editable CJK text and focuses its associated field", async ({
  page,
}) => {
  await page.goto(`${origin}docs/components/label`);
  await page
    .locator(".documentation-playground")
    .getByRole("textbox", { exact: true, name: "Label text" })
    .fill("你好，世界");

  const label = page
    .locator('.documentation-playground [data-stage="label"] .demo-pair')
    .first()
    .locator('[data-slot="label"]');

  await expect(label.locator("[data-mc-label-ready]")).toHaveAttribute(
    "data-mc-label-ready",
    "true"
  );
  await expect(
    page
      .locator(".documentation-playground")
      .getByRole("textbox", { exact: true, name: "你好，世界" })
  ).toBeVisible();
  await label.click();
  await expect(
    page
      .locator(".documentation-playground")
      .getByRole("textbox", { exact: true, name: "你好，世界" })
  ).toBeFocused();
});

test("Preview Separator width control updates both original surfaces", async ({
  page,
}) => {
  await page.goto(`${origin}docs/components/separator`);
  await page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Separator width: 200 px" })
    .click();
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Separator width", { exact: true })
  ).toHaveText("257 px");

  for (const name of ["Menu header separator", "Menu footer separator"]) {
    await expect(
      page
        .locator(".documentation-playground")
        .getByRole("separator", { exact: true, name })
    ).toHaveCSS("width", "514px");
    await expect(
      page
        .locator(".documentation-playground")
        .getByRole("separator", { exact: true, name })
    ).toHaveCSS("height", "4px");
  }
});

test("Preview ScrollArea scrolls, selects rows and locks scrolling", async ({
  page,
}) => {
  await page.goto(`${origin}docs/components/scroll-area`);
  await page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Scroll to bottom" })
    .click();
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Scroll area offset", { exact: true })
  ).toHaveText("2336 px");
  await page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Row 100" })
    .click();
  await expect(
    page.getByText("Selected Row 100", { exact: true })
  ).toBeVisible();
  await page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Scroll to top" })
    .click();
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Scroll area offset", { exact: true })
  ).toHaveText("0 px");
  await page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Scrolling: On" })
    .click();

  const root = page
    .locator(".documentation-playground")
    .getByRole("region", { exact: true, name: "Demo scroll area" });

  await expect(root).toHaveAttribute("data-disabled", "true");
  await root.locator('[data-slot="scroll-area-viewport"]').hover();
  await page.mouse.wheel(0, 120);
  expect(
    await root
      .locator('[data-slot="scroll-area-viewport"]')
      .evaluate((node) => node.scrollTop)
  ).toBe(0);
});

test("Preview Progress adjusts value, original color and notch style", async ({
  page,
}) => {
  await page.goto(`${origin}docs/components/progress`);

  const progress = page
    .locator(".documentation-playground")
    .getByRole("progressbar", { exact: true, name: "Demo progress" });

  await page.getByRole("slider", { exact: true, name: "Set progress" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(progress).toHaveAttribute("aria-valuenow", "51");
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Progress percentage", { exact: true })
  ).toHaveText("51%");
  await page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Boss bar color: Pink" })
    .click();
  await expect(progress).toHaveAttribute("data-color", "blue");
  await page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Boss bar notches: None" })
    .click();
  await expect(progress).toHaveAttribute("data-overlay", "notched_6");
  await expect(progress.locator("canvas")).toHaveAttribute(
    "data-mc-progress-painted",
    "true"
  );
});

test("Release pages omit internal completion and verification counters", async ({
  page,
}) => {
  await page.goto(`${origin}docs`);
  await expect(
    page
      .locator(".documentation-playground")
      .getByRole("progressbar", { exact: true, name: "Registry completion" })
  ).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("native cases");
  await expect(page.locator("body")).not.toContainText("WORK IN PROGRESS");
});

test("Mobile component pages contain default previews before and after paragraph layout", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ height: 844, width: 390 });

  for (const component of catalog.components) {
    await page.goto(`${origin}docs/components/${component.name}`);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
    await expect(page.locator(".documentation-playground")).toBeVisible();
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
  }
});

test("Tooltip padding preserves the controls underneath it", async ({
  page,
}) => {
  await page.goto(`${origin}docs/components/tooltip`);
  await page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "More information" })
    .hover();
  const content = page.locator('[data-slot="tooltip-content"]');
  await expect(content).toBeVisible();
  await expect(content.locator("canvas")).toHaveAttribute(
    "data-mc-tooltip-painted",
    "false"
  );
  const clip = (await content.boundingBox())!;
  const shown = PNG.sync.read(await page.screenshot({ clip }));
  await content.evaluate((node) => {
    node.style.visibility = "hidden";
  });
  const hidden = PNG.sync.read(await page.screenshot({ clip }));
  const transparentBand = shown.width * 16 * 4;
  expect(
    shown.data
      .subarray(0, transparentBand)
      .equals(hidden.data.subarray(0, transparentBand))
  ).toBe(true);
  expect(
    [...hidden.data.subarray(0, transparentBand)].some(
      (value, index) => index % 4 !== 3 && value !== 32
    ),
    "The case must include a visible control behind the transparent padding"
  ).toBe(true);
});

test("Button label editor accepts CJK text without stripping characters", async ({
  page,
}) => {
  await page.goto(`${origin}docs/components/button`);

  for (const label of ["你好，世界", "こんにちは世界", "안녕하세요 세계"]) {
    await page
      .locator(".documentation-playground")
      .getByLabel("Button label", { exact: true })
      .fill(label);
    await expect(
      page
        .locator(".documentation-playground")
        .getByLabel("Button label", { exact: true })
    ).toHaveValue(label);

    const button = page
      .locator(
        '.documentation-playground [data-stage="button"] [data-slot="button"]'
      )
      .first();

    await expect(button).toHaveAccessibleName(label);
    await expect(button.locator("[data-mc-label-ready]")).toHaveAttribute(
      "data-mc-label-ready",
      "true"
    );
  }
});

test("Text entry defaults disable browser spelling and correction", async ({
  page,
}) => {
  test.setTimeout(120_000);

  for (const component of catalog.components) {
    await page.goto(`${origin}docs/components/${component.name}`);

    for (const field of await page
      .locator('input[data-slot="input"], textarea[data-slot="textarea"]')
      .all()) {
      await expect(field).toHaveAttribute("spellcheck", "false");
      await expect(field).toHaveAttribute("autocorrect", "off");
    }
  }
});

test("Dialog preview supports editable CJK titles, multiline messages and footer actions", async ({
  page,
}) => {
  await page.goto(`${origin}docs/components/dialog`);
  await page
    .locator(".documentation-playground")
    .getByRole("textbox", { exact: true, name: "Dialog title" })
    .fill("你好，世界");
  await page
    .locator(".documentation-playground")
    .getByRole("textbox", { exact: true, name: "Dialog message" })
    .fill("Hello 世界\nこんにちは");

  const trigger = page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Open world settings" });

  await trigger.click();
  const dialog = page.getByRole("dialog", { exact: true, name: "你好，世界" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleDescription("Hello 世界 こんにちは");

  for (const line of await dialog
    .locator("[data-mc-dialog-unicode-ready]")
    .all()) {
    await expect(line).toHaveAttribute("data-mc-dialog-unicode-ready", "true");
  }

  await dialog.getByRole("button", { exact: true, name: "Continue" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.locator(".documentation-playground").getByLabel("Dialog confirmations")
  ).toHaveText("Confirmed 1 time");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { exact: true, name: "Cancel" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.locator(".documentation-playground").getByLabel("Dialog confirmations")
  ).toHaveText("Confirmed 1 time");
});

test("Alert Dialog preview supports CJK text, native blur, confirmation and cancellation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}docs/components/alert-dialog`);
  await page
    .locator(".documentation-playground")
    .getByRole("textbox", { exact: true, name: "Alert dialog title" })
    .fill("你好，世界");
  await page
    .locator(".documentation-playground")
    .getByRole("textbox", { exact: true, name: "Alert dialog message" })
    .fill("こんにちは\n안녕하세요");

  const trigger = page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Open confirmation" });

  await trigger.click();

  const dialog = page.getByRole("alertdialog", {
    name: "你好，世界",
  });

  await expect(dialog).toHaveAccessibleDescription("こんにちは 안녕하세요");
  await expect(dialog.locator("[data-mc-label-ready]")).toHaveCount(3, {
    timeout: 15_000,
  });

  for (const line of await dialog.locator("[data-mc-label-ready]").all()) {
    await expect(line).toHaveAttribute("data-mc-label-ready", "true");
  }

  await expect(
    page.locator('[data-slot="alert-dialog-overlay"]')
  ).toHaveAttribute("data-mc-confirmation-gpu-ready", "true", {
    timeout: 15_000,
  });
  await dialog.getByRole("button", { exact: true, name: "Yes" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Alert dialog confirmations", { exact: true })
  ).toHaveText("Confirmed 1 time");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { exact: true, name: "No" })
    .click();
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Alert dialog confirmations", { exact: true })
  ).toHaveText("Confirmed 1 time");
  expect(errors).toEqual([]);
});

test("Editable, read-only and disabled textarea examples render real line breaks", async ({
  page,
}) => {
  await page.goto(`${origin}docs/components/textarea`);

  for (const name of [
    "Demo textarea",
    "Read-only demo textarea",
    "Disabled demo textarea",
  ]) {
    const field = page
      .locator(".documentation-playground")
      .getByRole("textbox", { exact: true, name });

    await expect(field).toHaveValue("Line one\nLine two\nLine three");
    await expect(field).toHaveAttribute("data-mc-ready", "true");
    await expect(field).toHaveAttribute("data-mc-bitmap", "true");
  }

  await page.getByRole("heading", { exact: true, name: "Textarea" }).click();

  const images = await page
    .locator('[data-stage="textarea"] textarea')
    .evaluateAll((nodes: HTMLElement[]) =>
      nodes.map((node) => node.style.getPropertyValue("--mc-textarea-image"))
    );

  expect(images).toHaveLength(3);
  expect(images[0]).not.toBe("");
  expect(images[1]).toBe(images[0]);
  expect(images[2]).toBe(images[0]);
});

test("Tabs preview supports keyboard navigation, CJK titles and settings", async ({
  page,
}) => {
  await page.goto(`${origin}docs/components/tabs`);

  const world = page
    .locator(".documentation-playground")
    .getByRole("tab", { exact: true, name: "World" });

  await page
    .locator(".documentation-playground")
    .getByLabel("Tabs world name", { exact: true })
    .fill("我的世界");
  await world.click();
  await expect(world).toHaveAttribute("aria-selected", "true");
  await page
    .locator(".documentation-playground")
    .getByRole("checkbox", { exact: true, name: "Generate structures" })
    .uncheck();
  await page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "More tab: Enabled" })
    .click();
  await world.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page
      .locator(".documentation-playground")
      .getByRole("tab", { exact: true, name: "More" })
  ).toBeFocused();
  await expect(world).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight");
  await expect(
    page
      .locator(".documentation-playground")
      .getByRole("tab", { exact: true, name: "Game" })
  ).toBeFocused();
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Tabs world name", { exact: true })
  ).toHaveValue("我的世界");
  await page
    .locator(".documentation-playground")
    .getByLabel("First tab title", { exact: true })
    .fill("你好，世界");

  const renamed = page
    .locator(".documentation-playground")
    .getByRole("tab", { exact: true, name: "你好，世界" });

  await expect(renamed.locator("[data-mc-label-ready]")).toHaveAttribute(
    "data-mc-label-ready",
    "true"
  );
  await expect(renamed).toHaveAttribute("aria-selected", "true");
});

test("Select preview supports CJK labels, disabled choices and keyboard selection", async ({
  page,
}) => {
  await page.goto(`${origin}docs/components/select`);

  const trigger = page
    .locator(".documentation-playground")
    .getByRole("combobox", { exact: true, name: "Demo game mode" });

  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("option", { exact: true, name: "Survival" })
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("option", { exact: true, name: "Creative" })
  ).toBeFocused();
  await expect(
    page.getByRole("option", { exact: true, name: "Creative" })
  ).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("option", { exact: true, name: "Adventure" })
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Selected preview game mode", { exact: true })
  ).toHaveText("Adventure");
  await page
    .locator(".documentation-playground")
    .getByLabel("First select option", { exact: true })
    .fill("你好，世界");
  await trigger.click();
  await page.keyboard.press("Home");
  await expect(
    page.getByRole("option", { exact: true, name: "你好，世界" })
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveText("你好，世界");
  await expect(trigger.locator("[data-mc-label-ready]")).toHaveAttribute(
    "data-mc-label-ready",
    "true"
  );
  await page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Select: Enabled" })
    .click();
  await expect(trigger).toBeDisabled();
  await page
    .locator(".documentation-playground")
    .getByRole("combobox", { exact: true, name: "Empty game mode" })
    .click();
  await page.getByRole("option", { exact: true, name: "Creative" }).click();
  await expect(
    page
      .locator(".documentation-playground")
      .getByRole("combobox", { exact: true, name: "Empty game mode" })
  ).toHaveText("Creative");
});

test("Radio Group preview supports exclusive selection, CJK labels and disabled groups", async ({
  page,
}) => {
  await page.goto(`${origin}docs/components/radio-group`);

  const group = page
    .locator(".documentation-playground")
    .getByRole("radiogroup", { exact: true, name: "Demo radio game mode" });

  await group.getByRole("radio", { exact: true, name: "Adventure" }).click();
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Selected radio game mode", { exact: true })
  ).toHaveText("Adventure");
  await page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Clear choice" })
    .click();
  await expect(group.getByRole("radio", { checked: true })).toHaveCount(0);
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Selected radio game mode", { exact: true })
  ).toHaveText("No choice");
  await page
    .locator(".documentation-playground")
    .getByLabel("First radio choice", { exact: true })
    .fill("你好，世界");
  await expect(group.locator("[data-mc-label-ready]")).toHaveAttribute(
    "data-mc-label-ready",
    "true"
  );
  await group.getByRole("radio", { exact: true, name: "你好，世界" }).click();
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Selected radio game mode", { exact: true })
  ).toHaveText("你好，世界");
  await page.keyboard.down("ArrowDown");

  try {
    await expect(
      group.getByRole("radio", { exact: true, name: "Creative" })
    ).toBeChecked();
  } finally {
    await page.keyboard.up("ArrowDown");
  }

  await expect(group.getByRole("radio", { checked: true })).toHaveCount(1);
  await page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Group: Enabled" })
    .click();

  for (const radio of await group.getByRole("radio").all()) {
    await expect(radio).toBeDisabled();
  }
});

test("Switch preview supports CJK labels, keyboard toggling and disabled state", async ({
  page,
}) => {
  await page.goto(`${origin}docs/components/switch`);

  const control = page
    .locator(".documentation-playground")
    .getByRole("switch", { exact: true, name: "Enable clouds" });

  await control.click();
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Switch setting value", { exact: true })
  ).toHaveText("ON");
  await page.keyboard.press("Space");
  await expect(control).not.toBeChecked();
  await page
    .locator(".documentation-playground")
    .getByLabel("Switch setting label", { exact: true })
    .fill("你好，世界");
  await expect(
    page.locator(".documentation-playground [data-mc-label-ready]")
  ).toHaveAttribute("data-mc-label-ready", "true");

  const renamed = page
    .locator(".documentation-playground")
    .getByRole("switch", { exact: true, name: "你好，世界" });

  await renamed.click();
  await expect(renamed).toBeChecked();
  await page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Switch: Enabled" })
    .click();
  await expect(renamed).toBeDisabled();
  await expect(
    page
      .locator(".documentation-playground")
      .getByRole("switch", { exact: true, name: "Locked setting" })
  ).toBeDisabled();
});

test("Popover preview supports editable CJK text, world settings and dismissal", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}docs/components/popover`);
  await page
    .locator(".documentation-playground")
    .getByRole("textbox", { exact: true, name: "Popover title" })
    .fill("你好，世界");
  await page
    .locator(".documentation-playground")
    .getByRole("textbox", { exact: true, name: "Popover message" })
    .fill("こんにちは\n안녕하세요");

  const trigger = page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Open world options" });

  await trigger.click();
  const dialog = page.getByRole("dialog", { exact: true, name: "你好，世界" });
  await expect(dialog).toHaveAccessibleDescription("こんにちは 안녕하세요");
  await expect(
    dialog.locator('[data-mc-popover-text-ready="false"]')
  ).toHaveCount(0);
  expect(
    await dialog.locator("[data-mc-popover-unicode-ready]").count()
  ).toBeGreaterThan(0);

  for (const line of await dialog
    .locator("[data-mc-popover-unicode-ready]")
    .all()) {
    await expect(line).toHaveAttribute("data-mc-popover-unicode-ready", "true");
  }

  await dialog
    .getByRole("textbox", { exact: true, name: "World name" })
    .fill("我的世界");
  await dialog.getByRole("button", { exact: true, name: "Done" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page
      .locator(".documentation-playground")
      .getByLabel("Popover status", { exact: true })
  ).toHaveText("World settings saved");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(
    dialog.getByRole("textbox", { exact: true, name: "World name" })
  ).toHaveValue("我的世界");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(errors).toEqual([]);
});
