import { test, expect } from "@grasscn/tests/test";

test("Typography retains native text inside semantic headings and prose elements", async ({
  page,
}) => {
  for (const [part, tag] of Object.entries({
    blockquote: "BLOCKQUOTE",
    code: "CODE",
    h1: "H1",
    h2: "H2",
    h3: "H3",
    h4: "H4",
    large: "DIV",
    lead: "P",
    muted: "P",
    p: "P",
    small: "SMALL",
  })) {
    await page.goto(`/?component=typography&part=${part}&text=Hello%20世界`);
    const subject = page.locator("[data-subject]");
    await expect(subject).toHaveAttribute("data-mc-label-layout-ready", "true");
    await expect(subject).toHaveText(/Hello 世界/);
    expect(await subject.evaluate((node) => node.tagName)).toBe(tag);
  }
});

test("Typography preserves wrapping, line breaks and full accessible heading names", async ({
  page,
}) => {
  const text = "Hello 世界\nこんにちは\n안녕하세요";
  await page.goto(
    `/?component=typography&part=h1&text=${encodeURIComponent(text)}&wrapWidth=80`
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Hello 世界 こんにちは 안녕하세요",
    })
  ).toBeVisible();
  await expect(page.locator("[data-subject] > .mc-label-line")).toHaveCount(3);
});

test("Typography asChild keeps consumer links, refs and events", async ({
  page,
}) => {
  await page.goto("/?component=typography&asChild=1&text=Continue");
  const subject = page.getByRole("link", { name: "Continue" });
  await expect(subject).toHaveAttribute("href", "#destination");
  await subject.click();
  await expect(page.locator("#events")).toHaveText("1");
  await page.locator("#read-ref").click();
  await expect(page.locator("#tag")).toHaveText("A");
});

test("Rich Typography children retain semantic markup", async ({ page }) => {
  await page.goto("/?component=typography&rich=1&text=Rich%20content");
  await expect(page.locator("[data-subject] strong")).toHaveText(
    "Rich content"
  );
});

test("Breadcrumb supplies nav, ordered list, link destinations and a current page", async ({
  page,
}) => {
  await page.goto("/?component=breadcrumb");
  const nav = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(nav.locator("ol")).toHaveCount(1);
  await expect(
    nav.getByRole("link", { exact: true, name: "Home" })
  ).toHaveAttribute("href", "#home");
  await expect(
    nav.getByRole("link", { exact: true, name: "World" })
  ).toHaveAttribute("href", "#world");
  const current = nav.getByRole("link", { exact: true, name: "Current page" });
  await expect(current).toHaveAttribute("aria-current", "page");
  await expect(current).toHaveAttribute("aria-disabled", "true");
  expect(await current.getAttribute("tabindex")).toBeNull();
  await expect(
    nav.locator("[data-slot=breadcrumb-separator][aria-hidden=true]")
  ).toHaveCount(3);
  await expect(nav.locator("[data-slot=breadcrumb-ellipsis]")).toHaveAttribute(
    "aria-hidden",
    "true"
  );
});

test("Breadcrumb links preserve keyboard navigation, composed anchors and refs", async ({
  page,
}) => {
  await page.goto("/?component=breadcrumb&native=1&asChild=1&text=World");
  const subject = page.getByRole("link", { exact: true, name: "World" });
  await subject.focus();
  await expect(subject).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#destination$/);
  await expect(page.locator("#events")).toHaveText("1");
  await page.locator("#read-ref").click();
  await expect(page.locator("#tag")).toHaveText("A");
});

test("Badge supports native plain/CJK content, rich children and asChild links", async ({
  page,
}) => {
  for (const suffix of [
    "text=Hello%20世界",
    "text=Rich&rich=1",
    "text=Continue&asChild=1",
  ]) {
    await page.goto(`/?component=badge&${suffix}`);
    const subject = page.locator("[data-subject]");
    await expect(subject).toBeVisible();

    if (suffix.includes("rich")) {
      await expect(subject.locator("strong")).toHaveText("Rich");
    }

    if (suffix.includes("asChild")) {
      await expect(subject).toHaveAttribute("href", "#destination");
      await subject.click();
      await expect(page.locator("#events")).toHaveText("1");
      await page.locator("#read-ref").click();
      await expect(page.locator("#tag")).toHaveText("A");
    } else if (suffix.includes("世界")) {
      for (const line of await subject.locator("[data-mc-label-ready]").all()) {
        await expect(line).toHaveAttribute("data-mc-label-ready", "true");
      }
    }
  }
});

test("Kbd exposes keyboard semantics and refs without inventing button semantics", async ({
  page,
}) => {
  await page.goto("/?component=kbd&text=Ctrl");
  const subject = page.locator("[data-subject]");
  expect(await subject.evaluate((node) => node.tagName)).toBe("KBD");
  expect(await subject.getAttribute("tabindex")).toBeNull();
  await expect(
    page.getByRole("button", { exact: true, name: "Ctrl" })
  ).toHaveCount(0);
  await page.locator("#read-ref").click();
  await expect(page.locator("#tag")).toHaveText("KBD");
  await expect(page.locator("[data-slot=kbd-group] kbd")).toHaveCount(2);
});

test("Text and passive keyboard components remain silent on pointer and keyboard interaction", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).sounds = [];
    HTMLMediaElement.prototype.play = function play() {
      (window as any).sounds.push(this.src);

      return Promise.resolve();
    };
  });

  for (const component of ["badge", "typography", "breadcrumb", "kbd"]) {
    await page.goto(
      `/?component=${component}&native=1&asChild=1&text=Continue`
    );
    await page.locator("[data-subject]").hover();
    await page.locator("[data-subject]").click();
    expect(await page.evaluate(() => (window as any).sounds)).toEqual([]);
  }
});
