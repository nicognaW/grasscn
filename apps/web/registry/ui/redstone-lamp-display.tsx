"use client";

import * as React from "react";

import { nextMipLevel } from "./minecraft-block-atlas";
import type { RgbaImage } from "./minecraft-block-atlas";
import { redstoneLampTextures } from "./minecraft-redstone-lamp-assets";

// Glyphs are 3x5 walls of Redstone Lamps; "#" is a lit lamp and "." an unlit
// one. Glyph shapes and composition are a declared web adaptation.
const GLYPHS = new Map<string, readonly string[]>([
  ["0", ["###", "#.#", "#.#", "#.#", "###"]],
  ["1", [".#.", "##.", ".#.", ".#.", "###"]],
  ["2", ["###", "..#", "###", "#..", "###"]],
  ["3", ["###", "..#", "###", "..#", "###"]],
  ["4", ["#.#", "#.#", "###", "..#", "..#"]],
  ["5", ["###", "#..", "###", "..#", "###"]],
  ["6", ["###", "#..", "###", "#.#", "###"]],
  ["7", ["###", "..#", "..#", "..#", "..#"]],
  ["8", ["###", "#.#", "###", "#.#", "###"]],
  ["9", ["###", "#.#", "###", "..#", "###"]],
  ["k", ["#..", "#.#", "##.", "#.#", "#.#"]],
]);

// One lamp block is 8 window pixels: the 16 px textures render at half size,
// so the GPU samples block-atlas mip level 1.
const CELL = 8;
const GLYPH_ROWS = 5;

// The projected reference scene (ADR 0005, case in
// packages/pixel-perfect/tests/reference/redstone-lamp-display): the wall's
// south faces point at a front-on orthographic camera on the wall's centre
// line, 9.5 blocks away, at noon under a clear open sky.
const CAMERA_DISTANCE = 9.5;

// ModelBlockRenderer: south faces are shaded 0.8, packed into the vertex
// colour byte; the noon sky lightmap texel is white.
const SOUTH_FACE_SHADE = 204;

// FogRenderer / AtmosphericFogEnvironment at noon in plains: environmental
// fog runs linearly from 0 to 1024 blocks towards the sky fog colour;
// render-distance fog starts beyond the wall.
const FOG_COLOR = [181, 208, 255] as const;
const FOG_END = 1024;

const f = Math.fround;

const decodeTexture = async (source: string): Promise<RgbaImage> => {
  const image = new Image();
  image.src = source;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("Canvas 2D is unavailable");
  }

  context.drawImage(image, 0, 0);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);

  return {
    data: Uint8Array.from(data),
    height: canvas.height,
    width: canvas.width,
  };
};

// terrain.vsh: the fog distance is length(pos) per vertex, in float.
const vertexDistance = (x: number, y: number) =>
  f(
    Math.sqrt(f(f(f(x * x) + f(y * y)) + f(CAMERA_DISTANCE * CAMERA_DISTANCE)))
  );

// Vertex distances are interpolated across the quad's two triangles:
// (top-left, bottom-left, bottom-right) and (bottom-right, top-right, top-left).
const interpolatedDistance = (
  left: number,
  top: number,
  u: number,
  v: number
) => {
  const topLeft = vertexDistance(left, top);
  const bottomLeft = vertexDistance(left, top - 1);
  const bottomRight = vertexDistance(left + 1, top - 1);
  const topRight = vertexDistance(left + 1, top);

  return v >= u
    ? (1 - v) * topLeft + (v - u) * bottomLeft + u * bottomRight
    : (1 - u) * topLeft + (u - v) * topRight + v * bottomRight;
};

const glyphRows = (value: string) => {
  const glyphs = value.split("").map((character) => {
    const glyph = GLYPHS.get(character);

    if (glyph === undefined) {
      throw new Error(`RedstoneLampDisplay cannot show "${character}"`);
    }

    return glyph;
  });

  if (glyphs.length === 0) {
    throw new Error("RedstoneLampDisplay needs a value");
  }

  // Glyphs are separated by one unlit lamp column.
  return Array.from({ length: GLYPH_ROWS }, (_, row) =>
    glyphs.map((glyph) => glyph[row]).join(".")
  );
};

const renderWall = (
  rows: readonly string[],
  lit: RgbaImage,
  unlit: RgbaImage
) => {
  const columns = rows[0]?.length ?? 0;
  const width = columns * CELL;
  const height = rows.length * CELL;
  const pixels = new ImageData(width, height);
  const shade = f(SOUTH_FACE_SHADE / 255);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const column = Math.floor(x / CELL);
      const row = Math.floor(y / CELL);
      const texture = rows[row]?.[column] === "#" ? lit : unlit;
      const texel = ((y % CELL) * texture.width + (x % CELL)) * 4;

      // Camera-relative block edges of this cell, then level-1 texel centres.
      const distance = interpolatedDistance(
        column - columns / 2,
        rows.length / 2 - row,
        ((x % CELL) + 0.5) / CELL,
        ((y % CELL) + 0.5) / CELL
      );

      const fog = f(distance / FOG_END);
      const target = (y * width + x) * 4;

      for (let component = 0; component < 3; component += 1) {
        const color = f(
          f((texture.data[texel + component] ?? 0) / 255) * shade
        );

        const fogColor = f((FOG_COLOR[component] ?? 0) / 255);
        const mixed = f(f(color * f(1 - fog)) + f(fogColor * fog));

        pixels.data[target + component] = Math.floor(mixed * 255 + 0.5);
      }

      pixels.data[target + 3] = 255;
    }
  }

  return pixels;
};

let mipLevels: Promise<{ lit: RgbaImage; unlit: RgbaImage }> | undefined;

const lampMipLevels = async () => {
  mipLevels ??= Promise.all([
    decodeTexture(redstoneLampTextures.lit),
    decodeTexture(redstoneLampTextures.unlit),
  ]).then(([lit, unlit]) => ({
    lit: nextMipLevel(lit),
    unlit: nextMipLevel(unlit),
  }));

  return await mipLevels;
};

const renderDataUrl = async (rows: readonly string[]) => {
  const { lit, unlit } = await lampMipLevels();
  const pixels = renderWall(rows, lit, unlit);
  const canvas = document.createElement("canvas");
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  canvas.getContext("2d")?.putImageData(pixels, 0, 0);

  return canvas.toDataURL("image/png");
};

// Until the lamp pixels are ready (and on the server) the image shows a
// transparent placeholder of its final size, so the first paint is already a
// valid named image that reserves its space.
const placeholder = (width: number, height: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"/>`
  )}`;

export interface RedstoneLampDisplayProps extends Omit<
  React.ComponentProps<"img">,
  "alt" | "children" | "height" | "role" | "src" | "width"
> {
  /** Glyphs 0-9 and k; any other character throws. */
  value: string;
}

export const RedstoneLampDisplay = ({
  value,
  "aria-label": ariaLabel,
  ...props
}: RedstoneLampDisplayProps) => {
  const label = ariaLabel ?? value;
  const rows = glyphRows(value);
  const key = rows.join("/");

  const [rendered, setRendered] = React.useState<{
    key: string;
    url: string;
  }>();

  React.useEffect(() => {
    let current = true;

    const render = async () => {
      const url = await renderDataUrl(key.split("/"));

      if (current) {
        setRendered({ key, url });
      }
    };

    void render();

    return () => {
      current = false;
    };
  }, [key]);

  const url = rendered?.key === key ? rendered.url : undefined;
  const [loaded, setLoaded] = React.useState<string>();
  const width = (rows[0]?.length ?? 0) * CELL;
  const height = rows.length * CELL;

  return (
    <img
      {...props}
      alt={label}
      aria-label={label}
      data-slot="redstone-lamp-display"
      // Set once the lamp pixels themselves have loaded, not the placeholder.
      data-rendered={url !== undefined && loaded === url ? "true" : undefined}
      width={width}
      height={height}
      src={url ?? placeholder(width, height)}
      onLoad={(event) => {
        if (url !== undefined && event.currentTarget.src === url) {
          setLoaded(url);
        }

        props.onLoad?.(event);
      }}
    />
  );
};
