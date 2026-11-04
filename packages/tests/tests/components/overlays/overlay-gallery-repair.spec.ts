import { expectNotNull } from "@grasscn/tests/assertions";
import { test, expect } from "@grasscn/tests/test";

const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/u, "/");

for (const scale of [2]) {
  test(`Drawer fitting content has no phantom scroll extent at GUI${scale}`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 1000, width: 1440 });
    await page.goto(`${origin}docs/components/drawer`);

    const trigger = page
      .locator(".documentation-playground")
      .getByRole("button", { name: "Open drawer" });

    await trigger.click();
    const panel = page.locator("[data-slot=drawer-content]");
    await expect(panel).toBeVisible();
    await expect
      .poll(
        async () => await panel.evaluate((e) => e.scrollHeight - e.clientHeight)
      )
      .toBeLessThanOrEqual(2);
    await page.getByRole("button", { exact: true, name: "Done" }).click();
    await expect(trigger).toBeFocused();
  });
  test(`Avatar group count follows native face size and GUI${scale}`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await page.goto(`${origin}docs/components/avatar`);

    const stage = page.locator("[data-stage=avatar]");
    const group = stage.locator("[data-slot=avatar-group]");

    await group.scrollIntoViewIfNeeded();
    await expect
      .poll(async () => {
        const face = await group
          .locator("[data-slot=avatar]")
          .first()
          .boundingBox();

        expectNotNull(face, "Missing required bounding box: face");

        const count = await group
          .locator("[data-slot=avatar-group-count]")
          .boundingBox();

        expectNotNull(count, "Missing required bounding box: count");

        return Math.abs(face.height - count.height);
      })
      .toBe(0);
    await expect(stage).toContainText("6 people in this workspace");
    await expect(stage.getByRole("button", { name: /Hat:/u })).toHaveCount(0);
    await expect(
      stage.getByRole("button", { exact: true, name: "Load player" })
    ).toBeVisible();
  });
  test(`Mobile AlertDialog CJK text and actions remain usable at GUI${scale}`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await page.goto(`${origin}docs/components/alert-dialog`);
    const stage = page.locator("[data-stage=alert-dialog]");
    await stage.scrollIntoViewIfNeeded();
    await page
      .getByLabel("Alert dialog title", { exact: true })
      .fill("世界設定を削除しますか？");
    await page
      .getByLabel("Alert dialog message", { exact: true })
      .fill(
        [
          ...Array.from(
            { length: 14 },
            () => "这是一个很长的描述。请确认您是否删除世界。"
          ),
          "LAST世界",
        ].join("\n")
      );
    const trigger = stage.getByRole("button", { name: "Open confirmation" });
    await trigger.click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toHaveAttribute("data-mc-confirmation-ready", "true");
    await expect
      .poll(async () => {
        const r = await dialog.boundingBox();
        expectNotNull(r, "Missing required bounding box: r");

        return (
          r.x >= 0 && r.y >= 0 && r.x + r.width <= 390 && r.y + r.height <= 844
        );
      })
      .toBe(true);

    const readOnlyItems19 = ["Yes", "No"];

    const readOnlyResults19 = await Promise.allSettled(
      readOnlyItems19.map(async (name) => {
        const r = await dialog
          .getByRole("button", { exact: true, name })
          .boundingBox();

        expectNotNull(r, "Missing required bounding box: r");

        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.x + r.width).toBeLessThanOrEqual(390);
        expect(r.y + r.height).toBeLessThanOrEqual(844);
      })
    );

    for (const readOnlyResult19 of readOnlyResults19) {
      if (readOnlyResult19.status === "rejected") {
        throw readOnlyResult19.reason;
      }
    }

    if (scale > 1) {
      const header = dialog.locator("[data-slot=alert-dialog-header]");
      await header.evaluate((e) => {
        e.scrollTop = e.scrollHeight;
      });
      await expect
        .poll(async () => {
          const a = await header.boundingBox();
          expectNotNull(a, "Missing required bounding box: a");

          const b = await dialog
            .locator(".mc-alert-dialog-description .mc-card-text-line")
            .last()
            .boundingBox();

          expectNotNull(b, "Missing required bounding box: b");

          return b.y >= a.y && b.y + b.height <= a.y + a.height + 1;
        })
        .toBe(true);
    }

    await dialog.getByRole("button", { exact: true, name: "No" }).click();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
}

test("Short viewport AlertDialog layout remains stable while resizing", async ({
  page,
}) => {
  await page.setViewportSize({ height: 240, width: 1440 });
  await page.goto(`${origin}docs/components/alert-dialog`);
  await page
    .getByLabel("Alert dialog message", { exact: true })
    .fill(Array.from({ length: 14 }, () => "Long description 世界").join("\n"));
  await page.getByRole("button", { name: "Open confirmation" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toHaveAttribute("data-mc-confirmation-compact", "true");
  await expect
    .poll(async () => {
      const b = await dialog.boundingBox();
      expectNotNull(b, "Missing required bounding box: b");

      return b.y >= 0 && b.y + b.height <= 240;
    })
    .toBe(true);
  await page.setViewportSize({ height: 1000, width: 1536 });
  await expect(dialog).toHaveAttribute("data-mc-confirmation-compact", "false");
});
