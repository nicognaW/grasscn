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

test("Header star button without a count shows the nether star and the GitHub label", () => {
  const html = renderToStaticMarkup(<StarButton />);

  // The star is a decorative 32x32 GUI-scale-2 canvas; the visible GitHub
  // label follows it so visitors can tell where the button leads.
  assert.match(
    html,
    /<span data-slot="star-button-star"><canvas aria-hidden="true" data-slot="nether-star" height="32" width="32"><\/canvas><\/span><span data-slot="star-button-label">.*GitHub.*<\/span><\/a>$/u
  );
});

test("Header star button shows the GitHub label between the star and the lamp display", () => {
  const html = renderToStaticMarkup(<StarButton count="12k" />);
  const star = html.indexOf('data-slot="nether-star"');
  const label = html.indexOf('data-slot="star-button-label"');
  const display = html.indexOf('data-slot="redstone-lamp-display"');

  assert.ok(star < label && label < display);
  assert.ok(html.slice(label, display).includes("GitHub"));
});

test("Header star button shows the nether star before the lamp display", () => {
  const html = renderToStaticMarkup(<StarButton count="12k" />);
  const star = html.indexOf('data-slot="nether-star"');
  const display = html.indexOf('data-slot="redstone-lamp-display"');

  assert.ok(star !== -1 && display !== -1);
  assert.ok(star < display);
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
