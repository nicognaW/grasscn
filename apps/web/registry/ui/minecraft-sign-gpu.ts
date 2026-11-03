import { minecraftGlyphs } from "./minecraft-font";

export const paintSignGpu = function paintSignGpu(
  texture: HTMLImageElement,
  font: HTMLImageElement,
  lines: readonly string[],
  scale: number,
  color: string,
  hanging: boolean,
  x: number,
  y: number
) {
  if (
    x < 0 ||
    y < 0 ||
    x + 120 * scale > innerWidth ||
    y + (hanging ? 74 : 110) * scale > innerHeight
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

    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(s) ?? "Sign shader failed");
    }

    return s;
  };

  const vs = shader(
    gl.VERTEX_SHADER,
    "attribute vec2 position;attribute vec2 uv;varying vec2 coord;uniform vec2 projection;void main(){gl_Position=vec4(position*projection+vec2(-1.,1.),0.,1.);coord=uv;}"
  );

  const fs = shader(
    gl.FRAGMENT_SHADER,
    "precision highp float;varying vec2 coord;uniform sampler2D atlas;uniform vec4 tint;void main(){gl_FragColor=texture2D(atlas,coord)*tint;}"
  );

  const program = gl.createProgram();

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  const tex = gl.createTexture();

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  for (const [name, offset] of [
    ["position", 0],
    ["uv", 8],
  ] as const) {
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 16, offset);
  }

  gl.bindTexture(gl.TEXTURE_2D, tex);

  for (const key of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) {
    gl.texParameteri(gl.TEXTURE_2D, key, gl.NEAREST);
  }

  for (const key of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) {
    gl.texParameteri(gl.TEXTURE_2D, key, gl.CLAMP_TO_EDGE);
  }

  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.uniform2f(
    gl.getUniformLocation(program, "projection"),
    2 / innerWidth,
    -2 / innerHeight
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

  const tint = gl.getUniformLocation(program, "tint");
  const f = Math.fround;
  const originX = Math.round(x);
  const originY = Math.round(y);

  const draw = (
    left: number,
    top: number,
    right: number,
    bottom: number,
    u: number,
    v: number,
    u1: number,
    v1: number
  ) => {
    const a = [left, top, u, v];
    const b = [left, bottom, u, v1];
    const c = [right, bottom, u1, v1];
    const d = [right, top, u1, v];

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([...a, ...b, ...c, ...a, ...c, ...d]),
      gl.STREAM_DRAW
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  const factor = f((hanging ? 4.5 : 3.9) * scale);
  const tx = originX + 60 * scale;
  const origin = originY + (hanging ? 50 : 30) * scale;
  const ty = origin + (hanging ? -13 : 27) * scale;
  const hx = hanging ? 8 : 12;
  const hy = hanging ? 8 : 13;

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture);
  gl.uniform4f(tint, 1, 1, 1, 1);
  draw(
    f(tx + f(-hx * factor)),
    f(ty + f(-hy * factor)),
    f(tx + f(hx * factor)),
    f(ty + f(hy * factor)),
    0,
    0,
    1,
    1
  );
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, font);
  const rgb = Number.parseInt(color.slice(1), 16);
  /* oxlint-disable no-bitwise -- The shader tint receives the three unpacked bytes of the packed RGB sign color. */
  gl.uniform4f(
    tint,
    ((rgb >> 16) & 255) / 255,
    ((rgb >> 8) & 255) / 255,
    (rgb & 255) / 255,
    1
  );
  /* oxlint-enable no-bitwise */
  const ts = f((hanging ? 1 : f(0.9765628)) * scale);

  for (const [index, line] of lines.entries()) {
    const glyphs = Array.from(
      line,
      (char) => minecraftGlyphs[char.codePointAt(0)! - 32]
    );

    if (glyphs.some((g) => !g)) {
      continue;
    }

    let dx = -Math.floor(glyphs.reduce((sum, g) => sum + g[2], 0) / 2);
    const dy = index * (hanging ? 9 : 10) - (hanging ? 18 : 20);

    for (let i = 0; i < glyphs.length; i += 1) {
      const g = glyphs[i];
      const width = g[2] - 1;

      if (line[i] !== " " && width > 0) {
        draw(
          f(tx + f(dx * ts)),
          f(origin + f(dy * ts)),
          f(tx + f((dx + width) * ts)),
          f(origin + f((dy + 8) * ts)),
          g[0] / font.naturalWidth,
          g[1] / font.naturalHeight,
          (g[0] + width) / font.naturalWidth,
          (g[1] + 8) / font.naturalHeight
        );
      }

      dx += g[2];
    }
  }

  const width = 120 * scale;
  const height = (hanging ? 74 : 110) * scale;
  const raw = new Uint8Array(width * height * 4);
  const pixels = new Uint8ClampedArray(raw.length);

  gl.readPixels(
    originX,
    innerHeight - originY - height,
    width,
    height,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    raw
  );

  for (let row = 0; row < height; row += 1) {
    pixels.set(
      raw.subarray((height - row - 1) * width * 4, (height - row) * width * 4),
      row * width * 4
    );
  }

  gl.deleteBuffer(buffer);
  gl.deleteTexture(tex);
  gl.deleteProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  gl.getExtension("WEBGL_lose_context")?.loseContext();

  return pixels;
};
