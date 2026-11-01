import { expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import BookExample from "../examples/minecraft/book-example";

test("field guide starts on the first page with only forward paging available", () => {
  const html = renderToStaticMarkup(<BookExample />);
  expect(html).toContain('aria-label="Field guide"');
  expect(html).toContain('aria-label="Page 1"');
  expect(html).toContain('aria-label="Next page"');
  expect(html).not.toContain('aria-label="Previous page"');
});
