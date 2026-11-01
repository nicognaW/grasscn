import { test } from "bun:test";
import assert from "node:assert/strict";

import { webRoot } from "@grasscn/tests/paths";
import { renderToStaticMarkup } from "react-dom/server";

import { ComponentSource } from "../../../../apps/web/components/component-source";

test("Field source selects its owned implementation and rejects files outside Form", async () => {
  const previous = process.cwd();
  process.chdir(webRoot);

  try {
    const html = renderToStaticMarkup(
      await ComponentSource({
        initialFile: "registry/ui/field.tsx",
        name: "form",
        title: "Field",
      })
    );

    assert.ok(html.includes("components/ui/field.tsx"));
    assert.ok(html.includes("FieldSet"));
    assert.ok(!html.includes("function FormExample"));

    const unavailable = renderToStaticMarkup(
      await ComponentSource({
        initialFile: "registry/ui/not-owned.tsx",
        name: "form",
      })
    );

    assert.ok(
      unavailable
        .replaceAll(/<[^>]*>/gu, "")
        .includes("Component source unavailable")
    );
  } finally {
    process.chdir(previous);
  }
});
