import { test, expect } from "@grasscn/tests/test";
import { minecraftClickSound } from "@grasscn/web/ui/minecraft-sound-assets";
import type { Page } from "@playwright/test";

interface ItemAudioPlayback {
  rate: number;
  src: string;
  volume: number;
}

interface ItemAudioState {
  sounds: ItemAudioPlayback[];
}

const ready = async function ready(page: Page) {
  await expect(
    page.locator("[data-subject] [data-slot=item-content]")
  ).toHaveAttribute("data-mc-item-content-ready", "true");

  for (const text of await page
    .locator("[data-subject] [data-mc-label-layout-ready]")
    .all()) {
    await expect(text).toHaveAttribute("data-mc-label-layout-ready", "true");
  }

  for (const text of await page
    .locator("[data-subject] [data-mc-label-ready]")
    .all()) {
    await expect(text).toHaveAttribute("data-mc-label-ready", "true");
  }
};

const verifyItemScaleGeometry = async (page: Page, scale: number) => {
  await page.goto(`/?component=item&scale=${scale}`);
  await ready(page);
  const subject = page.locator("[data-subject]");
  await subject.evaluate((node) => {
    node.style.removeProperty("width");
    node.style.removeProperty("height");
  });
  await expect
    .poll(async () => {
      const b = await subject.boundingBox();

      return [b?.width, b?.height];
    })
    .toEqual([270 * scale, 36 * scale]);
};

const verifyItemTitleColor = async (page: Page, label: string) => {
  await page.goto(`/?component=item&label=${encodeURIComponent(label)}`);
  await ready(page);
  const title = page.locator("[data-slot=item-title]");
  await title.evaluate((node) => {
    node.style.color = "#ff5555";
  });
  await expect
    .poll(
      async () =>
        await title
          .locator("canvas")
          .first()
          .evaluate((canvas: HTMLCanvasElement) => {
            const { data } = canvas
              .getContext("2d")!
              .getImageData(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < data.length; i += 4) {
              if (
                data[i] === 255 &&
                data[i + 1] === 85 &&
                data[i + 2] === 85 &&
                data[i + 3] === 255
              ) {
                return true;
              }
            }

            return false;
          })
    )
    .toBe(true);
};

const verifyDisabledItemComposition = async (page: Page, suffix: string) => {
  await page.goto(`/?component=item&disabled=1${suffix}`);
  await ready(page);
  const subject = page.locator("[data-subject]");
  await expect(subject).toBeDisabled();
  await subject.dispatchEvent("click");
  await subject.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#events")).toHaveText("0");
  expect(page.url()).not.toContain("#world");
};

const verifyItemActivationSound = async (page: Page, suffix: string) => {
  await page.goto(`/?component=item&${suffix.replace(/^\?/u, "")}`);
  await ready(page);
  const subject = page.locator("[data-subject]");
  await subject.hover();
  await subject.focus();
  expect(
    await page.evaluate(
      () =>
        // SAFETY: The paired Item initializer runs for every navigation before this reader observes its playback trace.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned playback state initialized by the paired addInitScript.
        (window as typeof window & ItemAudioState).sounds
    )
  ).toEqual([]);
  await subject.click();
  expect(
    await page.evaluate(
      () =>
        // SAFETY: The paired Item initializer runs for every navigation before this reader observes its playback trace.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned playback state initialized by the paired addInitScript.
        (window as typeof window & ItemAudioState).sounds
    )
  ).toEqual([{ rate: 1, src: minecraftClickSound, volume: 0.25 }]);
};

const verifySilentItemComposition = async (page: Page, suffix: string) => {
  await page.goto(`/?component=item&${suffix.replace(/^\?/u, "")}`);
  await ready(page);
  await page.locator("[data-subject]").dispatchEvent("click");
  expect(
    await page.evaluate(
      () =>
        // SAFETY: The paired Item initializer runs for every navigation before this reader observes its playback trace.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned playback state initialized by the paired addInitScript.
        (window as typeof window & ItemAudioState).sounds
    )
  ).toEqual([]);
};

test("Item retains an accessible link name, native thumbnail and DOM ref", async ({
  page,
}) => {
  await page.goto("/?component=item");
  await ready(page);

  const subject = page.getByRole("link", {
    exact: true,
    name: "New World world-1 Survival Mode",
  });

  await expect(subject).toHaveAttribute("href", "#world");
  await expect(subject.locator("img")).toHaveAttribute("alt", "");
  await page.locator("#read-ref").click();
  await expect(page.locator("#tag")).toHaveText("A");
});

test("Item supports semantic button composition and passive div refs", async ({
  page,
}) => {
  await page.goto("/?component=item&button=1");
  await ready(page);

  const button = page.getByRole("button", {
    exact: true,
    name: "New World world-1 Survival Mode",
  });

  await button.focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#events")).toHaveText("1");
  await page.keyboard.press("Enter");
  await expect(page.locator("#events")).toHaveText("2");
  await page.locator("#read-ref").click();
  await expect(page.locator("#tag")).toHaveText("BUTTON");
  await page.goto("/?component=item&plain=1");
  await page.locator("#read-ref").click();
  await expect(page.locator("#tag")).toHaveText("DIV");
});

test("Item default dimensions use native270 by36 logical pixels", async ({
  page,
}) => {
  for (const scale of [1, 2, 3]) {
    // oxlint-disable-next-line no-await-in-loop -- Already-extracted complete Item scale/color/disabled/activation workflows use same page/audio state; outer case loop must finish before next navigation.
    await verifyItemScaleGeometry(page, scale);
  }
});

test("Item preserves all header, footer, media, content and action slots", async ({
  page,
}) => {
  await page.goto(
    "/?component=item&plain=1&rich=1&richTitle=1&customMedia=1&label=%E4%BD%A0%E5%A5%BD%EF%BC%8C%E4%B8%96%E7%95%8C"
  );
  await ready(page);
  await expect(page.locator("[data-slot=item-header]")).toContainText(
    "Available worlds"
  );
  await expect(page.locator("[data-slot=item-footer]")).toContainText(
    "World information"
  );
  await expect(page.locator("[data-slot=item-actions] button")).toHaveText(
    "Item action"
  );
  await expect(page.locator("[data-testid=rich-title]")).toContainText(
    "你好，世界"
  );
  await expect(page.locator("[data-testid=custom-media]")).toHaveText("Icon");
  await page.getByRole("button", { exact: true, name: "Item action" }).click();
  await expect(page.locator("#actions")).toHaveText("1");
  await expect(page.locator("[data-slot=item-group]")).toHaveAttribute(
    "role",
    "list"
  );
});

test("Item truncates visual title while retaining its complete accessible value", async ({
  page,
}) => {
  const title =
    "A long world name that must be clipped to the native row width at the original ellipsis boundary";

  await page.goto(`/?component=item&label=${encodeURIComponent(title)}`);
  await ready(page);
  const itemTitle = page.locator("[data-slot=item-title]");
  await expect(itemTitle.locator(".mc-text-accessible").last()).toHaveText(
    title
  );
  await expect(
    itemTitle.locator(".mc-label-line [data-mc-label-ready] > span").last()
  ).toContainText("...");
  await expect(page.locator("[data-subject]")).toHaveAccessibleName(
    `${title} world-1 Survival Mode`
  );

  const previous = await itemTitle
    .locator(".mc-label-line [data-mc-label-ready] > span")
    .last()
    .textContent();

  await page.locator("#resize").click();
  await expect
    .poll(
      async () =>
        await itemTitle
          .locator(".mc-label-line [data-mc-label-ready] > span")
          .last()
          .textContent()
    )
    .not.toBe(previous);
});

test("Item honors full RGB text colors for both ASCII and CJK", async ({
  page,
}) => {
  for (const label of ["New World", "你好，世界"]) {
    // oxlint-disable-next-line no-await-in-loop -- Already-extracted complete Item scale/color/disabled/activation workflows use same page/audio state; outer case loop must finish before next navigation.
    await verifyItemTitleColor(page, label);
  }
});

test("Item aria-disabled blocks pointer and keyboard activation", async ({
  page,
}) => {
  for (const suffix of ["", "&button=1", "&customAction=1"]) {
    // oxlint-disable-next-line no-await-in-loop -- Already-extracted complete Item scale/color/disabled/activation workflows use same page/audio state; outer case loop must finish before next navigation.
    await verifyDisabledItemComposition(page, suffix);
  }
});

test("Item uses original activation sound once and keeps passive rows silent", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // SAFETY: This Item initScript creates its own empty rate/src/volume trace before navigation and playback.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned playback state initialized by the paired addInitScript.
    (window as typeof window & ItemAudioState).sounds = [];
    HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) {
      // SAFETY: The paired Item initScript initializes sounds; this native media play mock records its own rate, src and volume.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned playback state initialized by the paired addInitScript.
      (window as typeof window & ItemAudioState).sounds.push({
        rate: this.playbackRate,
        src: this.src,
        volume: this.volume,
      });

      return Promise.resolve();
    };
  });

  for (const suffix of ["", "?button=1", "?customAction=1"]) {
    // oxlint-disable-next-line no-await-in-loop -- Already-extracted complete Item scale/color/disabled/activation workflows use same page/audio state; outer case loop must finish before next navigation.
    await verifyItemActivationSound(page, suffix);
  }

  for (const suffix of [
    "?plain=1",
    "?cancel=1",
    "?childCancel=1",
    "?disabled=1",
  ]) {
    // oxlint-disable-next-line no-await-in-loop -- Already-extracted complete Item scale/color/disabled/activation workflows use same page/audio state; outer case loop must finish before next navigation.
    await verifySilentItemComposition(page, suffix);
  }

  await page.goto("/?component=item&volume=0.4");
  await ready(page);
  await page.locator("[data-subject]").click();
  expect(
    await page.evaluate(
      () =>
        // SAFETY: The paired Item initializer runs for every navigation before this reader observes its playback trace.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned playback state initialized by the paired addInitScript.
        (window as typeof window & ItemAudioState).sounds[0].volume
    )
  ).toBeCloseTo(0.1);
});

test("ItemSeparator retains native horizontal separator semantics", async ({
  page,
}) => {
  await page.goto("/?component=item&part=separator&semantic=1&height=2");
  await expect(page.getByRole("separator")).toHaveAttribute(
    "data-orientation",
    "horizontal"
  );
  await page.locator("#read-ref").click();
  await expect(page.locator("#tag")).toHaveText("DIV");
});

test("ItemMedia remains usable outside an Item parent", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?component=item&part=media");
  await expect(page.locator("[data-subject]")).toBeVisible();
  await expect(page.locator("[data-mc-item-media-ready]")).toHaveAttribute(
    "data-mc-item-media-ready",
    "true"
  );
  expect(errors).toEqual([]);
});
