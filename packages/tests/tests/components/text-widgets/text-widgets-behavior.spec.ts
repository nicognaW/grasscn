import { test, expect } from "@grasscn/tests/test";

test("Trace preserves eight slots, status colors, controlled keyboard disclosure and content-class contract", async ({
  page,
}) => {
  await page.goto("?component=trace&controlled=1&scale=3");
  const trigger = page.getByRole("button", { name: "Details" });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("details")).toContainText(
    "Native text details 世界"
  );
  await expect(
    page.locator('[data-slot="trace-collapsible-content-inner"]')
  ).toHaveClass(/caller-content/u);
  await expect(page.getByTestId("details")).not.toHaveClass(/caller-content/u);
  await page.locator("#read-ref").click();
  await expect(page.locator("#tag")).toHaveText("DIV");

  const readOnlyItems22 = [
    ["running", "rgb(255, 255, 255)"],
    ["error", "rgb(255, 85, 85)"],
    ["pending", "rgb(85, 85, 85)"],
  ];

  const readOnlyResults22 = await Promise.allSettled(
    readOnlyItems22.map(async ([state, color]) => {
      await expect(page.getByTestId(state)).toHaveCSS("color", color);
    })
  );

  for (const readOnlyResult22 of readOnlyResults22) {
    if (readOnlyResult22.status === "rejected") {
      throw readOnlyResult22.reason;
    }
  }

  await trigger.focus();
  await page.keyboard.press("Space");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#changes")).toHaveText("2");
});

test("Trace disabled trigger remains closed and silent", async ({ page }) => {
  await page.goto("?component=trace&disabled=1");
  const trigger = page.getByRole("button", { name: "Details" });
  await expect(trigger).toBeDisabled();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#changes")).toHaveText("0");
});

test("MessageScroller preserves provider/hooks, viewport ref, scroll API and visibility", async ({
  page,
}) => {
  await page.goto("?component=message-scroller");
  const viewport = page.getByTestId("viewport");
  await expect
    .poll(
      async () =>
        await viewport.evaluate(
          (n) => n.scrollTop + n.clientHeight >= n.scrollHeight - 2
        )
    )
    .toBe(true);
  await page.getByRole("button", { exact: true, name: "API start" }).click();
  await expect
    .poll(async () => await viewport.evaluate((n) => n.scrollTop))
    .toBe(0);
  await expect(page.getByTestId("scrollable")).toContainText('"end":true');
  await page.getByRole("button", { exact: true, name: "API message" }).click();
  await expect(page.getByTestId("visible")).toContainText('"15"');
  await page.getByRole("button", { exact: true, name: "API end" }).click();
  await expect
    .poll(
      async () =>
        await viewport.evaluate(
          (n) => n.scrollTop + n.clientHeight >= n.scrollHeight - 2
        )
    )
    .toBe(true);
  await page.locator("#read-ref").click();
  await expect(page.locator("#tag")).toHaveText("DIV");
});

test("MessageScroller native buttons and auto-scroll retain keyboard/manual control", async ({
  page,
}) => {
  await page.goto("?component=message-scroller&position=start");
  const viewport = page.getByTestId("viewport");
  await expect
    .poll(async () => await viewport.evaluate((n) => n.scrollTop))
    .toBe(0);
  const end = page.getByRole("button", { exact: true, name: "Scroll to end" });
  await end.focus();
  await page.keyboard.press("Enter");
  await expect
    .poll(
      async () =>
        await viewport.evaluate(
          (n) => n.scrollTop + n.clientHeight >= n.scrollHeight - 2
        )
    )
    .toBe(true);
  await page.getByRole("button", { exact: true, name: "Append" }).click();
  await expect(page.getByTestId("message-31")).toBeAttached();
  await expect
    .poll(
      async () =>
        await viewport.evaluate(
          (n) => n.scrollTop + n.clientHeight >= n.scrollHeight - 2
        )
    )
    .toBe(true);
  await page.getByRole("button", { exact: true, name: "API start" }).click();
  await expect
    .poll(async () => await viewport.evaluate((n) => n.scrollTop))
    .toBe(0);
  await page.getByRole("button", { exact: true, name: "Append" }).click();
  await expect
    .poll(async () => await viewport.evaluate((n) => n.scrollTop))
    .toBe(0);
});

test("MessageScroller preserves visible anchor position on prepend", async ({
  page,
}) => {
  await page.goto("?component=message-scroller&noauto=1");
  await page.getByRole("button", { exact: true, name: "API message" }).click();
  await expect(page.getByTestId("visible")).toContainText('"15"');
  const before = (await page.getByTestId("message-15").boundingBox())!.y;
  await page.getByRole("button", { exact: true, name: "Prepend" }).click();
  await expect(page.getByTestId("message-0")).toBeAttached();
  await expect
    .poll(async () =>
      Math.abs((await page.getByTestId("message-15").boundingBox())!.y - before)
    )
    .toBeLessThanOrEqual(1);
});

test("Spinner retains SVG semantics, ref, custom children, events and exact1200ms phase cycle", async ({
  page,
}) => {
  await page.goto("?component=spinner");
  const spinner = page.getByRole("status", { name: "Working" });
  await expect(spinner).toHaveAttribute("viewBox", "0 0 26 9");
  await expect(spinner.locator("title")).toHaveText("Original loading dots");
  const start = await spinner.innerHTML();
  await page.getByRole("button", { name: "Next phase" }).click();
  expect(await spinner.innerHTML()).not.toBe(start);

  for (let i = 0; i < 3; i += 1) {
    // oxlint-disable-next-line no-await-in-loop -- Advances the same focus/pointer/widget state; the next transition depends on completion and observation of the current one.
    await page.getByRole("button", { name: "Next phase" }).click();
  }

  expect(await spinner.innerHTML()).toBe(start);
  await spinner.click();
  await expect(page.locator("#events")).toHaveText("1");
  await page.locator("#read-ref").click();
  await expect(page.locator("#tag")).toHaveText("svg");
});

test("Spinner respects reduced motion and stays a passive status widget", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("?component=spinner&animate=1");

  const spinner = page.getByRole("status", { name: "Working" });
  const first = await spinner.innerHTML();

  await page.waitForTimeout(650);
  expect(await spinner.innerHTML()).toBe(first);
  await expect(spinner).not.toHaveAttribute("tabindex");
});
