import { test, expect } from "@grasscn/tests/test";
import type { Page } from "@playwright/test";

interface CodeBlockClipboardState {
  __copied?: string;
}

const ready = async function ready(page: Page) {
  const readOnlyItems9 = await page.locator("[data-mc-selectable-ready]").all();

  const readOnlyResults9 = await Promise.allSettled(
    readOnlyItems9.map(async (text) => {
      await expect(text).toHaveAttribute("data-mc-selectable-ready", "true");
    })
  );

  for (const readOnlyResult9 of readOnlyResults9) {
    if (readOnlyResult9.status === "rejected") {
      throw readOnlyResult9.reason;
    }
  }

  const readOnlyItems10 = await page.locator("[data-mc-label-ready]").all();

  const readOnlyResults10 = await Promise.allSettled(
    readOnlyItems10.map(async (text) => {
      await expect(text).toHaveAttribute("data-mc-label-ready", "true");
    })
  );

  for (const readOnlyResult10 of readOnlyResults10) {
    if (readOnlyResult10.status === "rejected") {
      throw readOnlyResult10.reason;
    }
  }
};

test("CodeBlock all eight exports retain semantics, ref, keyboard focus and real multiline selection", async ({
  page,
}) => {
  await page.goto("?component=code-block&lines=1");
  await ready(page);

  const readOnlyItems11 = [
    "code-block",
    "code-block-header",
    "code-block-title",
    "code-block-actions",
    "code-block-copy-button",
    "code-block-content",
    "code-block-line",
    "code-block-footer",
  ];

  const readOnlyResults11 = await Promise.allSettled(
    readOnlyItems11.map(async (slot) => {
      await expect(page.locator(`[data-slot=${slot}]`).first()).toBeVisible();
    })
  );

  for (const readOnlyResult11 of readOnlyResults11) {
    if (readOnlyResult11.status === "rejected") {
      throw readOnlyResult11.reason;
    }
  }

  await page.locator("#read-ref").click();
  await expect(page.locator("#tag")).toHaveText("PRE");
  const subject = page.locator("[data-subject]");
  await subject.focus();
  await expect(subject).toBeFocused();

  const selection = await subject.evaluate((el) => {
    const range = document.createRange();
    const requiredElement15 = el.querySelector("code");

    if (requiredElement15 === null) {
      throw new Error("Missing required dom query");
    }

    range.selectNodeContents(requiredElement15);
    const browserSelection = getSelection();

    if (browserSelection === null) {
      throw new Error("Missing required browser selection: browserSelection");
    }

    browserSelection.removeAllRanges();
    browserSelection.addRange(range);

    return browserSelection.toString();
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
    const requiredElement17 = el.querySelector("code");

    if (requiredElement17 === null) {
      throw new Error("Missing required dom query");
    }

    range.selectNodeContents(requiredElement17);
    const selection = getSelection();

    if (selection === null) {
      throw new Error("Missing required browser selection: selection");
    }

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
        // oxlint-disable-next-line typescript/promise-function-async -- This browser API stub records synchronously and returns its original fulfilled Promise; async would change throw and Promise-adoption timing.
        writeText: (value: string) => {
          // SAFETY: This owned writeText mock creates __copied with its string argument only when a clipboard write occurs.
          (window as typeof window & CodeBlockClipboardState).__copied = value;

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
  expect(
    await page.evaluate(
      () =>
        // SAFETY: The paired mock writes strings to __copied; before any write this optional property remains absent.
        (window as typeof window & CodeBlockClipboardState).__copied
    )
  ).toBe("First\n\n你好 世界\nLast");
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
        // oxlint-disable-next-line typescript/promise-function-async -- This browser API stub records synchronously and returns its original fulfilled Promise; async would change throw and Promise-adoption timing.
        writeText: (value: string) => {
          // SAFETY: This owned writeText mock creates __copied with its string argument only when a clipboard write occurs.
          (window as typeof window & CodeBlockClipboardState).__copied = value;

          return Promise.resolve();
        },
      },
    })
  );
  await page.goto("?component=code-block&cancel=1");
  await page.getByRole("button", { exact: true, name: "Copy" }).click();
  expect(
    await page.evaluate(
      () =>
        // SAFETY: The paired mock writes strings to __copied; before any write this optional property remains absent.
        (window as typeof window & CodeBlockClipboardState).__copied
    )
  ).toBeUndefined();
  await page.goto("?component=code-block&disabled=1");
  await expect(
    page.getByRole("button", { exact: true, name: "Copy" })
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () =>
        // SAFETY: The paired mock writes strings to __copied; before any write this optional property remains absent.
        (window as typeof window & CodeBlockClipboardState).__copied
    )
  ).toBeUndefined();
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
  await expect(page.locator("[data-mc-code-token]").first()).toBeVisible();
  await ready(page);

  const colors = await page
    .locator("[data-mc-code-token]")
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

for (const mode of ["object", "callback"] as const) {
  test(`SelectableText composes its private painter with a public ${mode} ref`, async ({
    page,
  }) => {
    await page.goto(
      `?component=code-block&selectableRef=${mode}&text=Hello%20World`
    );
    const subject = page.getByTestId("selectable-ref-subject");
    const tag = page.getByLabel("Selectable ref tag", { exact: true });
    const events = page.getByLabel("Selectable ref callbacks", { exact: true });

    const intrinsic = page.getByLabel("Intrinsic ref callbacks", {
      exact: true,
    });

    await expect(subject).toHaveAttribute("data-mc-selectable-ready", "true");
    await expect(subject).toHaveAttribute("data-consumer", "ref-test");
    await expect(subject).toHaveAttribute("title", "Consumer selectable text");
    await expect(subject).toHaveClass(/select-text/u);
    await page
      .getByRole("button", { exact: true, name: "Read selectable ref" })
      .click();
    await expect(tag).toHaveText("SPAN");

    if (mode === "callback") {
      await expect(events).toHaveText("attach:SPAN");
      await expect(intrinsic).toHaveText("attach:SPAN");
    }

    await page
      .getByRole("button", { exact: true, name: "Update selectable text" })
      .click();
    await expect(subject).toHaveAttribute("data-mc-selectable-ready", "true");
    await expect(subject.locator(".mc-selectable-raw")).toHaveText(
      "Hello World!"
    );

    if (mode === "callback") {
      await expect(events).toHaveText("attach:SPAN");
      await expect(intrinsic).toHaveText("attach:SPAN");
    }

    await page
      .getByRole("button", { exact: true, name: "Toggle selectable" })
      .click();
    await expect(subject).toHaveCount(0);
    await page
      .getByRole("button", { exact: true, name: "Read selectable ref" })
      .click();
    await expect(tag).toHaveText("missing");

    if (mode === "callback") {
      await expect(events).toHaveText("attach:SPAN|cleanup:false");
      await expect(intrinsic).toHaveText("attach:SPAN|cleanup:false");
    }

    await page
      .getByRole("button", { exact: true, name: "Toggle selectable" })
      .click();
    await expect(subject).toHaveAttribute("data-mc-selectable-ready", "true");
    await page
      .getByRole("button", { exact: true, name: "Read selectable ref" })
      .click();
    await expect(tag).toHaveText("SPAN");

    if (mode === "callback") {
      await expect(events).toHaveText("attach:SPAN|cleanup:false|attach:SPAN");
      await expect(intrinsic).toHaveText(
        "attach:SPAN|cleanup:false|attach:SPAN"
      );
    }
  });
}
