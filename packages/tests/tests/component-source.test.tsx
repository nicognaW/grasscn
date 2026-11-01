import assert from "node:assert/strict";
import { test } from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import { ComponentSource } from "../../../apps/web/components/component-source";

test("Field source selects its owned implementation and rejects files outside Form", async () => {
  const html = renderToStaticMarkup(
    await ComponentSource({
      name: "form",
      title: "Field",
      initialFile: "registry/ui/field.tsx",
    })
  );
  assert.ok(html.includes("components/ui/field.tsx"));
  assert.ok(html.includes("FieldSet"));
  assert.ok(!html.includes("function FormExample"));
  const unavailable = renderToStaticMarkup(
    await ComponentSource({
      name: "form",
      initialFile: "registry/ui/not-owned.tsx",
    })
  );
  assert.ok(
    unavailable.replace(/<[^>]*>/g, "").includes("Component source unavailable")
  );
});
