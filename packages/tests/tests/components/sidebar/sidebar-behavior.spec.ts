import { writeFileSync } from "node:fs";

import { test, expect } from "@grasscn/tests/test";
import { minecraftClickSound } from "@grasscn/web/ui/minecraft-sound-assets";
import type { RecordedPitchedPlayback } from "@tests/harness/audio-playback";

interface SidebarClickAudioState {
  sounds: RecordedPitchedPlayback[];
}

interface SidebarPreventedAudioState {
  sounds: number;
}

const runtimeErrors = new WeakMap<object, string[]>();

test.beforeEach(({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});

test.afterEach(({ page, browser }, info) => {
  writeFileSync(
    info.outputPath("browser-version.json"),
    JSON.stringify({ version: browser.version() })
  );
  const errors = runtimeErrors.get(page) ?? [];
  writeFileSync(info.outputPath("page-errors.json"), JSON.stringify(errors));
  expect(errors).toEqual([]);
});

test("Sidebar preserves desktop toggling, keyboard shortcut and persisted actual state", async ({
  page,
}) => {
  await page.goto("/?component=sidebar");
  await expect(page.locator("#state")).toHaveText("expanded");
  await expect(page.locator("#toggle")).toHaveAttribute(
    "aria-expanded",
    "true"
  );
  await page.locator("#toggle").click();
  await expect(page.locator("#state")).toHaveText("collapsed");
  await expect(page.locator("#toggle")).toHaveAttribute(
    "aria-expanded",
    "false"
  );
  expect(
    (await page.context().cookies()).find((c) => c.name === "sidebar_state")
      ?.value
  ).toBe("false");
  await page.keyboard.press("Control+b");
  await expect(page.locator("#state")).toHaveText("expanded");
  await page.locator("#external").click();
  await expect(page.locator("#state")).toHaveText("collapsed");
});

test("Sidebar controlled state accepts changes and honors rejection", async ({
  page,
}) => {
  await page.goto("/?component=sidebar&controlled=1");
  await page.locator("#toggle").click();
  await expect(page.locator("#state")).toHaveText("collapsed");
  await page.goto("/?component=sidebar&controlled=1&reject=1");
  await page.locator("#toggle").click();
  await expect(page.locator("#state")).toHaveText("expanded");
  await expect(page.locator("#events")).toHaveText("1");
  expect(
    (await page.context().cookies()).find((c) => c.name === "sidebar_state")
      ?.value
  ).toBe("true");
});

test("Sidebar functional updates do not lose synchronous toggles", async ({
  page,
}) => {
  await page.goto("/?component=sidebar");
  await page.locator("#double").click();
  await expect(page.locator("#state")).toHaveText("expanded");
  await expect(page.locator("#events")).toHaveText("2");
});

test("Sidebar icon collapse preserves accessible names and optional tooltip", async ({
  page,
}) => {
  await page.goto("/?component=sidebar");
  await page.locator("#toggle").click();
  const button = page.getByRole("button", { exact: true, name: "Worlds" });
  await expect(button).toHaveAttribute("aria-current", "page");
  await expect(button).toContainText("W");
  await expect(
    page.getByRole("textbox", { name: "Search worlds" })
  ).toBeHidden();
  await expect(
    page.getByRole("link", { exact: true, name: "Survival" })
  ).toBeHidden();
  await button.hover();
  await expect(page.locator('[data-slot="tooltip-content"]')).toContainText(
    "Worlds"
  );
  await page.mouse.move(800, 800, { steps: 5 });
  await expect(page.locator('[data-slot="tooltip-content"]')).toHaveCount(0);
});

test("Sidebar offcanvas collapse removes hidden controls from focus and none mode stays visible", async ({
  page,
}) => {
  await page.goto("/?component=sidebar&mode=offcanvas");
  await page.locator("#toggle").click();
  await expect(
    page.getByRole("textbox", { name: "Search worlds" })
  ).toBeHidden();
  await expect(page.locator('[data-slot="sidebar-container"]')).toHaveAttribute(
    "inert",
    ""
  );
  await page.goto("/?component=sidebar&mode=none");
  await page.locator("#toggle").click();
  await expect(
    page.getByRole("textbox", { name: "Search worlds" })
  ).toBeVisible();
});

test("Sidebar right-side positioning reserves the matching inset space", async ({
  page,
}) => {
  await page.goto("/?component=sidebar&side=right");

  const provider = (await page
    .locator('[data-slot="sidebar-wrapper"]')
    .boundingBox())!;

  const container = (await page
    .locator('[data-slot="sidebar-container"]')
    .boundingBox())!;

  const inset = (await page
    .locator('[data-slot="sidebar-inset"]')
    .boundingBox())!;

  expect(container.x + container.width).toBe(provider.x + provider.width);
  expect(inset.x + inset.width).toBe(container.x);
});

test("Sidebar mobile sheet traps focus and restores the opening trigger after Escape", async ({
  page,
}) => {
  await page.setViewportSize({ height: 812, width: 375 });
  await page.goto("/?component=sidebar");
  await expect(page.locator("#mobile")).toHaveText("true");
  await page.locator("#toggle").click();
  const dialog = page.getByRole("dialog", { exact: true, name: "Sidebar" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("textbox", { name: "Search worlds" })
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("#toggle")).toBeFocused();
});

test("Sidebar mobile backdrop closes and a desktop containment style cannot move the modal offscreen", async ({
  page,
}) => {
  await page.setViewportSize({ height: 812, width: 375 });
  await page.goto("/?component=sidebar");
  await expect(page.locator("#mobile")).toHaveText("true");
  await page.locator("#toggle").click();
  const dialog = page.getByRole("dialog", { exact: true, name: "Sidebar" });
  expect((await dialog.boundingBox())!.y).toBe(0);
  await page.mouse.click(365, 10);
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("#open-mobile")).toHaveText("false");
});

test("Sidebar menu links, DOM refs, active state and disabled render guards remain usable", async ({
  page,
}) => {
  await page.goto("/?component=sidebar");
  await page.locator("#read-ref").click();
  await expect(page.locator("#refs")).toHaveText("BUTTON/A/INPUT/DIV");
  await expect(page.locator("#menu-worlds")).toHaveAttribute(
    "aria-current",
    "page"
  );
  await page.locator("#settings").click();
  await expect(page.locator("#events")).toHaveText("1");
  expect(new URL(page.url()).hash).toBe("#settings");
  await page.locator("#disabled").dispatchEvent("click");
  await expect(page.locator("#events")).toHaveText("1");
  expect(new URL(page.url()).hash).toBe("#settings");
});

test("Sidebar input defaults suppress spelling/correction and preserve controlled CJK editing", async ({
  page,
}) => {
  await page.goto("/?component=sidebar");
  const input = page.getByRole("textbox", { name: "Search worlds" });
  await expect(input).toHaveAttribute("spellcheck", "false");
  await expect(input).toHaveAttribute("autocorrect", "off");
  await input.fill("兄弟们 こんにちは");
  await expect(page.locator("#value")).toHaveText("兄弟们 こんにちは");
  await expect(input).toHaveAttribute("data-mc-ready", "true");
  await expect(input).toHaveAttribute("data-mc-bitmap", "true");
});

test("Sidebar content uses original scrolling geometry and forwards scroll events", async ({
  page,
}) => {
  await page.goto("/?component=sidebar&long=1");
  const content = page.locator('[data-slot="sidebar-content"]');
  await expect(content).toHaveAttribute("data-scrollable", "true");
  const viewport = content.locator('[data-slot="scroll-area-viewport"]');
  await viewport.hover();
  await page.mouse.wheel(0, 500);
  await expect
    .poll(async () => viewport.evaluate((node) => node.scrollTop))
    .toBeGreaterThan(0);
  await expect
    .poll(async () =>
      Number(await page.locator("#scroll-events").textContent())
    )
    .toBeGreaterThan(0);
});

test("Sidebar skeleton is deterministic and optional action placement does not change menu flow", async ({
  page,
}) => {
  await page.goto("/?component=sidebar");
  await expect(
    page.locator('[data-slot="sidebar-menu-skeleton"]')
  ).toHaveAttribute("aria-busy", "true");

  const action = (await page
    .getByRole("button", { exact: true, name: "World actions" })
    .boundingBox())!;

  const button = (await page.locator("#menu-worlds").boundingBox())!;

  expect(action.y).toBe(button.y);
  expect(action.x).toBeGreaterThan(button.x);
});

test("Sidebar uses the original click sound once per accepted native-button action", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // SAFETY: This init script owns this test document's pitched-playback trace and creates its empty array before installing play.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact per-test browser state initialized by the paired addInitScript.
    (window as typeof window & SidebarClickAudioState).sounds = [];
    HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) {
      // SAFETY: The same test initializer creates this trace; the unchanged play mock appends pitch, source and volume from its media receiver.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact per-test browser state initialized by the paired addInitScript.
      (window as typeof window & SidebarClickAudioState).sounds.push({
        pitch: this.playbackRate,
        source: this.src,
        volume: this.volume,
      });

      return Promise.resolve();
    };
  });
  await page.goto("/?component=sidebar");
  await page.locator("#menu-worlds").hover();
  expect(
    await page.evaluate(
      () =>
        // SAFETY: This paired reader runs after navigation initializes the pitched-playback trace; no other state shape is asserted here.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact per-test browser state initialized by the paired addInitScript.
        (window as typeof window & SidebarClickAudioState).sounds
    )
  ).toEqual([]);
  await page.locator("#menu-worlds").click();
  await page.locator("#toggle").click();
  expect(
    await page.evaluate(
      () =>
        // SAFETY: This paired reader runs after navigation initializes the pitched-playback trace; no other state shape is asserted here.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact per-test browser state initialized by the paired addInitScript.
        (window as typeof window & SidebarClickAudioState).sounds
    )
  ).toEqual([
    { pitch: 1, source: minecraftClickSound, volume: 0.25 },
    { pitch: 1, source: minecraftClickSound, volume: 0.25 },
  ]);
  await page.locator("#disabled").dispatchEvent("click");
  expect(
    (
      await page.evaluate(
        () =>
          // SAFETY: This paired reader runs after navigation initializes the pitched-playback trace; no other state shape is asserted here.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact per-test browser state initialized by the paired addInitScript.
          (window as typeof window & SidebarClickAudioState).sounds
      )
    ).length
  ).toBe(2);
  await page.keyboard.press("Control+b");
  expect(
    (
      await page.evaluate(
        () =>
          // SAFETY: This paired reader runs after navigation initializes the pitched-playback trace; no other state shape is asserted here.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact per-test browser state initialized by the paired addInitScript.
          (window as typeof window & SidebarClickAudioState).sounds
      )
    ).length
  ).toBe(2);
});

test("Sidebar prevented trigger activation stays silent and does not change state", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // SAFETY: This separate init script owns a numeric play counter and initializes it before installing its counter-only mock.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact per-test browser state initialized by the paired addInitScript.
    (window as typeof window & SidebarPreventedAudioState).sounds = 0;
    HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) {
      // SAFETY: This test initializes sounds to0; the unchanged mock increments that numeric counter once per play invocation.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact per-test browser state initialized by the paired addInitScript.
      (window as typeof window & SidebarPreventedAudioState).sounds += 1;

      return Promise.resolve();
    };
  });
  await page.goto("/?component=sidebar&native=1&part=trigger&cancel=1");
  const button = page.locator("[data-subject]");
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  expect(
    await page.evaluate(
      () =>
        // SAFETY: This paired reader runs after navigation initializes this test's numeric play counter; no playback-array contract is assumed.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact per-test browser state initialized by the paired addInitScript.
        (window as typeof window & SidebarPreventedAudioState).sounds
    )
  ).toBe(0);
});
