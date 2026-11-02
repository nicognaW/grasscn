import { expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import BreadcrumbExample from "../examples/layout/breadcrumb-example";

test("copied breadcrumb example supplies ordered destinations and current-page semantics", () => {
  const html = renderToStaticMarkup(<BreadcrumbExample />);
  expect(html).toContain('aria-label="Breadcrumb"');
  expect(html).toContain("<ol");
  expect(html).toContain('href="#preview"');
  expect(html).toContain('href="#usage"');
  expect(html).toContain('aria-current="page"');
  expect(html).toContain('aria-disabled="true"');
});
