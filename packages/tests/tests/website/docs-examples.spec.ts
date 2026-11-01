import { readFile } from "node:fs/promises";

import { test, expect } from "@grasscn/tests/test";

test("Button documentation connects its executable example, complete code and implementation source", async ({
  page,
}) => {
  await page.goto(
    `${process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176"}/docs/components/button`
  );
  const example = page.getByRole("region", {
    name: "Button example",
    exact: true,
  });
  await expect(
    example.getByRole("button", { name: "Button", exact: true })
  ).toBeVisible();
  await example.getByRole("tab", { name: "Preview", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(
    example.getByRole("tab", { name: "Code", exact: true })
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
        writeText: async (text: string) => {
          (window as unknown as { copiedCode: string }).copiedCode = text;
        },
      },
    });
  });
  await example.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(example.getByRole("status")).toHaveText("Copied");
  const copied = await page.evaluate(
    () => (window as unknown as { copiedCode: string }).copiedCode
  );
  expect(copied).toContain("export default function ButtonExample()");
  expect(copied).toMatch(/\}\s*$/);
  const implementation = page.getByRole("region", {
    name: "Button implementation source",
    exact: true,
  });
  await expect(implementation).toContainText("Component implementation");
  await expect(implementation).toContainText("components/ui/button.tsx");
  await expect(
    implementation.getByRole("button", { name: "Expand", exact: true })
  ).toHaveAttribute("aria-expanded", "false");
  await implementation
    .getByRole("button", { name: "Copy", exact: true })
    .click();
  await expect(implementation.getByRole("status")).toHaveText("Copied");
  expect(
    await page.evaluate(
      () => (window as unknown as { copiedCode: string }).copiedCode
    )
  ).toBe(
    await readFile(
      new URL("../../../../apps/web/registry/ui/button.tsx", import.meta.url),
      "utf8"
    )
  );
  await implementation
    .getByRole("button", { name: "Expand", exact: true })
    .click();
  await expect(implementation.locator("pre")).toContainText(
    "export { Button, buttonVariants }"
  );
  await implementation
    .getByRole("button", { name: "Collapse", exact: true })
    .click();
  await expect(
    implementation.getByRole("button", { name: "Expand", exact: true })
  ).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("heading", { name: "Interactive playground", exact: true })
  ).toBeVisible();
});
