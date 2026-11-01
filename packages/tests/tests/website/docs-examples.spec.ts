import { readFile } from "node:fs/promises";

import { test, expect } from "@grasscn/tests/test";

// These properties capture clipboard writes performed by this test page.
declare global {
  interface Window {
    copiedCode: string;
  }
}

test("Button documentation connects its executable example, complete code and implementation source", async ({
  page,
}) => {
  await page.goto(
    `${process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176"}/docs/components/button`
  );

  const example = page.getByRole("region", {
    exact: true,
    name: "Button example",
  });

  await expect(
    example.getByRole("button", { exact: true, name: "Button" })
  ).toBeVisible();
  await example.getByRole("tab", { exact: true, name: "Preview" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(
    example.getByRole("tab", { exact: true, name: "Code" })
  ).toHaveAttribute("aria-selected", "true");
  const source = example.locator("pre");
  await expect(source).toContainText(
    'import { Button } from "@/components/ui/button"'
  );
  await expect(source).toContainText('"use client"');
  await expect(source).toContainText(
    "return <Button scale={2}>Button</Button>"
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        // eslint-disable-next-line require-await -- The clipboard mock preserves the asynchronous browser API while recording its supplied text synchronously.
        writeText: async (text: string) => {
          window.copiedCode = text;
        },
      },
    });
  });
  await example.getByRole("button", { exact: true, name: "Copy" }).click();
  await expect(example.getByRole("status")).toHaveText("Copied");

  const copied = await page.evaluate(() => window.copiedCode);

  expect(copied).toContain("const ButtonExample =");
  expect(copied).toContain("export default ButtonExample");
  expect(copied).toMatch(/export default ButtonExample;?\s*$/u);

  const implementation = page.getByRole("region", {
    exact: true,
    name: "Button implementation source",
  });

  await expect(implementation).toContainText("Component implementation");
  await expect(implementation).toContainText("components/ui/button.tsx");
  await expect(
    implementation.getByRole("button", { exact: true, name: "Expand" })
  ).toHaveAttribute("aria-expanded", "false");
  await implementation
    .getByRole("button", { exact: true, name: "Copy" })
    .click();
  await expect(implementation.getByRole("status")).toHaveText("Copied");
  expect(await page.evaluate(() => window.copiedCode)).toBe(
    await readFile(
      new URL("../../../../apps/web/registry/ui/button.tsx", import.meta.url),
      "utf-8"
    )
  );
  await implementation
    .getByRole("button", { exact: true, name: "Expand" })
    .click();
  await expect(implementation.locator("pre")).toContainText(
    "export { Button, buttonVariants }"
  );
  await implementation
    .getByRole("button", { exact: true, name: "Collapse" })
    .click();
  await expect(
    implementation.getByRole("button", { exact: true, name: "Expand" })
  ).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("heading", { exact: true, name: "Interactive playground" })
  ).toBeVisible();
});
