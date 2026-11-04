import { test, expect } from "@grasscn/tests/test";

test("Hotbar has one tab entry and preserves nine missing-item slots", async ({
  page,
}) => {
  await page.goto("/?component=custom-api&hotbarKeyboard&hotbarMissingItems");
  const toolbar = page.getByTestId("keyboard-hotbar");
  await expect(toolbar.getByRole("button")).toHaveCount(9);
  await expect(toolbar).toHaveAttribute("tabindex", "-1");
  await page
    .getByRole("button", { exact: true, name: "Before hotbar" })
    .focus();
  await page.keyboard.press("Tab");
  await expect(
    toolbar.getByRole("button", { exact: true, name: "Slot 1" })
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { exact: true, name: "After hotbar" })
  ).toBeFocused();
});

test("Hotbar enters an enabled slot and skips disabled slots while navigating", async ({
  page,
}) => {
  await page.goto("/?component=custom-api&hotbarKeyboard&hotbarDisabled=0,1,8");
  const toolbar = page.getByTestId("keyboard-hotbar");

  const slot = (name: string) =>
    toolbar.getByRole("button", { exact: true, name });

  await page
    .getByRole("button", { exact: true, name: "Before hotbar" })
    .focus();
  await page.keyboard.press("Tab");
  await expect(slot("Slot 3")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(slot("Slot 8")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(slot("Slot 3")).toBeFocused();
  await page.keyboard.press("End");
  await expect(slot("Slot 8")).toBeFocused();
  await page.keyboard.press("Home");
  await expect(slot("Slot 3")).toBeFocused();
  await page.keyboard.press("1");
  await expect(slot("Slot 3")).toBeFocused();
  await expect(slot("Slot 3")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("5");
  await expect(slot("Slot 5")).toBeFocused();
  await expect(slot("Slot 5")).toHaveAttribute("aria-pressed", "true");
});

test("Hotbar retains meaningful root entry when all slots are disabled", async ({
  page,
}) => {
  await page.goto(
    "/?component=custom-api&hotbarKeyboard&hotbarDisabled=0,1,2,3,4,5,6,7,8"
  );
  const toolbar = page.getByTestId("keyboard-hotbar");
  await page
    .getByRole("button", { exact: true, name: "Before hotbar" })
    .focus();
  await page.keyboard.press("Tab");
  await expect(toolbar).toBeFocused();
  await expect(toolbar).toHaveAttribute("tabindex", "0");
  await page.keyboard.press("ArrowRight");
  await expect(toolbar).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { exact: true, name: "After hotbar" })
  ).toBeFocused();
});

test("Hotbar honors explicit caller root tabIndex", async ({ page }) => {
  await page.goto("/?component=custom-api&hotbarKeyboard&hotbarTabIndex=-1");
  await expect(page.getByTestId("keyboard-hotbar")).toHaveAttribute(
    "tabindex",
    "-1"
  );
});

test("Hotbar navigates from focused slot when controlled selection is declined", async ({
  page,
}) => {
  await page.goto("/?component=custom-api&hotbarKeyboard&hotbarDecline");
  const toolbar = page.getByTestId("keyboard-hotbar");

  const slot = (name: string) =>
    toolbar.getByRole("button", { exact: true, name });

  await slot("Slot 1").focus();
  await page.keyboard.press("ArrowRight");
  await expect(slot("Slot 2")).toBeFocused();
  await expect(slot("Slot 1")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowRight");
  await expect(slot("Slot 3")).toBeFocused();
  await expect(page.getByTestId("hotbar-request")).toHaveText("2");
  await expect(slot("Slot 1")).toHaveAttribute("aria-pressed", "true");
});

test("Hotbar recomputes tab entry on real disabled-prop updates without stealing focus", async ({
  page,
}) => {
  await page.goto("/?component=custom-api&hotbarKeyboard");
  const toolbar = page.getByTestId("keyboard-hotbar");
  const first = toolbar.getByRole("button", { exact: true, name: "Slot 1" });
  const second = toolbar.getByRole("button", { exact: true, name: "Slot 2" });
  await first.focus();
  await page
    .getByRole("button", { exact: true, name: "Disable selected hotbar slot" })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
    });
  await expect(first).toBeDisabled();
  await expect(first).toHaveAttribute("tabindex", "-1");
  await expect(second).toHaveAttribute("tabindex", "0");
  await expect(second).not.toBeFocused();
  await page
    .getByRole("button", { exact: true, name: "Before hotbar" })
    .focus();
  await page.keyboard.press("Tab");
  await expect(second).toBeFocused();
  await page.getByRole("button", { exact: true, name: "After hotbar" }).focus();
  await page
    .getByRole("button", { exact: true, name: "Disable all hotbar slots" })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
    });
  await expect(toolbar).toHaveAttribute("tabindex", "0");
  await expect(
    page.getByRole("button", { exact: true, name: "After hotbar" })
  ).toBeFocused();
});
