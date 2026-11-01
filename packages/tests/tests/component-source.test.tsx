import { test, expect } from "bun:test";

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
  expect(html).toContain("components/ui/field.tsx");
  expect(html).toContain("FieldSet");
  expect(html).not.toContain("function FormExample");
  const unavailable = renderToStaticMarkup(
    await ComponentSource({
      name: "form",
      initialFile: "registry/ui/not-owned.tsx",
    })
  );
  expect(unavailable.replace(/<[^>]*>/g, "")).toContain(
    "Component source unavailable"
  );
});
