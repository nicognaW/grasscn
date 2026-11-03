import { expectNotNull } from "@grasscn/tests/assertions";
import { test, expect } from "@grasscn/tests/test";
import type { Page } from "@grasscn/tests/test";
import type { Layout } from "react-resizable-panels";

interface ResizablePlaybackState extends Window {
  sounds?: number;
}

type InitializedResizablePlaybackState = typeof window &
  ResizablePlaybackState & {
    sounds: number;
  };

const layoutLeft = async function layoutLeft(page: Page) {
  const text = await page.locator("#layout").textContent();

  if (text === null) {
    throw new Error("Resizable layout text is missing");
  }

  // SAFETY: the fixture serializes the actual panel-group layout for the authored left/right panel IDs.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Real resizable-panel Layout producer.
  return (JSON.parse(text) as Layout).left;
};

const verifyResizableOrientation = async (page: Page, orientation: string) => {
  await page.goto(`/?component=resizable&orientation=${orientation}`);

  const group = page.locator("#group");
  const handle = page.getByRole("separator", { name: "Resize panels" });

  await expect(group).toHaveAttribute("data-slot", "resizable-panel-group");
  await expect(handle).toHaveAttribute(
    "aria-orientation",
    orientation === "horizontal" ? "vertical" : "horizontal"
  );
  await expect(handle).toHaveAttribute("aria-valuenow", "50");

  const left = await page.locator("#left").boundingBox();
expectNotNull(left, "Missing required bounding box: left");
  const right = await page.locator("#right").boundingBox();
expectNotNull(right, "Missing required bounding box: right");

  expect(
    orientation === "horizontal" ? right.x > left.x : right.y > left.y
  ).toBe(true);
};

const verifyDisabledResizable = async (page: Page, disabled: string) => {
  await page.goto(`/?component=resizable&${disabled}=1`);
  const handle = page.getByRole("separator", { name: "Resize panels" });
  const before = await handle.getAttribute("aria-valuenow");
  await handle.focus();
  await page.keyboard.press("ArrowRight");
  expect(await handle.getAttribute("aria-valuenow")).toBe(before);
};

test("Resizable preserves horizontal and vertical geometry and standard separator semantics", async ({
  page,
}) => {
  for (const orientation of ["horizontal", "vertical"]) {
    await verifyResizableOrientation(page, orientation);
  }
});

test("Resizable responds to pointer dragging and reports layouts", async ({
  page,
}) => {
  await page.goto("/?component=resizable");
  const handle = page.getByRole("separator", { name: "Resize panels" });
  const box = await handle.boundingBox();
expectNotNull(box, "Missing required bounding box: box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2, {
    steps: 6,
  });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await handle.getAttribute("aria-valuenow")))
    .toBeGreaterThan(50);
  await expect.poll(() => layoutLeft(page)).toBeGreaterThan(50);
});

test("Resizable supports keyboard arrows and Home/End constraints", async ({
  page,
}) => {
  await page.goto("/?component=resizable");
  const handle = page.getByRole("separator", { name: "Resize panels" });
  await handle.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(async () => Number(await handle.getAttribute("aria-valuenow")))
    .toBeGreaterThan(50);
  await page.keyboard.press("Home");
  await expect
    .poll(async () => Number(await handle.getAttribute("aria-valuenow")))
    .toBeLessThanOrEqual(10);
  await page.keyboard.press("End");
  await expect
    .poll(async () => Number(await handle.getAttribute("aria-valuenow")))
    .toBeGreaterThanOrEqual(85);
});

test("Resizable supports vertical keyboard operation", async ({ page }) => {
  await page.goto("/?component=resizable&orientation=vertical");
  const handle = page.getByRole("separator", { name: "Resize panels" });
  await handle.focus();
  await page.keyboard.press("ArrowDown");
  await expect
    .poll(async () => Number(await handle.getAttribute("aria-valuenow")))
    .toBeGreaterThan(50);
});

test("Resizable forwards imperative panel/group refs and element refs", async ({
  page,
}) => {
  await page.goto("/?component=resizable");
  await page.locator("#read-ref").click();
  await expect(page.locator("#refs")).toHaveText("DIV/DIV/left,right");
  await page.locator("#set-layout").click();
  await expect.poll(() => layoutLeft(page)).toBeCloseTo(25, 0);
  await page.locator("#resize").click();
  await expect.poll(() => layoutLeft(page)).toBeCloseTo(35, 0);
  await page.locator("#collapse").click();
  await expect.poll(() => layoutLeft(page)).toBe(0);
  await page.locator("#expand").click();
  await expect.poll(() => layoutLeft(page)).toBeGreaterThan(0);
});

test("Resizable honors disabled separators and disabled groups", async ({
  page,
}) => {
  for (const disabled of ["disabled", "groupDisabled"]) {
    await verifyDisabledResizable(page, disabled);
  }
});

test("Resizable preserves optional grip and never synthesizes interaction audio", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // SAFETY: this write installs the actual recorder field on the new page; it is optional before this producer assignment.
    (window as ResizablePlaybackState).sounds = 0;
    HTMLMediaElement.prototype.play = function play() {
      // SAFETY: this page init script assigns the exact recorder before installing playback; the callback and post-navigation observations read that initialized field without changing any lookup.
      // oxlint-disable typescript/no-unsafe-type-assertion -- Exact initialized page-local playback recorder protocol; preserve original field reads and resets.
      (window as InitializedResizablePlaybackState).sounds += 1;
      // oxlint-enable typescript/no-unsafe-type-assertion

      return Promise.resolve();
    };
  });
  await page.goto("/?component=resizable&noHandle=1");
  await expect(page.locator('[data-slot="resizable-grip"]')).toHaveCount(0);
  const handle = page.getByRole("separator", { name: "Resize panels" });
  await handle.focus();
  await page.keyboard.press("ArrowRight");
  // SAFETY: this page init script assigns the exact recorder before installing playback; the callback and post-navigation observations read that initialized field without changing any lookup.
  // oxlint-disable typescript/no-unsafe-type-assertion -- Exact initialized page-local playback recorder protocol; preserve original field reads and resets.
  expect(
    await page.evaluate(
      () => (window as InitializedResizablePlaybackState).sounds
    )
  ).toBe(0);
  // oxlint-enable typescript/no-unsafe-type-assertion
});

for (const orientation of ["horizontal", "vertical"]) {
  test(`Resizable ${orientation} grip arrows agree with resize direction`, async ({
    page,
  }) => {
    await page.goto(`/?component=resizable&orientation=${orientation}`);

    const handle = page.getByRole("separator", { name: "Resize panels" });
    const arrow = handle.locator("[data-slot=resizable-arrow]").first();
    const bounds = await arrow.boundingBox();
expectNotNull(bounds, "Missing required bounding box: bounds");

    expect(bounds.width < bounds.height).toBe(orientation === "horizontal");
    expect(await handle.evaluate((node) => getComputedStyle(node).cursor)).toBe(
      orientation === "horizontal" ? "col-resize" : "row-resize"
    );
    await handle.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    expect(
      await handle
        .locator("[data-slot=resizable-grip]")
        .evaluate((node) => getComputedStyle(node).outlineStyle)
    ).toBe("solid");
  });
}
