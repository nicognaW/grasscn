import { test, expect } from "@grasscn/tests/test";

const ready = async function ready(page: any) {
  for (const text of await page.locator("[data-mc-selectable-ready]").all()) {
    await expect(text).toHaveAttribute("data-mc-selectable-ready", "true");
  }

  for (const text of await page.locator("[data-mc-label-ready]").all()) {
    await expect(text).toHaveAttribute("data-mc-label-ready", "true");
  }
};

test("CodeBlock all eight exports retain semantics, ref, keyboard focus and real multiline selection", async ({
  page,
}) => {
  await page.goto("?component=code-block&lines=1");
  await ready(page);

  for (const slot of [
    "code-block",
    "code-block-header",
    "code-block-title",
    "code-block-actions",
    "code-block-copy-button",
    "code-block-content",
    "code-block-line",
    "code-block-footer",
  ]) {
    await expect(page.locator(`[data-slot=${slot}]`).first()).toBeVisible();
  }

  await page.locator("#read-ref").click();
  await expect(page.locator("#tag")).toHaveText("PRE");
  const subject = page.locator("[data-subject]");
  await subject.focus();
  await expect(subject).toBeFocused();

  const selection = await subject.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el.querySelector("code")!);
    const selection = getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    return selection.toString();
  });

  expect(selection).toBe("Added 世界\n\nRemoved\nHighlight");
  expect(
    await page
      .locator('[data-slot="code-block-line-content"]')
      .nth(1)
      .textContent()
  ).toBe("\n");
});

test("CodeBlock scalar CJK selection preserves original newlines without duplicate overlay text", async ({
  page,
}) => {
  await page.goto("?component=code-block&");
  await ready(page);

  const selected = await page.locator("[data-subject]").evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el.querySelector("code")!);
    const selection = getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    return selection.toString();
  });

  expect(selected).toBe("First\n\n你好 世界\nLast");
});

test("Copy uses mocked clipboard, live state and reset timer", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: (value: string) => {
          (window as any).__copied = value;

          return Promise.resolve();
        },
      },
    })
  );
  await page.goto("?component=code-block&");
  await page.getByRole("button", { exact: true, name: "Copy" }).click();
  await expect(
    page.getByRole("button", { exact: true, name: "Copied" })
  ).toHaveAttribute("data-copied", "true");
  expect(await page.evaluate(() => (window as any).__copied)).toBe(
    "First\n\n你好 世界\nLast"
  );
  await expect(
    page.getByRole("button", { exact: true, name: "Copy" })
  ).toBeVisible({ timeout: 4000 });
});

test("Canceled or disabled copy remains silent and does not write", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: (value: string) => {
          (window as any).__copied = value;

          return Promise.resolve();
        },
      },
    })
  );
  await page.goto("?component=code-block&cancel=1");
  await page.getByRole("button", { exact: true, name: "Copy" }).click();
  expect(await page.evaluate(() => (window as any).__copied)).toBeUndefined();
  await page.goto("?component=code-block&disabled=1");
  await expect(
    page.getByRole("button", { exact: true, name: "Copy" })
  ).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__copied)).toBeUndefined();
});

test("Wrap creates real lines, line numbers retain startLine and blank lines", async ({
  page,
}) => {
  await page.goto(
    "?component=code-block&wrap=1&numbers=1&text=Hello%20Minecraft%20world%20with%20a%20long%20line%0A%0ALast"
  );
  await ready(page);
  await expect(page.locator("[data-subject]")).toHaveAttribute(
    "data-wrap",
    "true"
  );
  await expect(page.locator("[data-subject]")).toHaveAttribute(
    "data-numbered",
    "true"
  );
  await expect(page.locator("[data-subject]")).toHaveCSS(
    "counter-reset",
    "line 6"
  );
  await expect(page.locator('[data-slot="code-block-line"]')).toHaveCount(3);
  expect(
    await page
      .locator(".mc-selectable-pixels")
      .first()
      .locator(":scope>span")
      .count()
  ).toBeGreaterThan(1);
});

test("Official streaming highlighter preserves lines/language aliases and native syntax colors", async ({
  page,
}) => {
  await page.goto(
    "?component=code-block&highlight=1&language=ts&text=const%20x%20%3D%20%22hello%22%3B%0A%2F%2F%20comment"
  );
  await expect(page.locator(".mc-code-token").first()).toBeVisible();
  await ready(page);

  const colors = await page
    .locator(".mc-code-token")
    .evaluateAll((nodes) => [
      ...new Set(nodes.map((n) => getComputedStyle(n).color)),
    ]);

  expect(colors).toContain("rgb(255, 85, 255)");
  expect(colors).toContain("rgb(85, 255, 85)");
  await page
    .getByLabel("Code input")
    .fill('const x = "hello";\n// comment\nconst y = 42');
  await expect(page.locator('[data-slot="code-block-line"]')).toHaveCount(3);
});
