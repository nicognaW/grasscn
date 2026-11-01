import { test, expect } from "@grasscn/tests/test";
import { minecraftClickSound } from "@grasscn/web/ui/minecraft-sound-assets";

test("Aspect Ratio preserves exact box geometry at 1:1, 4:3 and 16:9", async ({
  page,
}) => {
  /* oxlint-disable no-await-in-loop -- Variants navigate and exercise one shared page; finish each variant before the next navigation. */
  for (const ratio of [1, 4 / 3, 16 / 9]) {
    for (const width of [160, 320, 640]) {
      await page.goto(
        `/?component=aspect-ratio&ratio=${ratio}&containerWidth=${width}`
      );
      const node = page.locator("#ratio");
      await expect(node).toHaveAttribute("data-slot", "aspect-ratio");
      await expect(node).toHaveAttribute("data-ref", "true");
      const rect = (await node.boundingBox())!;
      expect(rect.width).toBe(width);
      expect(rect.height).toBeCloseTo(width / ratio, 1);
      const art = (await page.locator("#art").boundingBox())!;
      expect([art.width, art.height]).toEqual([40, 40]);
    }
  }
  /* oxlint-enable no-await-in-loop */
});

test("Aspect Ratio supports explicit clipping without resampling its content", async ({
  page,
}) => {
  await page.goto(
    "/?component=aspect-ratio&ratio=16&containerWidth=160&clip=1"
  );
  expect(
    await page
      .locator("#ratio")
      .evaluate((node) => getComputedStyle(node).overflow)
  ).toBe("hidden");
  const art = (await page.locator("#art").boundingBox())!;
  expect([art.width, art.height]).toEqual([40, 40]);
  const box = (await page.locator("#ratio").boundingBox())!;
  expect(box.height).toBe(10);
});

test("Button Group preserves horizontal/vertical geometry and independent activations", async ({
  page,
}) => {
  /* oxlint-disable no-await-in-loop -- Variants navigate and exercise one shared page; finish each variant before the next navigation. */
  for (const orientation of ["horizontal", "vertical"]) {
    await page.goto(`/?component=button-group&orientation=${orientation}`);
    const group = page.getByRole("group", { name: "Game actions" });
    await expect(group).toHaveAttribute("data-orientation", orientation);

    const first = (await page.locator("[data-subject]").boundingBox())!;

    const last = (await group
      .getByRole("button", { exact: true, name: "Next" })
      .boundingBox())!;

    expect(
      orientation === "horizontal" ? last.x > first.x : last.y > first.y
    ).toBe(true);
    await page.locator("[data-subject]").click();
    await group.getByRole("button", { exact: true, name: "Next" }).click();
    await expect(page.locator("#events")).toHaveText("2");
    await expect(group.getByRole("separator")).toHaveAttribute(
      "aria-orientation",
      "vertical"
    );
    await expect(page.locator("#slotted")).toHaveAttribute(
      "data-slot",
      "button-group-text"
    );
    await expect(page.locator("#variant")).toHaveClass(
      /mc-button-group-vertical/
    );
  }
  /* oxlint-enable no-await-in-loop */
});

test("Button Group disabled buttons stay disabled and keyboard focus stays independent", async ({
  page,
}) => {
  await page.goto("/?component=button-group&state=disabled");
  await expect(page.locator("[data-subject]")).toBeDisabled();
  await page.locator("[data-subject]").dispatchEvent("click");
  await expect(page.locator("#events")).toHaveText("0");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { exact: true, name: "Next" })
  ).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.locator("#events")).toHaveText("1");
});

test("Pagination preserves navigation, anchors, refs, active state and keyboard activation", async ({
  page,
}) => {
  await page.goto("/?component=pagination&active=1");
  await expect(
    page.getByRole("navigation", { name: "World pages" })
  ).toBeVisible();
  await expect(page.locator("[data-subject]")).toHaveAttribute(
    "aria-current",
    "page"
  );
  await expect(
    page.getByRole("link", { name: "Go to previous page" })
  ).toHaveAttribute("href", "#previous");
  await expect(
    page.getByRole("link", { name: "Go to next page" })
  ).toHaveAttribute("href", "#next");
  await page.locator("[data-subject]").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#events")).toHaveText("1");
  await expect(page.locator("#page")).toHaveText("2");
  await page.locator("#read-ref").click();
  await expect(page.locator("#tag")).toHaveText("A");
  await expect(
    page.locator('[data-slot="pagination-ellipsis"]')
  ).toHaveAttribute("aria-hidden", "true");
});

test("Pagination cancellation and disabled links prevent activation and navigation", async ({
  page,
}) => {
  /* oxlint-disable no-await-in-loop -- Variants navigate and exercise one shared page; finish each variant before the next navigation. */
  for (const suffix of ["cancel=1", "state=disabled"]) {
    await page.goto(`/?component=pagination&${suffix}`);
    await page.locator("[data-subject]").dispatchEvent("click");
    await expect(page.locator("#events")).toHaveText("0");
    expect(new URL(page.url()).hash).toBe("");
  }
  /* oxlint-enable no-await-in-loop */
});

test("Pagination uses original audio once per accepted action and stays silent when canceled", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).sounds = [];
    HTMLMediaElement.prototype.play = function play() {
      (window as any).sounds.push({
        pitch: this.playbackRate,
        source: this.src,
        volume: this.volume,
      });

      return Promise.resolve();
    };
  });
  await page.goto("/?component=pagination");
  await page.locator("[data-subject]").hover();
  await page.locator("[data-subject]").focus();
  expect(await page.evaluate(() => (window as any).sounds)).toEqual([]);
  await page.locator("[data-subject]").click();
  expect(await page.evaluate(() => (window as any).sounds)).toEqual([
    { pitch: 1, source: minecraftClickSound, volume: 0.25 },
  ]);

  /* oxlint-disable no-await-in-loop -- Variants navigate and exercise one shared page; finish each variant before the next navigation. */
  for (const suffix of ["cancel=1", "state=disabled"]) {
    await page.goto(`/?component=pagination&${suffix}`);
    await page.locator("[data-subject]").dispatchEvent("click");
    expect(await page.evaluate(() => (window as any).sounds)).toEqual([]);
  }
  /* oxlint-enable no-await-in-loop */
});

test("Pagination original arrows retain native links and keyboard activation with original click audio", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).sounds = [];
    HTMLMediaElement.prototype.play = function play() {
      (window as any).sounds.push({
        pitch: this.playbackRate,
        source: this.src,
        volume: this.volume,
      });

      return Promise.resolve();
    };
  });

  /* oxlint-disable no-await-in-loop -- Variants navigate and exercise one shared page; finish each variant before the next navigation. */
  for (const forward of [false, true]) {
    await page.goto(`/?component=pagination&part=arrow&checked=${forward}`);

    const arrow = page.getByRole("link", {
      name: forward ? "Go to next page" : "Go to previous page",
    });

    await expect(arrow).toHaveAttribute("href", "#next");
    await arrow.hover();
    await arrow.focus();
    expect(await page.evaluate(() => (window as any).sounds)).toEqual([]);
    await page.keyboard.press("Enter");
    expect(new URL(page.url()).hash).toBe("#next");
    expect(await page.evaluate(() => (window as any).sounds)).toEqual([
      { pitch: 1, source: minecraftClickSound, volume: 0.25 },
    ]);
  }
  /* oxlint-enable no-await-in-loop */
});

test("Pagination original arrows preserve custom content and cancel disabled or prevented actions", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).sounds = [];
    HTMLMediaElement.prototype.play = function play() {
      (window as any).sounds.push(this.src);

      return Promise.resolve();
    };
  });

  /* oxlint-disable no-await-in-loop -- Variants navigate and exercise one shared page; finish each variant before the next navigation. */
  for (const suffix of ["cancel=1", "state=disabled"]) {
    await page.goto(`/?component=pagination&part=arrow&text=World&${suffix}`);
    const arrow = page.locator("[data-subject]");
    await expect(arrow).toContainText("World");
    await arrow.dispatchEvent("click");
    expect(new URL(page.url()).hash).toBe("");
    expect(await page.evaluate(() => (window as any).sounds)).toEqual([]);
  }
  /* oxlint-enable no-await-in-loop */
});
