import { test, expect } from "@grasscn/tests/test";
import { documentationRegistry } from "@tests/checks/documentation-inventory.mjs";

const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/u, "/");

for (const scale of [2]) {
  test(`Form embeds Field with accessible validation, CJK, multiline notes and reset GUI${scale}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${origin}docs/components/form`);
    await expect(page.locator(".documentation-playground")).toHaveCount(1);
    const card = page.locator(".documentation-playground");
    await expect(card).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
      "Form"
    );
    const form = card.getByRole("form", { name: "Player and world settings" });

    const name = form.getByRole("textbox", {
      exact: true,
      name: "Player name",
    });

    const world = form.getByRole("textbox", {
      exact: true,
      name: "World name",
    });

    const notes = form.getByRole("textbox", {
      exact: true,
      name: "Journey notes",
    });
    await expect(form.locator("[data-slot=field-set]")).toHaveCount(1);
    await expect(form.locator("[data-slot=field]")).toHaveCount(3);
    await form
      .getByRole("button", { exact: true, name: "Save player" })
      .click();
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(
      form.getByRole("alert").filter({ hasText: "Enter your player name" })
    ).toBeVisible();
    expect(
      await name.evaluate((n) =>
        (n.getAttribute("aria-describedby") ?? "")
          .split(" ")
          .every(
            (id) => id !== "" && !!document.querySelector(`#${CSS.escape(id)}`)
          )
      )
    ).toBe(true);
    await name.fill("你");
    await form
      .getByRole("button", { exact: true, name: "Save player" })
      .click();
    await expect(
      form.getByRole("alert").filter({ hasText: "Use at least two characters" })
    ).toBeVisible();
    await name.fill("你好世界");
    await world.fill("草地方块");
    await notes.fill("第一行\nSecond line\n第三行");
    await form
      .getByRole("button", { exact: true, name: "Save player" })
      .click();
    await expect(
      card
        .getByLabel("Saved player")
        .locator(":scope > [data-slot=label] > .mc-text-accessible")
    ).toHaveText("你好世界");
    await expect(
      card
        .getByLabel("Saved world")
        .locator(":scope > [data-slot=label] > .mc-text-accessible")
    ).toHaveText("草地方块");
    await expect(name).toHaveAttribute("aria-invalid", "false");
    await expect(notes).toHaveValue("第一行\nSecond line\n第三行");

    for (const control of [name, world, notes]) {
      await expect(control).toHaveAttribute("spellcheck", "false");
      expect(
        await control.evaluate((n) =>
          Number(getComputedStyle(n).getPropertyValue("--mc-scale"))
        )
      ).toBe(scale);
    }

    await card
      .getByRole("button", { exact: true, name: "Disable fields" })
      .click();

    for (const control of [
      name,
      world,
      notes,
      form.getByRole("button", { exact: true, name: "Save player" }),
    ]) {
      await expect(control).toBeDisabled();
    }

    await card
      .getByRole("button", { exact: true, name: "Enable fields" })
      .click();
    await form.getByRole("button", { exact: true, name: "Reset" }).click();
    await expect(name).toHaveValue("");
    await expect(world).toHaveValue("My world");
    await expect(notes).toHaveValue("");
    await expect(card.getByLabel("Saved player")).toHaveCount(0);
    await world.fill("");
    await form
      .getByRole("button", { exact: true, name: "Save player" })
      .click();
    await expect(
      form.getByRole("alert").filter({ hasText: "Enter a world name" })
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("Field is independently documented while installed through Form", async ({
  page,
}) => {
  await page.goto(`${origin}docs/components/field`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Field"
  );
  const nav = page.getByRole("navigation", { name: "Documentation" });
  await expect(
    nav.getByRole("link", { exact: true, name: "Form" })
  ).toHaveCount(1);
  await expect(
    nav.getByRole("link", { exact: true, name: "Field" })
  ).toHaveCount(1);

  const registry = documentationRegistry();
  const form = registry.find((item) => item.name === "form");
  expect(form).toBeDefined();
  expect(
    form?.files?.some((file) => file.path === "registry/ui/field.tsx")
  ).toBe(true);
  expect(registry.some((item) => item.name === "field")).toBe(false);
  await expect(
    page.getByRole("region", {
      exact: true,
      name: "Field implementation source",
    })
  ).toContainText("components/ui/field.tsx");
});
