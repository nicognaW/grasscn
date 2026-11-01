import { readFile } from "node:fs/promises";

import { test, expect } from "./verified-test";

test("Button installation copies and remembers the visitor package manager", async ({
  page,
}) => {
  const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176";
  await page.goto(`${origin}/docs/components/button`);
  const installation = page.getByRole("region", {
    name: "Button installation",
    exact: true,
  });
  await expect(installation).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as unknown as { copied: string }).copied = value;
        },
      },
    });
  });
  const commands = {
    npm: `npx shadcn@latest add ${origin}/r/button.json`,
    pnpm: `pnpm dlx shadcn@latest add ${origin}/r/button.json`,
    Yarn: `yarn dlx shadcn@latest add ${origin}/r/button.json`,
    Bun: `bunx --bun shadcn@latest add ${origin}/r/button.json`,
  };
  for (const [manager, command] of Object.entries(commands)) {
    await installation.getByRole("tab", { name: manager, exact: true }).click();
    await installation
      .getByRole("button", { name: "Copy", exact: true })
      .click();
    await expect(installation.getByRole("status")).toHaveText("Copied");
    expect(
      await page.evaluate(
        () => (window as unknown as { copied: string }).copied
      )
    ).toBe(command);
  }
  await installation.getByRole("tab", { name: "Bun", exact: true }).focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await expect(
    installation.getByRole("tab", { name: "Yarn", exact: true })
  ).toHaveAttribute("aria-selected", "true");
  await page.reload();
  await expect(
    installation.getByRole("tab", { name: "Yarn", exact: true })
  ).toHaveAttribute("aria-selected", "true");
});

test("Button manual installation exposes complete files and defers large resources", async ({
  page,
}) => {
  const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176";
  const sourceRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/installation/button/"))
      sourceRequests.push(request.url());
  });
  await page.goto(`${origin}/docs/components/button`);
  const installation = page.getByRole("region", {
    name: "Button installation",
    exact: true,
  });
  expect(sourceRequests).toEqual([]);
  await installation.getByRole("tab", { name: "Manual", exact: true }).click();
  const registry = JSON.parse(
    await readFile(
      new URL("../../../apps/web/registry.json", import.meta.url),
      "utf8"
    )
  );
  const item = registry.items.find(
    (entry: { name: string }) => entry.name === "button"
  );
  const files = installation.getByRole("navigation", {
    name: "Manual files",
    exact: true,
  });
  await expect(files.getByRole("button")).toHaveCount(item.files.length);
  for (const file of item.files) {
    await expect(
      files.getByRole("button", {
        name: file.path.split("/").at(-1),
        exact: true,
      })
    ).toBeAttached();
  }
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as unknown as { copied: string }).copied = value;
        },
      },
    });
  });
  await files
    .getByRole("button", { name: "minecraft-unifont-data.ts", exact: true })
    .click();
  const file = installation.getByRole("region", {
    name: "Selected manual file",
    exact: true,
  });
  await expect(file).toContainText("components/ui/minecraft-unifont-data.ts");
  await expect(file).toContainText("Load this resource when needed");
  const countBeforeCopy = sourceRequests.length;
  await file
    .getByRole("button", { name: "Copy full file", exact: true })
    .click();
  await expect(file.getByRole("status")).toHaveText("Copied complete file");
  expect(sourceRequests.length).toBe(countBeforeCopy + 1);
  const font = await readFile(
    new URL(
      "../../../apps/web/registry/ui/minecraft-unifont-data.ts",
      import.meta.url
    ),
    "utf8"
  );
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied)
  ).toBe(font);
  await files
    .getByRole("button", { name: "minecraft-button.css", exact: true })
    .click();
  await expect(file.getByRole("status")).not.toContainText("Copied");
  await file.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(file.getByRole("status")).toHaveText("Copied");
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied)
  ).toBe(
    await readFile(
      new URL(
        "../../../apps/web/registry/ui/minecraft-button.css",
        import.meta.url
      ),
      "utf8"
    )
  );
  await files
    .getByRole("button", { name: "minecraft-unifont-data.ts", exact: true })
    .click();
  await expect(file.getByRole("status")).not.toContainText("Copied");
  const downloadEvent = page.waitForEvent("download");
  await file.getByRole("link", { name: "Download", exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("minecraft-unifont-data.ts");
  expect(await readFile((await download.path())!, "utf8")).toBe(font);
});
