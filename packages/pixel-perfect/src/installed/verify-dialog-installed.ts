import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { DialogReferenceCase } from "@ppt/installed/reference-case";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

interface InstalledDialogCase {
  c: DialogReferenceCase;
  manifestFile: string;
  name: string;
  page: Page;
  url: string;
}

const dialogParameters = (
  c: DialogReferenceCase,
  name: string,
  confirmation: boolean
) => {
  const params = new URLSearchParams({
    component: name,
    label: c.label,
    labels: JSON.stringify(c.labels),
    native: "1",
    scale: String(c.scale),
    state: c.state,
  });

  if (confirmation) {
    params.set("native", "1");
    params.set("blur", String(c.value));
  } else {
    params.set("wrapWidth", String(c.wrapWidth));
  }

  const optionalText = c.text;

  if (optionalText !== null && optionalText !== undefined) {
    params.set("text", optionalText);
  }

  const optionalDisabledIndex = c.disabledIndex;

  if (optionalDisabledIndex !== null && optionalDisabledIndex !== undefined) {
    params.set("disabledIndex", String(c.disabledIndex));
  }

  if (c.checked ?? false) {
    params.set("patterned", "1");
  }

  return params;
};

export const verifyDialogCase = async ({
  c,
  manifestFile,
  name,
  page,
  url,
}: InstalledDialogCase) => {
  const confirmation = name === "alert-dialog";

  const params = dialogParameters(c, name, confirmation);

  await page.goto(`${url}?${params}`);
  await page.addStyleTag({
    content: `html,body{background:${c.background}} #root{opacity:0}`,
  });
  const dialog = page.getByRole(confirmation ? "alertdialog" : "dialog");
  await expect(dialog).toHaveAttribute(
    confirmation ? "data-mc-confirmation-ready" : "data-mc-dialog-ready",
    "true"
  );

  if (confirmation) {
    // The AlertDialog capture producer always emits text; Dialog alone also records null text cases.
    const confirmationText = c.text!;

    const count =
      Number(/\P{ASCII}/u.test(c.label)) +
      (/\P{ASCII}/u.test(confirmationText)
        ? confirmationText.split("\n").length
        : 0) +
      c.labels.filter((label) => /\P{ASCII}/u.test(label)).length;

    if (count) {
      await expect(dialog.locator("[data-mc-label-ready]")).toHaveCount(count);

      {
        const readyElements = await dialog
          .locator("[data-mc-label-ready]")
          .all();

        const readinessResults = await Promise.allSettled(
          readyElements.map(async (line) => {
            await expect(line).toHaveAttribute("data-mc-label-ready", "true");
          })
        );

        const rejectedReadiness = readinessResults.find(
          (result) => result.status === "rejected"
        );

        if (rejectedReadiness) {
          throw rejectedReadiness.reason;
        }
      }
    }

    await expect(
      page.locator('[data-slot="alert-dialog-overlay"]')
    ).toHaveAttribute("data-mc-confirmation-gpu-ready", "true");
  } else {
    await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveAttribute(
      "data-mc-backdrop-ready",
      "true"
    );

    if (/\P{ASCII}/u.test((c.label ?? "") + (c.text ?? ""))) {
      await expect(
        dialog.locator("[data-mc-dialog-unicode-ready]")
      ).toHaveCount(3);

      {
        const readyElements = await dialog
          .locator("[data-mc-dialog-unicode-ready]")
          .all();

        const readinessResults = await Promise.allSettled(
          readyElements.map(async (line) => {
            await expect(line).toHaveAttribute(
              "data-mc-dialog-unicode-ready",
              "true"
            );
          })
        );

        const rejectedReadiness = readinessResults.find(
          (result) => result.status === "rejected"
        );

        if (rejectedReadiness) {
          throw rejectedReadiness.reason;
        }
      }
    }
  }

  await page.mouse.move(0, 0);
  const button = dialog.getByRole("button").nth(c.targetIndex ?? 0);

  if (c.state === "hover") {
    await button.hover();
  }

  if (c.state === "focus") {
    await button.focus();
  }

  await page.evaluate(async () => {
    const frameCompletion5 = Promise.withResolvers();

    try {
      requestAnimationFrame(() => {
        requestAnimationFrame(frameCompletion5.resolve);
      });
    } catch (error) {
      frameCompletion5.reject(error);
    }

    return await frameCompletion5.promise;
  });

  const bytes = await readFile(
    pixelPerfectFile(path.join(path.dirname(manifestFile), "captures", c.name))
  );

  assert.equal(sha(bytes), c.sha256);

  const expected = PNG.sync.read(bytes);
  const actual = PNG.sync.read(await page.screenshot());

  assert.deepEqual(
    [actual.width, actual.height],
    [expected.width, expected.height]
  );
  assert.ok(
    actual.data.equals(expected.data),
    `Installed pixels differ: ${c.name}`
  );

  return {
    decodedRgbaSha256: sha(actual.data),
    mismatchedPixels: 0,
    name: c.name,
  };
};
