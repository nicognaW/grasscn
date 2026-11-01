import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import TableExample from "../../../apps/web/examples/overlays/table-example";

test("the copied world table exposes its caption, column headers and complete data", () => {
  const html = renderToStaticMarkup(createElement(TableExample));
  expect(html).toContain("Saved worlds");
  expect(html).toContain('scope="col"');
  expect(html).toContain("Grasslands");
  expect(html).toContain("Deep Dark");
  expect(html).toContain("<caption");
});
