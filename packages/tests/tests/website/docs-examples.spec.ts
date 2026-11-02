import { readFile } from "node:fs/promises";
import path from "node:path";

import { test, expect } from "@grasscn/tests/test";
import { webRoot } from "@tests/paths";

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

  const filename = await example
    .locator("[data-example-installation]")
    .getAttribute("data-example-installation");

  expect(filename).not.toBeNull();

  if (filename === null || filename === "" || path.isAbsolute(filename)) {
    throw new Error("Example must declare an owner-relative executable file");
  }

  const examplesRoot = path.join(webRoot, "examples");
  const executablePath = path.resolve(examplesRoot, filename);
  const relative = path.relative(examplesRoot, executablePath);

  if (
    !relative ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error("Example executable escapes its examples owner");
  }

  const executable = await readFile(executablePath, "utf-8");

  await expect(source).toContainText(
    'import { Button } from "@/components/ui/button"'
  );
  await expect(source).toContainText('"use client"');
  await expect
    .poll(async () => {
      const displayed = await source.textContent();

      return displayed?.replaceAll("\r\n", "\n");
    })
    .toBe(executable.replaceAll("\r\n", "\n"));

  const selectedCode = await source.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    return selection?.toString() ?? "";
  });

  expect(selectedCode).toBe(executable.replaceAll("\r\n", "\n"));
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

  expect(copied).toBe(executable);
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
