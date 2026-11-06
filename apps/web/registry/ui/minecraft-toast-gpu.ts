import { minecraftToastSprite } from "./minecraft-toast-assets";
import { toastGlyphAtlas, toastSpriteAtlas } from "./minecraft-toast-atlas";

interface Glyph {
  code: number;
  pixels: Uint8Array;
  width: number;
  height: number;
  advance: number;
}

interface Painter {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  sprite: WebGLTexture;
  font: WebGLTexture;
}

const uv = (start: number, end: number, v: number, size: number) =>
  Math.fround(
    start + Math.fround(Math.fround(v / size) * Math.fround(end - start))
  );

let shared: Painter | null | undefined;

const create = function create(): Painter | null {
  const canvas = document.createElement("canvas");

  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  });

  if (!gl) {
    return null;
  }

  const compile = (type: number, code: string) => {
    const s = gl.createShader(type);

    if (!s) {
      throw new Error("Minecraft toast gpu WebGL shader could not be created");
    }

    gl.shaderSource(s, code);
    gl.compileShader(s);

    if (gl.getShaderParameter(s, gl.COMPILE_STATUS) !== true) {
      throw new Error(gl.getShaderInfoLog(s) ?? "Toast shader failed");
    }

    return s;
  };

  const vertex = compile(
    gl.VERTEX_SHADER,
    "attribute vec2 position;attribute vec2 uv;uniform mat4 projection;uniform mat4 modelView;varying vec2 coord;void main(){gl_Position=projection*modelView*vec4(position,0.,1.);coord=uv;}"
  );

  const fragment = compile(
    gl.FRAGMENT_SHADER,
    "precision highp float;varying vec2 coord;uniform sampler2D atlas;uniform vec4 ink;void main(){vec4 pixel=texture2D(atlas,coord);if(pixel.a<.1)discard;gl_FragColor=pixel*ink;}"
  );

  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.useProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  for (const [name, offset] of [
    ["position", 0],
    ["uv", 8],
  ] as const) {
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 16, offset);
  }

  const texture = (width: number, height: number) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);

    for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) {
      gl.texParameteri(gl.TEXTURE_2D, p, gl.NEAREST);
    }

    for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) {
      gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE);
    }

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );

    return t;
  };

  const sprite = texture(toastSpriteAtlas.width, toastSpriteAtlas.height);
  gl.texSubImage2D(
    gl.TEXTURE_2D,
    0,
    toastSpriteAtlas.x,
    toastSpriteAtlas.y,
    minecraftToastSprite.width,
    minecraftToastSprite.height,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    Uint8Array.from(
      atob(minecraftToastSprite.rgba),
      (c) => c.codePointAt(0) ?? Number.NaN
    )
  );
  const font = texture(256, 256);
  gl.disable(gl.DITHER);
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(
    gl.SRC_ALPHA,
    gl.ONE_MINUS_SRC_ALPHA,
    gl.ONE,
    gl.ONE_MINUS_SRC_ALPHA
  );

  return { buffer, canvas, font, gl, program, sprite };
};

export const paintToast = function paintToast(
  canvas: HTMLCanvasElement,
  bounds: DOMRect,
  width: number,
  height: number,
  scale: number,
  offset: number,
  title: Glyph[][],
  message: Glyph[][]
) {
  if (shared?.gl.isContextLost() ?? false) {
    shared = undefined;
  }

  if (shared === undefined) {
    shared = create();
  }

  if (!shared) {
    return false;
  }

  const p = shared;
  const { gl, program } = p;

  if (p.canvas.width !== innerWidth) {
    p.canvas.width = innerWidth;
  }

  if (p.canvas.height !== innerHeight) {
    p.canvas.height = innerHeight;
  }

  // Minecraft projects logical GUI coordinates, then rasterizes the physical
  // viewport. Projecting scaled coordinates instead changes half-pixel edges.
  gl.viewport(0, 0, p.canvas.width, p.canvas.height);
  gl.useProgram(program);
  gl.uniformMatrix4fv(
    gl.getUniformLocation(program, "projection"),
    false,
    new Float32Array([
      2 / Math.ceil(p.canvas.width / scale),
      0,
      0,
      0,
      0,
      -2 / Math.ceil(p.canvas.height / scale),
      0,
      0,
      0,
      0,
      1,
      0,
      -1,
      1,
      0,
      1,
    ])
  );
  gl.uniformMatrix4fv(
    gl.getUniformLocation(program, "modelView"),
    false,
    new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
  );
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const originX = Math.round(bounds.x);
  const originY = Math.round(bounds.y);

  const quad = (
    x: number,
    y: number,
    w: number,
    h: number,
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    spriteCoverage = false
  ) => {
    const left = originX / scale + x;
    const top = originY / scale + y;
    const right = left + w;
    const bottom = top + h;

    const a = [left, top, u0, v0];
    const b = [left, bottom, u0, v1];
    const c = [right, bottom, u1, v1];
    const d = [right, top, u1, v0];

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([...a, ...b, ...c, ...c, ...d, ...a]),
      gl.STREAM_DRAW
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    // Native GL includes a sprite's leading boundary when it coincides exactly
    // with a physical pixel center; ANGLE may exclude it. Restore that boundary
    // sample without changing the quad's interior UV interpolation.
    const physicalLeft = originX + x * scale;

    if (spriteCoverage && physicalLeft - Math.floor(physicalLeft) === 0.5) {
      const edgeLeft = Math.floor(physicalLeft) / scale;
      const edgeRight = edgeLeft + 1 / scale;

      const e = [edgeLeft, top, u0, v0];
      const f = [edgeLeft, bottom, u0, v1];
      const g = [edgeRight, bottom, u0, v1];
      const edgeTopRightVertex = [edgeRight, top, u0, v0];

      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([...e, ...f, ...g, ...g, ...edgeTopRightVertex, ...e]),
        gl.STREAM_DRAW
      );
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  };

  gl.bindTexture(gl.TEXTURE_2D, p.sprite);
  gl.uniform4f(gl.getUniformLocation(program, "ink"), 1, 1, 1, 1);

  const region = (
    x: number,
    y: number,
    w: number,
    h: number,
    sx: number,
    sy: number
  ) => {
    quad(
      x + offset,
      y,
      w,
      h,
      uv(toastSpriteAtlas.u0, toastSpriteAtlas.u1, sx, 160),
      uv(toastSpriteAtlas.v0, toastSpriteAtlas.v1, sy, 64),
      uv(toastSpriteAtlas.u0, toastSpriteAtlas.u1, sx + w, 160),
      uv(toastSpriteAtlas.v0, toastSpriteAtlas.v1, sy + h, 64),
      true
    );
  };

  const tile = (
    x: number,
    y: number,
    w: number,
    h: number,
    sx: number,
    sy: number,
    sw: number,
    sh: number
  ) => {
    for (let yy = 0; yy < h; yy += sh) {
      for (let xx = 0; xx < w; xx += sw) {
        region(
          x + xx,
          y + yy,
          Math.min(sw, w - xx),
          Math.min(sh, h - yy),
          sx,
          sy
        );
      }
    }
  };

  const left = Math.min(17, Math.floor(width / 2));
  const right = Math.min(4, Math.floor(width / 2));
  const top = Math.min(30, Math.floor(height / 2));
  const bottom = Math.min(4, Math.floor(height / 2));

  if (width === 160 && height === 64) {
    region(0, 0, width, height, 0, 0);
  } else {
    region(0, 0, left, top, 0, 0);
    region(width - right, 0, right, top, 160 - right, 0);
    region(0, height - bottom, left, bottom, 0, 64 - bottom);
    region(
      width - right,
      height - bottom,
      right,
      bottom,
      160 - right,
      64 - bottom
    );
    tile(left, 0, width - left - right, top, left, 0, 160 - left - right, top);
    tile(
      left,
      height - bottom,
      width - left - right,
      bottom,
      left,
      64 - bottom,
      160 - left - right,
      bottom
    );
    tile(0, top, left, height - top - bottom, 0, top, left, 64 - top - bottom);
    tile(
      width - right,
      top,
      right,
      height - top - bottom,
      160 - right,
      top,
      right,
      64 - top - bottom
    );
    tile(
      left,
      top,
      width - left - right,
      height - top - bottom,
      left,
      top,
      160 - left - right,
      64 - top - bottom
    );
  }

  const text = (
    lines: Glyph[][],
    y: number,
    color: [number, number, number]
  ) => {
    gl.bindTexture(gl.TEXTURE_2D, p.font);
    gl.uniform4f(gl.getUniformLocation(program, "ink"), ...color, 1);

    for (let row = 0; row < lines.length; row += 1) {
      let x = 18 + offset;

      for (const glyph of lines[row]) {
        const observed = toastGlyphAtlas[glyph.code.toString(16)] ?? {
          down: glyph.height / (glyph.code < 128 ? 1 : 2),
          left: 0,
          right: glyph.width / (glyph.code < 128 ? 1 : 2),
          u0: Math.fround(0.01) / 256,
          u1: Math.fround(glyph.width - Math.fround(0.01)) / 256,
          up: 0,
          v0: Math.fround(0.01) / 256,
          v1: Math.fround(glyph.height - Math.fround(0.01)) / 256,
        };

        if (glyph.code !== 32) {
          gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            Math.round(observed.u0 * 256 - 0.01),
            Math.round(observed.v0 * 256 - 0.01),
            glyph.width,
            glyph.height,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            glyph.pixels
          );
          quad(
            x + observed.left,
            y + row * 12 + observed.up,
            observed.right - observed.left,
            observed.down - observed.up,
            observed.u0,
            observed.v0,
            observed.u1,
            observed.v1
          );
        }

        x += glyph.advance;
      }
    }
  };

  text(title, message.length ? 7 : 12, [1, 1, 0]);
  text(message, 7 + title.length * 12, [1, 1, 1]);

  if (canvas.width !== width * scale) {
    canvas.width = width * scale;
  }

  if (canvas.height !== height * scale) {
    canvas.height = height * scale;
  }

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error(
      "Minecraft toast gpu 2D canvas context could not be created"
    );
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = false;
  context.drawImage(
    p.canvas,
    originX,
    originY,
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return true;
};
