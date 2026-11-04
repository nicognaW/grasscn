import { test, expect } from "@grasscn/tests/test";
import { fireworkSounds } from "@grasscn/web/ui/minecraft-firework-sound-assets";
import type { Page } from "@playwright/test";

const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/u, "/");

// The count comes from the live GitHub repository API, so a preview that
// cannot reach GitHub shows the no-count name instead.
const STAR_NAME = /^Star grasscn on GitHub(?:, (?<count>\d+k?) stars)?$/u;

const starButton = (page: Page) =>
  page.getByRole("banner").getByRole("link", { name: STAR_NAME });

test("Header star button opens the repository in a new tab instead of a GitHub text link", async ({
  page,
}) => {
  await page.goto(`${origin}docs`);
  const banner = page.getByRole("banner");

  await expect(starButton(page)).toHaveAttribute(
    "href",
    "https://github.com/nicognaW/grasscn"
  );
  await expect(starButton(page)).toHaveAttribute("target", "_blank");
  await expect(starButton(page)).toHaveAttribute("rel", /\bnoopener\b/u);
  await expect(
    banner.getByRole("link", { exact: true, name: "GitHub" })
  ).toHaveCount(0);
});

test("Header star button names its count, drawn on the Redstone Lamp display", async ({
  page,
}) => {
  await page.goto(`${origin}docs`);
  const button = starButton(page);
  const name = (await button.getAttribute("aria-label")) ?? "";
  const count = STAR_NAME.exec(name)?.groups?.count;
  const display = button.locator('[data-slot="redstone-lamp-display"]');

  expect(name).toMatch(STAR_NAME);

  if (count === undefined) {
    await expect(display).toHaveCount(0);
  } else {
    // One 24 px glyph per character with an 8 px gap: the display shows the
    // named count, not a stale or default value.
    await expect(display).toHaveAttribute("data-rendered", "true");
    await expect(display).toHaveAttribute(
      "width",
      String((4 * count.length - 1) * 8)
    );
  }

  // The anchor alone carries the name; the display adds no second one.
  await expect(button.getByRole("img")).toHaveCount(0);
});

test("Header star button shows the glinting nether star before the lamp display", async ({
  page,
}) => {
  await page.goto(`${origin}docs`);
  const button = starButton(page);
  const star = button.locator('[data-slot="nether-star"]');

  await expect(star).toHaveAttribute("data-rendered", "true");

  // GUI scale 2 at its intrinsic size: only DPR 1 without CSS scaling is
  // verified against the captured references.
  const box = await star.boundingBox();
  expect([box?.width, box?.height]).toEqual([32, 32]);

  // The star comes first, then the GitHub label, then the count display when
  // there is one.
  const order = await button.evaluate((node): (string | undefined)[] =>
    [...node.querySelectorAll<HTMLElement>("[data-slot]")].map(
      (element) => element.dataset.slot
    )
  );

  expect(order.filter((slot) => slot !== "star-button-star")).toEqual(
    order.includes("redstone-lamp-display")
      ? ["nether-star", "star-button-label", "redstone-lamp-display"]
      : ["nether-star", "star-button-label"]
  );

  // The glint moves with time: two readouts of the canvas differ.
  const pixels = async () =>
    await star.evaluate((canvas) => {
      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new TypeError("The nether star must be a canvas");
      }

      return [
        ...(canvas.getContext("2d")?.getImageData(0, 0, 32, 32).data ?? []),
      ].join(",");
    });

  const first = await pixels();
  await expect.poll(pixels, { timeout: 5000 }).not.toBe(first);
});

test("Header star button shows the site focus outline for keyboard focus", async ({
  page,
}) => {
  await page.goto(`${origin}docs`);
  const button = starButton(page);

  await expect(button).toBeVisible();
  await page
    .getByRole("banner")
    .getByRole("link", { exact: true, name: "grasscn home" })
    .focus();

  for (let step = 0; step < 12; step += 1) {
    // oxlint-disable-next-line no-await-in-loop -- keyboard focus moves one stop at a time.
    if (await button.evaluate((node) => node === document.activeElement)) {
      break;
    }

    // oxlint-disable-next-line no-await-in-loop -- keyboard focus moves one stop at a time.
    await page.keyboard.press("Tab");
  }

  await expect(button).toBeFocused();
  await expect(button).toHaveCSS("outline-style", "solid");
  await expect(button).toHaveCSS("outline-width", "2px");
  await expect(button).toHaveCSS("outline-color", "rgb(255, 255, 255)");
  await expect(button).toHaveCSS("outline-offset", "4px");
});

test("Header star button stays on the brand row at 720 px and below", async ({
  page,
}) => {
  for (const width of [720, 390, 320]) {
    // oxlint-disable-next-line no-await-in-loop -- each width is its own layout.
    await page.setViewportSize({ height: 844, width });
    // oxlint-disable-next-line no-await-in-loop -- each width is its own layout.
    await page.goto(`${origin}docs`);

    const brand = page
      .getByRole("banner")
      .getByRole("link", { exact: true, name: "grasscn home" });

    // oxlint-disable-next-line no-await-in-loop -- each width is its own layout.
    const brandBox = await brand.boundingBox();
    // oxlint-disable-next-line no-await-in-loop -- each width is its own layout.
    const buttonBox = await starButton(page).boundingBox();

    // oxlint-disable-next-line no-await-in-loop -- each width is its own layout.
    const navBox = await page
      .getByRole("navigation", { name: "Main navigation" })
      .boundingBox();

    expect(brandBox, `brand at ${width}`).not.toBeNull();
    expect(buttonBox, `star button at ${width}`).not.toBeNull();
    expect(navBox, `navigation at ${width}`).not.toBeNull();

    if (brandBox === null || buttonBox === null || navBox === null) {
      return;
    }

    // Beside the brand, inside its row, above the wrapped navigation and
    // within the viewport.
    expect(buttonBox.x, `${width}`).toBeGreaterThanOrEqual(
      brandBox.x + brandBox.width
    );
    expect(buttonBox.y, `${width}`).toBeGreaterThanOrEqual(brandBox.y);
    expect(buttonBox.y + buttonBox.height, `${width}`).toBeLessThanOrEqual(
      brandBox.y + brandBox.height
    );
    expect(buttonBox.y + buttonBox.height, `${width}`).toBeLessThanOrEqual(
      navBox.y
    );
    expect(buttonBox.x + buttonBox.width, `${width}`).toBeLessThanOrEqual(
      width
    );
    expect(
      // oxlint-disable-next-line no-await-in-loop -- each width is its own layout.
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      ),
      `${width}`
    ).toBe(true);
  }
});

// Clicking the star button launches the fireworks UI port from the nether
// star. Sound playback is recorded, not heard: HTMLMediaElement.play is
// stubbed to log each voice's source.
interface LaunchVoice {
  source: string;
  time: number;
  volume: number;
}

interface StarOpen {
  time: number;
  url: string;
}

declare global {
  interface Window {
    __fireworkVoices: LaunchVoice[];
    __starOpens: StarOpen[];
  }
}

const recordVoices = async (page: Page) => {
  // The link still opens the repository in a new tab; keep that tab offline.
  await page.context().route("https://github.com/**", async (route) => {
    await route.fulfill({ body: "" });
  });
  await page.addInitScript(() => {
    const voices: LaunchVoice[] = [];
    window.__fireworkVoices = voices;
    // oxlint-disable-next-line require-await -- the stub records the voice and resolves at once.
    HTMLMediaElement.prototype.play = async function play() {
      voices.push({
        source: this.src,
        time: performance.now(),
        volume: this.volume,
      });
    };
  });
};

// The near-variant clip each recorded voice played, in order.
const clipNames = new Map<string, string>(
  Object.entries(fireworkSounds).map(([name, [source]]) => [source, name])
);

const playedClips = async (page: Page) => {
  const voices = await page.evaluate(() => window.__fireworkVoices);

  return voices.map((voice) => clipNames.get(voice.source) ?? "other");
};

const fireworksCanvas = (page: Page) =>
  page.locator('canvas[data-slot="fireworks"]');

test("Clicking the header star button launches the fireworks from the nether star", async ({
  page,
}) => {
  await recordVoices(page);
  await page.goto(`${origin}docs`);
  const button = starButton(page);
  const star = button.locator('[data-slot="nether-star"]');

  await expect(fireworksCanvas(page)).toHaveCount(0);
  await button.click();

  // The launch sound plays on the click itself (the first tick).
  expect(await playedClips(page)).toEqual(["launch"]);

  // One 480x640 canvas, portaled outside the header and drawn once the
  // textures decode. Its launch point (240, 584) sits on the star's bottom
  // centre.
  const canvas = fireworksCanvas(page);
  await expect(canvas).toHaveAttribute("data-rendered", "true");
  expect(await canvas.evaluate((node) => node.closest("header") === null)).toBe(
    true
  );

  const [canvasBox, starBox] = await Promise.all([
    canvas.boundingBox(),
    star.boundingBox(),
  ]);

  expect([canvasBox?.width, canvasBox?.height]).toEqual([480, 640]);
  expect((canvasBox?.x ?? 0) + 240).toBeCloseTo(
    (starBox?.x ?? 0) + (starBox?.width ?? 0) / 2,
    0
  );
  expect((canvasBox?.y ?? 0) + 584).toBeCloseTo(
    (starBox?.y ?? 0) + (starBox?.height ?? 0),
    0
  );

  // The rocket is drawn: some canvas pixels are no longer transparent.
  const painted = async () =>
    await canvas.evaluate((node) => {
      if (!(node instanceof HTMLCanvasElement)) {
        throw new TypeError("The fireworks surface must be a canvas");
      }

      const data =
        node.getContext("2d")?.getImageData(0, 0, 480, 640).data ?? [];

      return data.some((value, index) => index % 4 === 3 && value > 0);
    });

  await expect.poll(painted).toBe(true);

  // Blast at tick 26, twinkle at tick 42; the canvas goes once the last
  // spark has gone (tick 86, about 4.3 s).
  await expect
    .poll(async () => await playedClips(page), { timeout: 10_000 })
    .toEqual(["launch", "largeBlast", "twinkle"]);
  await expect(canvas).toHaveCount(0, { timeout: 10_000 });
});

test("Header fireworks play at the site sound volume on a page without an input playground", async ({
  page,
}) => {
  await recordVoices(page);
  // The charts page renders no input playground (whose slider demo also
  // reads the site volume), so only the site frame can apply it here.
  await page.goto(`${origin}charts`);
  await starButton(page).click();

  await expect
    .poll(async () => await playedClips(page), { timeout: 10_000 })
    .toEqual(["launch", "largeBlast", "twinkle"]);

  // Each firework sound has gain 1 in game, so it plays at the site's 50%
  // master volume, not the registry default of 100%.
  const volumes = await page.evaluate(() =>
    window.__fireworkVoices.map((voice) => voice.volume)
  );

  expect(volumes).toEqual([0.5, 0.5, 0.5]);
});

test("The fireworks canvas ignores the pointer", async ({ page }) => {
  await recordVoices(page);
  await page.goto(`${origin}docs`);
  await starButton(page).click();

  const canvas = fireworksCanvas(page);
  await expect(canvas).toHaveAttribute("data-rendered", "true");
  await expect(canvas).toHaveCSS("pointer-events", "none");

  // Hit testing at the star, under the canvas, still finds the star button.
  const hit = await canvas.evaluate((node) => {
    const bounds = node.getBoundingClientRect();

    const target = document.elementFromPoint(
      bounds.left + 240,
      bounds.top + 576
    );

    return {
      canvas: target === node,
      starButton: target?.closest(".minecraft-star-button") !== null,
    };
  });

  expect(hit).toEqual({ canvas: false, starButton: true });
});

test("Rapid header star clicks launch overlapping fireworks on one canvas", async ({
  page,
}) => {
  await recordVoices(page);
  await page.goto(`${origin}docs`);
  const button = starButton(page);

  // Three clicks in quick succession, well inside one firework's 4.3 s.
  await button.click({ clickCount: 3 });

  // Three independent launches, each with its own launch sound, share the
  // one canvas.
  expect(await playedClips(page)).toEqual(["launch", "launch", "launch"]);
  await expect(fireworksCanvas(page)).toHaveCount(1);

  // Each launch keeps its own timeline and plays every sound once: all
  // three blasts come before any twinkle.
  await expect
    .poll(
      async () => {
        const clips = await playedClips(page);

        return clips.length;
      },
      { timeout: 10_000 }
    )
    .toBe(9);
  expect(await playedClips(page)).toEqual([
    "launch",
    "launch",
    "launch",
    "largeBlast",
    "largeBlast",
    "largeBlast",
    "twinkle",
    "twinkle",
    "twinkle",
  ]);
  await expect(fireworksCanvas(page)).toHaveCount(0, { timeout: 10_000 });
});

interface Box {
  height: number;
  width: number;
  x: number;
  y: number;
}

// The canvas's launch pixel (240, 584) and an anchor's bottom centre, in
// whole viewport pixels.
const launchPoint = (box: Box | null) =>
  box === null ? null : [Math.round(box.x + 240), Math.round(box.y + 584)];

const bottomCentre = (box: Box | null) =>
  box === null
    ? null
    : [Math.round(box.x + box.width / 2), Math.round(box.y + box.height)];

test("A launch from another anchor leaves the header launch where it is", async ({
  page,
}) => {
  await recordVoices(page);
  // Tall enough that the header and the playground both show, so neither
  // click scrolls the page.
  await page.setViewportSize({ height: 3200, width: 1280 });
  await page.goto(`${origin}docs/components/fireworks`);
  const star = starButton(page).locator('[data-slot="nether-star"]');

  const launchButton = page
    .locator(".documentation-playground")
    .getByRole("button", { exact: true, name: "Launch fireworks" });

  await starButton(page).click();
  const header = fireworksCanvas(page).first();
  await expect(header).toHaveAttribute("data-rendered", "true");
  const before = await header.boundingBox();

  await launchButton.click();
  await expect(fireworksCanvas(page)).toHaveCount(2);
  const playground = fireworksCanvas(page).nth(1);
  await expect(playground).toHaveAttribute("data-rendered", "true");

  const [after, playgroundBox, starBox, buttonBox] = await Promise.all([
    header.boundingBox(),
    playground.boundingBox(),
    star.boundingBox(),
    launchButton.boundingBox(),
  ]);

  // The header rocket keeps rising from the star; the second rocket rises
  // from the launch button on its own canvas.
  expect(after).toEqual(before);
  expect(launchPoint(after)).toEqual(bottomCentre(starBox));
  expect(launchPoint(playgroundBox)).toEqual(bottomCentre(buttonBox));
  await expect(fireworksCanvas(page)).toHaveCount(0, { timeout: 10_000 });
});

test("Under reduced motion the header star button plays the firework sounds with no canvas", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await recordVoices(page);
  await page.goto(`${origin}docs`);
  await starButton(page).click();

  await expect
    .poll(async () => await playedClips(page), { timeout: 10_000 })
    .toEqual(["launch", "largeBlast", "twinkle"]);
  await expect(fireworksCanvas(page)).toHaveCount(0);

  // The blast keeps its native tick: 25 ticks of 50 ms after the launch.
  const [launch, blast] = await page.evaluate(() =>
    window.__fireworkVoices.map((voice) => voice.time)
  );

  expect((blast ?? 0) - (launch ?? 0)).toBeGreaterThanOrEqual(1200);
});

// Records repository opens instead of opening real tabs. The stub hands back
// this page as the opened window, so cutting its opener changes nothing.
const recordOpens = async (page: Page) => {
  await page.addInitScript(() => {
    const opens: StarOpen[] = [];

    window.__starOpens = opens;
    window.open = (url) => {
      opens.push({ time: performance.now(), url: String(url) });

      return window;
    };
  });
};

const starOpens = async (page: Page) =>
  await page.evaluate(() => window.__starOpens);

test("The header star button shows a visible GitHub label", async ({
  page,
}) => {
  await page.goto(`${origin}docs`);
  const label = starButton(page).locator('[data-slot="star-button-label"]');

  await expect(label).toBeVisible();
  await expect(label).toHaveText("GitHub");
});

test("The header star button opens the repository after the firework has played", async ({
  page,
}) => {
  await recordOpens(page);
  await page.goto(`${origin}docs`);
  const clicked = await page.evaluate(() => performance.now());
  // Three quick clicks launch three fireworks but open the repository once.
  await starButton(page).click({ clickCount: 3 });

  // Nothing opens, and the page stays, while the firework plays.
  await page.waitForTimeout(1500);
  expect(await starOpens(page)).toEqual([]);
  expect(page.url()).toBe(`${origin}docs`);

  await expect
    .poll(async () => {
      const opens = await starOpens(page);

      return opens.length;
    })
    .toBe(1);
  const [open] = await starOpens(page);
  expect(open?.url).toBe("https://github.com/nicognaW/grasscn");
  expect((open?.time ?? 0) - clicked).toBeGreaterThanOrEqual(2400);
});

test("Under reduced motion the header star button opens the repository at once", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await recordOpens(page);
  await page.goto(`${origin}docs`);
  await starButton(page).click();

  expect(await starOpens(page)).toHaveLength(1);
});
