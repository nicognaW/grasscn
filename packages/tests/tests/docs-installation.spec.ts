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
  await page.reload();
  await expect(
    installation.getByRole("tab", { name: "Bun", exact: true })
  ).toHaveAttribute("aria-selected", "true");
});
