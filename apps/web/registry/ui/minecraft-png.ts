// Exact PNG decoding for UI ports that sample translucent Minecraft
// textures. Canvas getImageData premultiplies alpha and loses colour bits of
// partly transparent texels; this decoder returns the file's RGBA bytes
// unchanged. It supports the non-interlaced PNGs Minecraft ships: 8-bit
// gray, gray-alpha, RGB and RGBA, and indexed colour at 1, 2, 4 or 8 bits
// with optional tRNS alpha.

export interface PngRgba {
  data: Uint8Array;
  height: number;
  width: number;
}

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

const INDEXED = 3;

const channelsOf = new Map([
  [0, 1],
  [2, 3],
  [INDEXED, 1],
  [4, 2],
  [6, 4],
]);

const paeth = (left: number, up: number, upLeft: number) => {
  const estimate = left + up - upLeft;
  const toLeft = Math.abs(estimate - left);
  const toUp = Math.abs(estimate - up);
  const toUpLeft = Math.abs(estimate - upLeft);

  if (toLeft <= toUp && toLeft <= toUpLeft) {
    return left;
  }

  return toUp <= toUpLeft ? up : upLeft;
};

const inflate = async (bytes: Uint8Array<ArrayBuffer>) => {
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"));

  return new Uint8Array(await new Response(stream).arrayBuffer());
};

const base64Bytes = (dataUri: string) => {
  const comma = dataUri.indexOf(",");

  if (!dataUri.startsWith("data:image/png;base64,") || comma === -1) {
    throw new Error("Expected a base64 PNG data URI");
  }

  return Uint8Array.from(
    atob(dataUri.slice(comma + 1)),
    (character) => character.codePointAt(0) ?? 0
  );
};

interface PngChunks {
  bitDepth: number;
  channels: number;
  colorType: number;
  compressed: Uint8Array<ArrayBuffer>;
  height: number;
  // Indexed colour only: RGB triples (PLTE) and per-entry alpha (tRNS).
  palette: Uint8Array;
  paletteAlpha: Uint8Array;
  width: number;
}

// Reads IHDR and joins the IDAT chunks.
const readChunks = (bytes: Uint8Array): PngChunks => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (SIGNATURE.some((value, index) => bytes[index] !== value)) {
    throw new Error("Not a PNG file");
  }

  let width = 0;
  let height = 0;
  let colorType = -1;
  let bitDepth = 0;
  let palette: Uint8Array = new Uint8Array();
  let paletteAlpha: Uint8Array = new Uint8Array();
  const parts: Uint8Array[] = [];

  for (let offset = 8; offset < bytes.length;) {
    const length = view.getUint32(offset);

    const type = String.fromCodePoint(
      ...bytes.subarray(offset + 4, offset + 8)
    );

    const body = bytes.subarray(offset + 8, offset + 8 + length);

    if (type === "IEND") {
      break;
    }

    if (type === "IHDR") {
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      bitDepth = body[8] ?? 0;
      colorType = body[9] ?? -1;

      const depthSupported =
        bitDepth === 8 ||
        (colorType === INDEXED && [1, 2, 4].includes(bitDepth));

      if (!depthSupported || body[12] !== 0) {
        throw new Error(
          "Only 8-bit or indexed non-interlaced PNGs are supported"
        );
      }
    }

    if (type === "PLTE") {
      palette = body;
    }

    if (type === "tRNS" && colorType === INDEXED) {
      paletteAlpha = body;
    }

    if (type === "IDAT") {
      parts.push(body);
    }

    offset += length + 12;
  }

  const channels = channelsOf.get(colorType);

  if (channels === undefined) {
    throw new Error(`Unsupported PNG colour type ${colorType}`);
  }

  const compressed = new Uint8Array(
    parts.reduce((total, part) => total + part.length, 0)
  );

  let at = 0;

  for (const part of parts) {
    compressed.set(part, at);
    at += part.length;
  }

  if (colorType === INDEXED && palette.length === 0) {
    throw new Error("Indexed PNG without a palette");
  }

  return {
    bitDepth,
    channels,
    colorType,
    compressed,
    height,
    palette,
    paletteAlpha,
    width,
  };
};

// PNG filter types 0-4: the value each filtered byte was predicted from.
const predictors: readonly ((
  left: number,
  up: number,
  upLeft: number
) => number)[] = [
  () => 0,
  (left) => left,
  (_left, up) => up,
  (left, up) => Math.floor((left + up) / 2),
  paeth,
];

// Bytes per scanline, and the filter's byte distance to the left pixel.
const layout = ({ bitDepth, channels, width }: PngChunks) => ({
  pixelBytes: Math.max(1, (channels * bitDepth) / 8),
  stride: Math.ceil((width * channels * bitDepth) / 8),
});

const unfilter = (raw: Uint8Array, chunks: PngChunks) => {
  const { height } = chunks;
  const { pixelBytes: channels, stride } = layout(chunks);
  const rows = new Uint8Array(height * stride);

  for (let y = 0; y < height; y += 1) {
    const predict = predictors[raw[y * (stride + 1)] ?? 0];
    const source = y * (stride + 1) + 1;

    if (predict === undefined) {
      throw new Error("Unknown PNG filter type");
    }

    for (let x = 0; x < stride; x += 1) {
      const hasLeft = x >= channels;
      const left = hasLeft ? (rows[y * stride + x - channels] ?? 0) : 0;
      const up = y > 0 ? (rows[(y - 1) * stride + x] ?? 0) : 0;

      const upLeft =
        y > 0 && hasLeft ? (rows[(y - 1) * stride + x - channels] ?? 0) : 0;

      rows[y * stride + x] =
        ((raw[source + x] ?? 0) + predict(left, up, upLeft)) % 256;
    }
  }

  return rows;
};

// Palette indices, packed most significant bits first, to RGBA bytes.
const indexedToRgba = (rows: Uint8Array, chunks: PngChunks) => {
  const { bitDepth, height, palette, paletteAlpha, width } = chunks;
  const { stride } = layout(chunks);
  const data = new Uint8Array(width * height * 4);
  const entries = 2 ** bitDepth;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const bit = x * bitDepth;
      const byte = rows[y * stride + Math.floor(bit / 8)] ?? 0;

      const entry =
        Math.floor(byte / 2 ** (8 - bitDepth - (bit % 8))) % entries;

      if (entry * 3 + 2 >= palette.length) {
        throw new Error("PNG palette index out of range");
      }

      const pixel = (y * width + x) * 4;
      data.set(palette.subarray(entry * 3, entry * 3 + 3), pixel);
      data[pixel + 3] = paletteAlpha[entry] ?? 255;
    }
  }

  return data;
};

// Gray, gray-alpha, RGB and RGBA samples to RGBA bytes.
const toRgba = (rows: Uint8Array, chunks: PngChunks) => {
  const { channels, height, width } = chunks;

  if (chunks.colorType === INDEXED) {
    return indexedToRgba(rows, chunks);
  }

  const data = new Uint8Array(width * height * 4);
  const color = channels >= 3;
  const alphaOffset = color ? 3 : 1;
  const hasAlpha = channels === 2 || channels === 4;

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const source = pixel * channels;
    const gray = rows[source] ?? 0;

    data[pixel * 4] = gray;
    data[pixel * 4 + 1] = color ? (rows[source + 1] ?? 0) : gray;
    data[pixel * 4 + 2] = color ? (rows[source + 2] ?? 0) : gray;
    data[pixel * 4 + 3] = hasAlpha ? (rows[source + alphaOffset] ?? 0) : 255;
  }

  return data;
};

export const decodePng = async (dataUri: string): Promise<PngRgba> => {
  const chunks = readChunks(base64Bytes(dataUri));
  const rows = unfilter(await inflate(chunks.compressed), chunks);

  return {
    data: toRgba(rows, chunks),
    height: chunks.height,
    width: chunks.width,
  };
};
