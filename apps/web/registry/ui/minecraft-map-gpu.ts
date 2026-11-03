import type { MapMarker } from "./map";
import { mapAtlas } from "./minecraft-map-atlas";

const markerSprites: Partial<
  Record<string, (typeof mapAtlas.sprites)[keyof typeof mapAtlas.sprites]>
> = mapAtlas.sprites;

export const mapGpuPixels = function mapGpuPixels(
  terrain: ImageData,
  images: readonly HTMLImageElement[],
  markers: readonly MapMarker[],
  scale: number,
  originX: number,
  originY: number
) {
  const width = 128 * scale;
  const height = 128 * scale;

  if (
    originX < 0 ||
    originY < 0 ||
    originX + width > innerWidth ||
    originY + height > innerHeight
  ) {
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = innerWidth;
  canvas.height = innerHeight;

  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  });

  if (!gl) {
    return;
  }

  const shader = (kind: number, text: string) => {
    const s = gl.createShader(kind)!;
    gl.shaderSource(s, text);
    gl.compileShader(s);

    if (gl.getShaderParameter(s, gl.COMPILE_STATUS) !== true) {
      throw new Error(gl.getShaderInfoLog(s) ?? "Map shader failed");
    }

    return s;
  };

  const vs = shader(
    gl.VERTEX_SHADER,
    "attribute vec2 position;attribute vec2 uv;varying vec2 coord;uniform vec2 projection;void main(){gl_Position=vec4(position*projection+vec2(-1.,1.),0.,1.);coord=uv;}"
  );

  const fs = shader(
    gl.FRAGMENT_SHADER,
    "precision highp float;varying vec2 coord;uniform sampler2D atlas;void main(){gl_FragColor=texture2D(atlas,coord);}"
  );

  const program = gl.createProgram();

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  const texture = gl.createTexture();

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  for (const [name, offset] of [
    ["position", 0],
    ["uv", 8],
  ] as const) {
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 16, offset);
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);

  for (const key of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) {
    gl.texParameteri(gl.TEXTURE_2D, key, gl.NEAREST);
  }

  for (const key of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) {
    gl.texParameteri(gl.TEXTURE_2D, key, gl.CLAMP_TO_EDGE);
  }

  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.uniform2f(
    gl.getUniformLocation(program, "projection"),
    2 / (innerWidth / scale),
    -2 / (innerHeight / scale)
  );
  gl.viewport(0, 0, innerWidth, innerHeight);
  gl.disable(gl.DITHER);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(
    gl.SRC_ALPHA,
    gl.ONE_MINUS_SRC_ALPHA,
    gl.ONE,
    gl.ONE_MINUS_SRC_ALPHA
  );

  const draw = (a: number[], b: number[], c: number[], d: number[]) => {
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([...a, ...b, ...c, ...a, ...c, ...d]),
      gl.STREAM_DRAW
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  const x = Math.round(originX) / scale;
  const y = Math.round(originY) / scale;
  const f = Math.fround;

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    128,
    128,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array(terrain.data.buffer)
  );
  draw(
    [x, y, 0, 0],
    [x, y + 128, 0, 1],
    [x + 128, y + 128, 1, 1],
    [x + 128, y, 1, 0]
  );
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    images[markers.length]
  );

  for (const [index, marker] of markers.entries()) {
    const key = `minecraft:${marker.decoration ?? "player"}`;

    const entry = markerSprites[key];

    if (!entry) {
      continue;
    }

    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      Math.round(entry.u0 * mapAtlas.dimensions[0]),
      Math.round(entry.v0 * mapAtlas.dimensions[1]),
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      images[index]
    );
  }

  for (const marker of markers) {
    const entry = markerSprites[`minecraft:${marker.decoration ?? "player"}`];

    if (!entry) {
      continue;
    }

    const angle = f(f((marker.rotation ?? 0) * f(Math.PI * 2)) / 16);
    const sin = f(Math.sin(angle));

    const cos = f(Math.cos(angle));

    const a = f(cos * 4);
    const b = f(-sin * 4);
    const c = f(sin * 4);
    const d = f(cos * 4);
    const cx = f(x + f(64 + marker.x / 2));
    const cy = f(y + f(64 + marker.y / 2));
    const tx = f(f(f(a * -0.125) + f(b * 0.125)) + cx);
    const ty = f(f(f(c * -0.125) + f(d * 0.125)) + cy);

    const point = (px: number, py: number, u: number, v: number) => [
      f(f(f(a * px) + f(b * py)) + tx),
      f(f(f(c * px) + f(d * py)) + ty),
      u,
      v,
    ];

    draw(
      point(-1, -1, entry.u0, entry.v1),
      point(-1, 1, entry.u0, entry.v0),
      point(1, 1, entry.u1, entry.v0),
      point(1, -1, entry.u1, entry.v1)
    );
  }

  const raw = new Uint8Array(width * height * 4);
  const output = new Uint8ClampedArray(raw.length);

  gl.readPixels(
    Math.round(originX),
    innerHeight - Math.round(originY) - height,
    width,
    height,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    raw
  );

  for (let row = 0; row < height; row += 1) {
    output.set(
      raw.subarray((height - row - 1) * width * 4, (height - row) * width * 4),
      row * width * 4
    );
  }

  gl.deleteBuffer(buffer);
  gl.deleteTexture(texture);
  gl.deleteProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  gl.getExtension("WEBGL_lose_context")?.loseContext();

  return output;
};
