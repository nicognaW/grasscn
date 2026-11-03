import { test, expect } from "@grasscn/tests/test";

interface PlayerListPlaybackState extends Window {
  played?: number;
}

type InitializedPlayerListPlaybackState = typeof window &
  PlayerListPlaybackState & {
    played: number;
  };

const fixture =
  process.env.GRASSCN_EXPANSION_URL ?? "http://127.0.0.1:5174/adventure.html";

const url = (sample: object) =>
  `${fixture}?scale=2&case=${encodeURIComponent(JSON.stringify(sample))}`;

test("player list supports pointer and keyboard selection without UI sound", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // SAFETY: this write installs the actual recorder field on the new page; it is optional before this producer assignment.
    (window as PlayerListPlaybackState).played = 0;
    const audioMockDescriptor: PropertyDescriptor = {};
    audioMockDescriptor.value = class {
      play() {
        // SAFETY: this page init script assigns the exact recorder before installing playback; the callback and post-navigation observations read that initialized field without changing any lookup.
        // oxlint-disable typescript/no-unsafe-type-assertion -- Exact initialized page-local playback recorder protocol; preserve original field reads and resets.
        (window as InitializedPlayerListPlaybackState).played += 1;
        // oxlint-enable typescript/no-unsafe-type-assertion

        return;
      }
    };
    Object.defineProperty(window, "Audio", audioMockDescriptor);
  });
  await page.goto(
    url({
      checked: true,
      element: "player-list",
      labels: ["Alex", "Steve", "Kai"],
    })
  );
  await page.getByRole("button", { exact: true, name: "Steve" }).click();
  await expect(page.getByLabel("Demo value")).toHaveText("0 / 1 / 0");
  const kai = page.getByRole("button", { exact: true, name: "Kai" });
  await kai.focus();
  await kai.press("Enter");
  await expect(page.getByLabel("Demo value")).toHaveText("0 / 2 / 0");
  // SAFETY: this page init script assigns the exact recorder before installing playback; the callback and post-navigation observations read that initialized field without changing any lookup.
  // oxlint-disable typescript/no-unsafe-type-assertion -- Exact initialized page-local playback recorder protocol; preserve original field reads and resets.
  expect(
    await page.evaluate(
      () => (window as InitializedPlayerListPlaybackState).played
    )
  ).toBe(0);
  // oxlint-enable typescript/no-unsafe-type-assertion
});

test("player list uses at most eighty entries and twenty rows per column", async ({
  page,
}) => {
  await page.goto(
    url({
      element: "player-list",
      labels: Array.from({ length: 83 }, (_, i) => `Player${i + 1}`),
    })
  );
  await expect(page.getByRole("listitem")).toHaveCount(80);
  await expect(
    page.getByRole("button", { exact: true, name: "Player81" })
  ).toHaveCount(0);
  const grid = page.getByRole("list", { exact: true, name: "Players" });

  const layout = await grid.evaluate((element) => ({
    columns: getComputedStyle(element).gridTemplateColumns.split(" ").length,
    rows: getComputedStyle(element).gridTemplateRows.split(" ").length,
  }));

  expect(layout).toEqual({ columns: 4, rows: 20 });
});

test("scoreboard sorts scores, hides internal entries and caps the visible ranking", async ({
  page,
}) => {
  await page.goto(
    url({
      element: "scoreboard",
      label: "Build points",
      labels: ["Zed", "#internal", "amy", "Bea"],
    })
  );
  const table = page.getByRole("table", { exact: true, name: "Build points" });
  await expect(table.getByRole("cell")).toHaveText([
    "Bea",
    "16",
    "amy",
    "13",
    "Zed",
    "7",
  ]);
  await expect(table).not.toContainText("#internal");
  await page.goto(
    url({
      element: "scoreboard",
      label: "Build points",
      labels: Array.from({ length: 20 }, (_, i) => `Player${i + 1}`),
    })
  );
  await expect(page.getByRole("row")).toHaveCount(16);
  await expect(page.getByRole("cell").first()).toHaveText("Player20");
});
