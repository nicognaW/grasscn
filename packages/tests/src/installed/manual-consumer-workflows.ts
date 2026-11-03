import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import type * as PlaywrightTypes from "@playwright/test";

interface ConsumerPageObservation {
  consumerPage: PlaywrightTypes.Page;
}

type ConsumerPageVerification = ConsumerPageObservation & {
  expect: typeof PlaywrightTypes.expect;
};

type ConsumerCaptureVerification = ConsumerPageVerification & {
  output: string;
  framework: string;
};

/** @param {string | Uint8Array} bytes - Source bytes to hash. */
const hash = (bytes: string | Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

/**
 * @typedef {object} ConsumerPageObservation
 * @property {PlaywrightTypes.Page} consumerPage - The same live installed-consumer page used by the sequential owner.
 */
/**
 * @typedef {ConsumerPageObservation & {expect: typeof PlaywrightTypes.expect}} ConsumerPageVerification
 */
/**
 * @typedef {ConsumerPageVerification & {output:string,framework:string}} ConsumerCaptureVerification
 */

/** Verify the installed Button workflow, preserving its original sequential interactions and observations.
 * @param {ConsumerCaptureVerification} input - The owned page, pinned observer and framework evidence destination.
 * @returns {Promise<void>}
 */
export const verifyInstalledButton = async (
  input: ConsumerCaptureVerification
): Promise<void> => {
  const { consumerPage, expect, framework, output } = input;

  const button = consumerPage.getByRole("button", {
    exact: true,
    name: "Button",
  });

  await button.waitFor();
  await expect(button).toBeVisible();
  await button.screenshot({
    path: path.join(output, `${framework}-button-runtime.png`),
  });
};

/** Verify the installed Form workflow, preserving its original sequential interactions and observations.
 * @param {ConsumerPageVerification} input - The owned page and pinned observer.
 * @returns {Promise<void>}
 */
export const verifyInstalledForm = async (
  input: ConsumerPageVerification
): Promise<void> => {
  const { consumerPage, expect } = input;

  const form = consumerPage.getByRole("region", {
    exact: true,
    name: "Consumer form",
  });

  await form.getByRole("button", { exact: true, name: "Save player" }).click();
  await form.getByRole("alert").first().waitFor();
  await form
    .getByRole("textbox", { exact: true, name: "Player name" })
    .fill("Alex");
  await form
    .getByRole("textbox", { exact: true, name: "World name" })
    .fill("Consumer world");
  await form.getByRole("button", { exact: true, name: "Save player" }).click();
  await expect(
    form
      .getByRole("status", { exact: true, name: "Saved player" })
      .locator(":scope > [data-slot=label] > .mc-text-accessible")
  ).toHaveText("Alex");
  await expect(
    form
      .getByRole("status", { exact: true, name: "Saved world" })
      .locator(":scope > [data-slot=label] > .mc-text-accessible")
  ).toHaveText("Consumer world");
  await form.getByRole("button", { exact: true, name: "Reset" }).click();
  assert.equal(
    await form
      .getByRole("textbox", { exact: true, name: "Player name" })
      .inputValue(),
    ""
  );
  assert.equal(
    await form
      .getByRole("textbox", { exact: true, name: "World name" })
      .inputValue(),
    "My world"
  );
};

/** Verify the installed CodeBlock workflow, preserving its original sequential interactions and observations.
 * @param {ConsumerPageVerification} input - The owned page and pinned observer.
 * @returns {Promise<void>}
 */
export const verifyInstalledCodeBlock = async (
  input: ConsumerPageVerification
): Promise<void> => {
  const { consumerPage, expect } = input;

  const codeBlock = consumerPage.getByRole("region", {
    exact: true,
    name: "Consumer code-block",
  });

  await expect(
    codeBlock.locator('[data-slot="code-block-content"]')
  ).toContainText('const world = "Minecraft";');

  const renderedCode = codeBlock.locator(
    '[data-slot="code-block-content"] [data-mc-selectable-ready]'
  );

  await expect(renderedCode).toHaveCount(1);
  await expect(renderedCode).toHaveAttribute(
    "data-mc-selectable-ready",
    "true"
  );
  const renderedLabels = renderedCode.locator("[data-mc-label-ready]");
  await expect
    .poll(async () => await renderedLabels.count())
    .toBeGreaterThan(0);

  for (const label of await renderedLabels.all()) {
    await expect(label).toHaveAttribute("data-mc-label-ready", "true");
  }

  await codeBlock.getByRole("button", { exact: true, name: "Copy" }).click();
  await expect(
    codeBlock.getByRole("button", { exact: true, name: "Copied" })
  ).toHaveAttribute("data-copied", "true");
  assert.equal(
    await consumerPage.evaluate(
      async () => await navigator.clipboard.readText()
    ),
    'const world = "Minecraft";'
  );
};

/** Verify the installed PlayerPreviews workflow, preserving its original sequential interactions and observations.
 * @param {ConsumerCaptureVerification} input - The owned page, pinned observer and framework evidence destination.
 * @returns {Promise<Array<{initialSha256:string,model:string|null,resetSha256:string,rotatedSha256:string}>>} Original per-model canvas hashes and observed model attributes.
 */
export const verifyInstalledPlayerPreviews = async (
  input: ConsumerCaptureVerification
): Promise<
  {
    initialSha256: string;
    model: string | null;
    resetSha256: string;
    rotatedSha256: string;
  }[]
> => {
  const { consumerPage, expect, framework, output } = input;

  const steve = consumerPage.getByRole("group", {
    exact: true,
    name: "Steve preview",
  });

  const alex = consumerPage.getByRole("group", {
    exact: true,
    name: "Alex preview",
  });

  const webgl = [];
  await expect(
    consumerPage
      .getByRole("region", { exact: true, name: "Consumer player-preview" })
      .getByText("Skin ready", { exact: true })
  ).toBeVisible();

  for (const [index, preview] of [steve, alex].entries()) {
    await preview.scrollIntoViewIfNeeded();
    await preview.locator("canvas").waitFor({ state: "visible" });
    await consumerPage.waitForFunction(
      (label) => {
        const element = document.querySelector(`[aria-label="${label}"]`);

        // eslint-disable-next-line unicorn/prefer-dom-node-dataset -- Query selectors expose Element; the generic attribute API preserves the native readiness contract.
        return element?.getAttribute("data-ready") === "true";
      },
      await preview.getAttribute("aria-label")
    );
    await preview.focus();
    const before = await preview.locator("canvas").screenshot();
    await preview.press("ArrowRight");
    const rotated = await preview.locator("canvas").screenshot();
    assert.notEqual(
      hash(before),
      hash(rotated),
      "Keyboard rotation repaints the actual WebGL canvas"
    );
    await preview.press("Home");
    const reset = await preview.locator("canvas").screenshot();
    assert.equal(
      hash(reset),
      hash(before),
      "Home restores the default WebGL pose"
    );
    await writeFile(
      path.join(output, `${framework}-player-${index}.png`),
      reset
    );
    webgl.push({
      initialSha256: hash(before),
      model: await preview.getAttribute("data-model"),
      resetSha256: hash(reset),
      rotatedSha256: hash(rotated),
    });
  }

  assert.equal(await steve.getAttribute("data-model"), "wide");
  assert.equal(await alex.getAttribute("data-model"), "slim");

  return webgl;
};

/** Verify the installed Map workflow, preserving its original sequential interactions and observations.
 * @param {ConsumerPageObservation} input - Owned page for the installed map interaction.
 * @returns {Promise<void>}
 */
export const verifyInstalledMap = async (
  input: ConsumerPageObservation
): Promise<void> => {
  const { consumerPage } = input;

  const map = consumerPage.getByRole("region", {
    exact: true,
    name: "Consumer map",
  });

  await map.getByRole("button", { exact: true, name: "Camp" }).click();
  assert.equal(await map.locator("output").textContent(), "Camp");
};

/** Verify the installed Sign workflow, preserving its original sequential interactions and observations.
 * @param {ConsumerPageObservation} input - Owned page for the installed sign readiness observation.
 * @returns {Promise<void>}
 */
export const verifyInstalledSign = async (
  input: ConsumerPageObservation
): Promise<void> => {
  const { consumerPage } = input;

  const sign = consumerPage.getByRole("group", {
    exact: true,
    name: "Standing sign",
  });

  await sign.scrollIntoViewIfNeeded();
  await sign.locator("canvas").waitFor({ state: "visible" });
  await consumerPage.waitForFunction(() => {
    const element = document.querySelector(
      '[aria-label="Standing sign"] canvas'
    );

    // eslint-disable-next-line unicorn/prefer-dom-node-dataset -- Query selectors expose Element; the generic attribute API preserves the native readiness contract.
    return element?.getAttribute("data-ready") === "true";
  });
};

/** Verify the installed Trading workflow, preserving its original sequential interactions and observations.
 * @param {ConsumerPageVerification} input - The owned page and pinned observer.
 * @returns {Promise<void>}
 */
export const verifyInstalledTrading = async (
  input: ConsumerPageVerification
): Promise<void> => {
  const { consumerPage, expect } = input;

  const trading = consumerPage.getByRole("region", {
    exact: true,
    name: "Consumer trading",
  });

  await expect
    .poll(
      async () =>
        await trading.locator("img").evaluateAll((images) => {
          const sortedImageStates = images.map((image) =>
            image instanceof HTMLImageElement
              ? [
                  image.naturalWidth,
                  image.naturalHeight,
                  image.complete,
                  image.closest(".mc-trade-item") !== null,
                ]
              : null
          );

          sortedImageStates.sort((first, second) =>
            String(first).localeCompare(String(second))
          );

          return sortedImageStates;
        })
    )
    // adventureAssets declares villager 512x256, trade_arrow 10x9 and
    // scroller_disabled 6x27; the example supplies four 16x16 item icons.
    .toEqual([
      [10, 9, true, false],
      [16, 16, true, true],
      [16, 16, true, true],
      [16, 16, true, true],
      [16, 16, true, true],
      [512, 256, true, false],
      [6, 27, true, false],
    ]);
  await trading
    .getByRole("button", { exact: true, name: "Trade for Bread" })
    .click();
  await expect(trading.getByRole("status")).toHaveText("1 trades completed");
};

/** Verify the installed Resizable workflow, preserving its original sequential interactions and observations.
 * @param {ConsumerPageVerification} input - The owned page and pinned observer.
 * @returns {Promise<void>}
 */
export const verifyInstalledResizable = async (
  input: ConsumerPageVerification
): Promise<void> => {
  const { consumerPage, expect } = input;

  const resizable = consumerPage.getByRole("region", {
    exact: true,
    name: "Consumer resizable",
  });

  const handle = resizable.getByRole("separator", {
    name: "Resize inventory panels",
  });

  await handle.focus();
  await handle.press("ArrowRight");
  await expect
    .poll(async () => Number(await handle.getAttribute("aria-valuenow")))
    .toBeGreaterThan(50);
  await resizable
    .getByRole("button", { exact: true, name: "Reset panels" })
    .click();
  await expect(handle).toHaveAttribute("aria-valuenow", "50");
};

/** Verify the installed Sidebar workflow, preserving its original sequential interactions and observations.
 * @param {ConsumerCaptureVerification} input - The owned page, pinned observer and framework evidence destination.
 * @returns {Promise<void>}
 */
export const verifyInstalledSidebar = async (
  input: ConsumerCaptureVerification
): Promise<void> => {
  const { consumerPage, expect, framework, output } = input;

  const sidebar = consumerPage.getByRole("region", {
    exact: true,
    name: "Consumer sidebar",
  });

  const sidebarTrigger = sidebar.getByRole("button", {
    name: "Toggle world navigation",
  });

  await sidebarTrigger.click();
  await expect(sidebar.locator('[data-slot="sidebar"]')).toHaveAttribute(
    "data-state",
    "collapsed"
  );
  await consumerPage.setViewportSize({ height: 844, width: 390 });
  await sidebarTrigger.click();

  const sidebarDialog = consumerPage.getByRole("dialog", {
    exact: true,
    name: "Sidebar",
  });

  await expect(
    sidebarDialog.getByRole("link", { exact: true, name: "Worlds" })
  ).toBeVisible();
  await consumerPage.screenshot({
    path: path.join(output, `${framework}-sidebar-mobile.png`),
  });
  await consumerPage.keyboard.press("Escape");
  await expect(sidebarDialog).not.toBeVisible();
  await consumerPage.setViewportSize({ height: 900, width: 1280 });
};

/** Verify the installed DataTable workflow, preserving its original sequential interactions and observations.
 * @param {ConsumerPageVerification} input - The owned page and pinned observer.
 * @returns {Promise<void>}
 */
export const verifyInstalledDataTable = async (
  input: ConsumerPageVerification
): Promise<void> => {
  const { consumerPage, expect } = input;

  const table = consumerPage.getByRole("region", {
    exact: true,
    name: "Consumer data-table",
  });

  await expect(table.getByLabel("World selection")).toContainText(
    "Page 1 of 2"
  );
  await table.getByRole("button", { exact: true, name: "Next" }).click();
  await expect(table.getByLabel("World selection")).toContainText(
    "Page 2 of 2"
  );
  await table
    .getByRole("textbox", { exact: true, name: "Filter worlds" })
    .fill("Grasslands");
  await table.getByRole("row").filter({ hasText: "Grasslands" }).click();
  await expect(table.getByLabel("World selection")).toContainText("1 selected");
  await table
    .getByRole("textbox", { exact: true, name: "Filter worlds" })
    .fill("missing world");
  await expect(
    table.getByRole("cell", { exact: true, name: "No results." })
  ).toBeVisible();
};

/** Verify the installed DatePicker workflow, preserving its original sequential interactions and observations.
 * @param {ConsumerPageVerification} input - The owned page and pinned observer.
 * @returns {Promise<void>}
 */
export const verifyInstalledDatePicker = async (
  input: ConsumerPageVerification
): Promise<void> => {
  const { consumerPage, expect } = input;

  const datePicker = consumerPage.getByRole("region", {
    exact: true,
    name: "Consumer date-picker",
  });

  await datePicker
    .getByRole("button", { exact: true, name: "Pick a day" })
    .click();

  const datePopup = consumerPage.locator('[data-slot="date-picker-content"]');

  await datePopup.getByRole("button", { name: /October 15.*2026/u }).click();
  await expect(
    datePicker.getByRole("button", {
      exact: true,
      name: "October 15th, 2026",
    })
  ).toBeVisible();
  await expect(datePopup).toBeVisible();
  await consumerPage.keyboard.press("Escape");
  await expect(datePopup).toHaveCount(0);
};

/** Verify the installed MessageScroller workflow, preserving its original sequential interactions and observations.
 * @param {ConsumerPageVerification} input - The owned page and pinned observer.
 * @returns {Promise<void>}
 */
export const verifyInstalledMessageScroller = async (
  input: ConsumerPageVerification
): Promise<void> => {
  const { consumerPage, expect } = input;

  const message = consumerPage.getByRole("region", {
    exact: true,
    name: "Consumer message-scroller",
  });

  const viewport = message.getByLabel("Player chat", { exact: true });
  await message.getByRole("button", { exact: true, name: "First" }).click();
  await expect
    .poll(async () => await viewport.evaluate((element) => element.scrollTop))
    .toBe(0);
  await message
    .getByRole("textbox", { exact: true, name: "Message text" })
    .fill("Bring torches.");
  await message.getByRole("button", { exact: true, name: "Send" }).click();
  await expect(message.getByLabel("Message count")).toHaveText("13 messages");
  await message.getByRole("button", { exact: true, name: "Latest" }).click();
  await expect(message.getByRole("log")).toContainText("Bring torches.");
  await expect
    .poll(
      async () =>
        await viewport.evaluate(
          (element) =>
            element.scrollHeight - element.clientHeight - element.scrollTop
        )
    )
    .toBeLessThan(2);
};

/** Verify the installed AlertDialog workflow, preserving its original sequential interactions and observations.
 * @param {ConsumerPageVerification} input - The owned page and pinned observer.
 * @returns {Promise<void>}
 */
export const verifyInstalledAlertDialog = async (
  input: ConsumerPageVerification
): Promise<void> => {
  const { consumerPage, expect } = input;

  const alert = consumerPage.getByRole("region", {
    exact: true,
    name: "Consumer alert-dialog",
  });

  const alertTrigger = alert.getByRole("button", {
    exact: true,
    name: "Delete world",
  });

  await alertTrigger.click();

  const alertDialog = consumerPage.getByRole("alertdialog", {
    exact: true,
    name: "Delete this world?",
  });

  await alertDialog.getByRole("button", { exact: true, name: "Yes" }).click();
  await expect(alertDialog).toHaveCount(0);
  await expect(alert.getByLabel("Confirmed deletions")).toHaveText(
    "1 confirmed"
  );
  await expect(alertTrigger).toBeFocused();
};

/** Verify the installed CommandPalette workflow, preserving its original sequential interactions and observations.
 * @param {ConsumerPageVerification} input - The owned page and pinned observer.
 * @returns {Promise<void>}
 */
export const verifyInstalledCommandPalette = async (
  input: ConsumerPageVerification
): Promise<void> => {
  const { consumerPage, expect } = input;

  const command = consumerPage.getByRole("region", {
    exact: true,
    name: "Consumer command",
  });

  const commandTrigger = command.getByRole("button", {
    exact: true,
    name: "Open command palette",
  });

  await commandTrigger.click();

  const commandDialog = consumerPage.getByRole("dialog", {
    exact: true,
    name: "World commands",
  });

  await commandDialog
    .getByRole("option", { exact: true, name: "Save world" })
    .click();
  await expect(commandDialog).toHaveCount(0);
  await expect(command.getByLabel("Palette selection")).toHaveText("save");
  await expect(commandTrigger).toBeFocused();
};
