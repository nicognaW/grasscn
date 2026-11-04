import { test } from "bun:test";
import assert from "node:assert/strict";

import { RedstoneLampDisplay } from "@grasscn/web/ui/redstone-lamp-display";
import { renderToStaticMarkup } from "react-dom/server";

// The lamp pixels render asynchronously in the browser. The first paint,
// server-rendered or not, must already be a valid named image at its final
// size, not an <img> without a source.

const ATTRIBUTE = /(?<name>[\w-]+)="(?<value>[^"]*)"/gu;

const attributes = (html: string) =>
  new Map<string | undefined, string | undefined>(
    [...html.matchAll(ATTRIBUTE)].map((match) => [
      match.groups?.name,
      match.groups?.value,
    ])
  );

test("Redstone Lamp display first paint is a named image of its final size with a source", () => {
  const html = renderToStaticMarkup(
    <RedstoneLampDisplay
      value="12k"
      aria-label="Star grasscn on GitHub, 12k stars"
    />
  );

  assert.match(html, /^<img [^>]*\/>$/u);

  const image = attributes(html);

  assert.equal(image.get("alt"), "Star grasscn on GitHub, 12k stars");
  assert.equal(image.get("aria-label"), "Star grasscn on GitHub, 12k stars");
  // Three glyphs and two gap columns of 8 px lamp cells, five rows tall.
  assert.equal(image.get("width"), "88");
  assert.equal(image.get("height"), "40");
  assert.match(image.get("src") ?? "", /^data:image\/[a-z+]+[;,]/u);
  // The lamp pixels are not there yet.
  assert.equal(image.get("data-rendered"), undefined);
});
