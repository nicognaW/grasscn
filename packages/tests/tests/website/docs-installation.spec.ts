import { readFile, writeFile } from "node:fs/promises";

import { test, expect } from "@grasscn/tests/test";
import { documentationRegistry } from "@tests/checks/documentation-inventory.mjs";

// These properties capture clipboard writes performed by this test page.
declare global {
  interface Window {
    copied: string;
  }
}

for (const width of [320, 390]) {
  test(`package manager labels remain readable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width });
    await page.goto(
      `${process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176"}/docs/components/button`
    );

    const installation = page.getByRole("region", {
      exact: true,
      name: "Button installation",
    });

    const tabs = installation.getByRole("tablist", {
      name: "Installation package manager",
    });

    await expect(tabs).toHaveAttribute("data-mc-tabs-ready", "true");
    await expect
      .poll(
        async () =>
          await tabs.getByRole("tab").evaluateAll((elements) =>
            elements.flatMap((element) => {
              const frame = element
                .querySelector(".mc-tab-label-window")
                ?.getBoundingClientRect();

              const label = element
                .querySelector(".mc-tab-label")
                ?.getBoundingClientRect();

              return frame &&
                label &&
                (label.left < frame.left || label.right > frame.right)
                ? [element.textContent]
                : [];
            })
          )
      )
      .toEqual([]);
    await tabs.getByRole("tab", { exact: true, name: "Bun" }).click();
    await expect(
      tabs.getByRole("tab", { exact: true, name: "Bun" })
    ).toHaveAttribute("aria-selected", "true");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBe(width);
  });
}

test("Button installation copies and remembers the visitor package manager", async ({
  page,
}) => {
  const { origin } = new URL(
    process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176"
  );

  await page.goto(`${origin}/docs/components/button`);

  const installation = page.getByRole("region", {
    exact: true,
    name: "Button installation",
  });

  await expect(installation).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        // eslint-disable-next-line require-await -- The clipboard mock preserves the asynchronous browser API while recording its supplied text synchronously.
        writeText: async (value: string) => {
          window.copied = value;
        },
      },
    });
  });

  const commands = {
    Bun: `bunx --bun shadcn@latest add ${origin}/r/button.json`,
    Yarn: `yarn dlx shadcn@latest add ${origin}/r/button.json`,
    npm: `npx shadcn@latest add ${origin}/r/button.json`,
    pnpm: `pnpm dlx shadcn@latest add ${origin}/r/button.json`,
  };

  for (const [manager, command] of Object.entries(commands)) {
    await installation.getByRole("tab", { exact: true, name: manager }).click();
    await installation
      .getByRole("button", { exact: true, name: "Copy" })
      .click();
    await expect(installation.getByRole("status")).toHaveText("Copied");
    expect(await page.evaluate(() => window.copied)).toBe(command);
  }

  await installation.getByRole("tab", { exact: true, name: "Bun" }).focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await expect(
    installation.getByRole("tab", { exact: true, name: "Yarn" })
  ).toHaveAttribute("aria-selected", "true");
  await page.reload();
  await expect(
    installation.getByRole("tab", { exact: true, name: "Yarn" })
  ).toHaveAttribute("aria-selected", "true");
});

test("Button manual installation exposes complete files and defers large resources", async ({
  page,
}, info) => {
  const { origin } = new URL(
    process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176"
  );

  const sourceRequests: string[] = [];
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname.startsWith("/api/installation/button/")
    ) {
      sourceRequests.push(request.url());
    }
  });
  await page.goto(`${origin}/docs/components/button`);

  const installation = page.getByRole("region", {
    exact: true,
    name: "Button installation",
  });

  expect(sourceRequests).toEqual([]);
  await installation.getByRole("tab", { exact: true, name: "Manual" }).click();

  const registry = documentationRegistry();
  const item = registry.find((entry) => entry.name === "button");
  expect(item).toBeDefined();

  if (item?.files === undefined) {
    throw new Error("Button manual source files required");
  }

  const files = installation.getByRole("navigation", {
    exact: true,
    name: "Manual files",
  });

  await expect(files.getByRole("button")).toHaveCount(item.files.length);

  for (const file of item.files) {
    await expect(
      files.getByRole("button", {
        exact: true,
        name: file.path.split("/").at(-1),
      })
    ).toBeAttached();
  }

  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        // eslint-disable-next-line require-await -- The clipboard mock preserves the asynchronous browser API while recording its supplied text synchronously.
        writeText: async (value: string) => {
          window.copied = value;
        },
      },
    });
  });

  const dependencyCommand = installation.getByRole("region", {
    exact: true,
    name: "Dependencies: Terminal",
  });

  await dependencyCommand
    .getByRole("button", { exact: true, name: "Copy" })
    .click();
  await expect(dependencyCommand.getByRole("status")).toHaveText("Copied");
  expect(await page.evaluate(() => window.copied)).toBe(
    "npm install class-variance-authority @base-ui/react"
  );
  await files
    .getByRole("button", { exact: true, name: "minecraft-unifont-data.ts" })
    .click();

  const file = installation.getByRole("region", {
    exact: true,
    name: "Selected manual file",
  });

  await expect(file).toContainText("components/ui/minecraft-unifont-data.ts");
  await expect(file).toContainText("Load this resource when needed");
  const countBeforeCopy = sourceRequests.length;
  await file
    .getByRole("button", { exact: true, name: "Copy full file" })
    .click();
  await expect(file.getByRole("status")).toHaveText("Copied complete file");
  expect(sourceRequests.length).toBe(countBeforeCopy + 1);

  const font = await readFile(
    new URL(
      "../../../../apps/web/registry/ui/minecraft-unifont-data.ts",
      import.meta.url
    ),
    "utf-8"
  );

  expect(await page.evaluate(() => window.copied)).toBe(font);
  await files
    .getByRole("button", { exact: true, name: "minecraft-button.css" })
    .click();
  await expect(file.getByRole("status")).not.toContainText("Copied");
  await file.getByRole("button", { exact: true, name: "Copy" }).click();
  await expect(file.getByRole("status")).toHaveText("Copied");
  expect(await page.evaluate(() => window.copied)).toBe(
    await readFile(
      new URL(
        "../../../../apps/web/registry/ui/minecraft-button.css",
        import.meta.url
      ),
      "utf-8"
    )
  );
  await files
    .getByRole("button", { exact: true, name: "minecraft-unifont-data.ts" })
    .click();
  await expect(file.getByRole("status")).not.toContainText("Copied");
  const downloadEvent = page.waitForEvent("download");
  await file.getByRole("link", { exact: true, name: "Download" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("minecraft-unifont-data.ts");
  expect(await readFile(await download.path(), "utf-8")).toBe(font);
  await page.mouse.move(0, 0);
  await installation.screenshot({
    path: info.outputPath("installation-desktop-actual.png"),
  });
  await page.setViewportSize({ height: 844, width: 390 });
  await writeFile(
    info.outputPath("installation-mobile-overflow.json"),
    JSON.stringify(
      await page.evaluate(() =>
        [...document.querySelectorAll("body *")].flatMap((element) => {
          const record = {
            class: element.className,
            right: element.getBoundingClientRect().right,
            tag: element.tagName,
            text: element.textContent?.slice(0, 120),
            width: element.getBoundingClientRect().width,
          };

          return record.right > 390.5 ? [record] : [];
        })
      ),
      null,
      2
    )
  );
  await expect
    .poll(
      async () =>
        await page.evaluate(() => document.documentElement.scrollWidth)
    )
    .toBeLessThanOrEqual(390);
  await installation.screenshot({
    path: info.outputPath("installation-mobile-actual.png"),
  });
});
