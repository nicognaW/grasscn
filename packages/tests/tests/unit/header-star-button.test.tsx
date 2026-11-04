import { test } from "bun:test";
import assert from "node:assert/strict";

import { renderToStaticMarkup } from "react-dom/server";

import { StarButton } from "../../../../apps/web/components/star-button";

// The live preview always shows whatever GitHub currently reports, so the
// server-rendered header button covers the two states it cannot force.

test("Header star button without a count keeps its link and drops the lamp display", () => {
  const html = renderToStaticMarkup(<StarButton />);

  assert.match(
    html,
    /^<a [^>]*href="https:\/\/github\.com\/nicognaW\/grasscn"/u
  );
  assert.match(html, /aria-label="Star grasscn on GitHub"/u);
  assert.ok(html.includes('target="_blank"'));
  assert.ok(html.includes('data-slot="star-button-star"'));
  assert.ok(!html.includes('data-slot="redstone-lamp-display"'));
});

test("Header star button shows 0 stars as 0 on the lamp display", () => {
  const html = renderToStaticMarkup(<StarButton count="0" />);

  assert.match(html, /aria-label="Star grasscn on GitHub, 0 stars"/u);
  // A single glyph is 3 lamps wide; an empty or longer value would differ.
  assert.match(
    html,
    /<img [^>]*data-slot="redstone-lamp-display"[^>]*width="24"[^>]*height="40"/u
  );
});
