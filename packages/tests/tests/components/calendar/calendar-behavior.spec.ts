import { test, expect } from "@grasscn/tests/test";
import {
  recordAudioPlayback,
  recordedAudioPlayback,
} from "@tests/harness/audio-playback";

test("Calendar single selection, disabled dates, keyboard and month navigation use actual DayPicker", async ({
  page,
}) => {
  await page.goto("/?component=calendar");
  const calendar = page.locator("[data-slot=calendar]").first();
  await expect(
    calendar.getByRole("button", { name: /October 1st/u })
  ).toBeDisabled();
  await calendar.getByRole("button", { name: /October 10th/u }).click();
  await expect(page.locator("#selected")).toHaveText("10/10/2026");
  await calendar.getByRole("button", { name: /October 10th/u }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    calendar.getByRole("button", { name: /October 11th/u })
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#selected")).toHaveText("10/11/2026");
  await calendar.getByRole("button", { name: /next month/i }).click();
  await expect(calendar).toContainText("November 2026");
});

test("DatePicker opens by keyboard, selects value, submits form text and restores focus", async ({
  page,
}) => {
  await page.goto("/?component=calendar");
  const trigger = page.locator("[data-slot=date-picker-trigger]");
  await trigger.focus();
  await page.keyboard.press("Enter");
  const popup = page.locator("[data-slot=date-picker-content]");
  await expect(popup).toBeVisible();
  await popup.getByRole("button", { name: /October 15th/u }).click();
  await expect(popup).toHaveCount(0);
  await expect(trigger).toContainText("October 15th, 2026");
  await expect(page.locator("input[name=date]")).toHaveValue("2026-10-15");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(popup).toHaveCount(0);
});

test("Calendar range is genuine DayPicker range selection with two months", async ({
  page,
}) => {
  await page.goto("/?component=calendar");
  const calendar = page.locator("[data-slot=calendar]").nth(1);
  await calendar.getByRole("button", { name: /October 10th/u }).click();
  await calendar.getByRole("button", { name: /October 15th/u }).click();
  await expect(calendar.locator("[data-range-start=true]")).toHaveCount(1);
  await expect(calendar.locator("[data-range-end=true]")).toHaveCount(1);
  await expect(calendar.locator("[data-range-middle=true]")).toHaveCount(4);
  await expect(calendar.locator(".rdp-month")).toHaveCount(2);
});

test("Calendar multiple selection and custom Minecraft month/year dropdowns preserve genuine events", async ({
  page,
}) => {
  await page.goto("/?component=calendar");
  const multiple = page.getByLabel("Multiple dates", { exact: true });
  await multiple.getByRole("button", { name: /October 10th/u }).click();
  await multiple.getByRole("button", { name: /October 12th/u }).click();
  await expect(page.locator("#multiple")).toHaveText("2");
  await multiple.getByRole("button", { name: /October 10th/u }).click();
  await expect(page.locator("#multiple")).toHaveText("1");
  const dropdown = page.getByLabel("Dropdown calendar", { exact: true });
  await dropdown.getByRole("combobox", { name: /month/i }).click();
  await page.getByRole("option", { exact: true, name: "November" }).click();
  await expect(
    dropdown.getByRole("gridcell", { name: /November 10th/u })
  ).toBeVisible();
  await dropdown.getByRole("combobox", { name: /year/i }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("option", { exact: true, name: "2027" }).click();
  await expect(
    dropdown.getByRole("gridcell", { name: /November 10th, 2027/u })
  ).toBeVisible();
});

test("Date picker composition uses a disabled trigger to block opening", async ({
  page,
}) => {
  await page.goto("/?component=calendar&scenario=disabled");
  await expect(
    page.getByRole("button", { name: "Disabled date" })
  ).toBeDisabled();
  await expect(page.locator("[data-slot=date-picker-content]")).toHaveCount(0);
});

test("Date picker example owns selection across close and reopen", async ({
  page,
}) => {
  await page.goto("/?component=calendar&scenario=uncontrolled");
  await page.locator("[data-slot=date-picker-trigger]").click();
  await page.getByRole("button", { name: /October 20th/u }).click();
  await expect(page.locator("[data-slot=date-picker-trigger]")).toContainText(
    "October 20th, 2026"
  );
  await page.keyboard.press("Escape");
  await page.locator("[data-slot=date-picker-trigger]").click();
  await expect(page.locator('[data-day="10/20/2026"]')).toHaveAttribute(
    "data-selected-single",
    "true"
  );
});

test("Calendar cell and navigation activation preserve original one-voice click audio; hover remains silent", async ({
  page,
}) => {
  await recordAudioPlayback(page);
  await page.goto("/?component=calendar");
  const calendar = page.locator("[data-slot=calendar]").first();
  await calendar.getByRole("button", { name: /October 10th/u }).hover();
  expect(await recordedAudioPlayback(page)).toHaveLength(0);
  await calendar.getByRole("button", { name: /October 10th/u }).click();
  await calendar.getByRole("button", { name: /next month/i }).click();
  const voices = await recordedAudioPlayback(page);
  expect(voices).toHaveLength(2);
  expect(
    voices.every(
      (v) =>
        v.source.startsWith("data:audio/ogg;base64,") &&
        v.volume === 0.25 &&
        v.rate === 1
    )
  ).toBe(true);
});
