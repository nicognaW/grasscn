import { popoverGlyphAtlas } from "./minecraft-popover-atlas";

interface Painter {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  texture: WebGLTexture;
  buffer: WebGLBuffer;
}

const painters = new WeakMap<CanvasRenderingContext2D, Painter | null>();
const origins = new WeakMap<CanvasRenderingContext2D, DOMRect>();

export const positionPopoverGlyphs = function positionPopoverGlyphs(
  context: CanvasRenderingContext2D,
  bounds: DOMRect
) {
  origins.set(context, bounds);
};

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

  const shader = (kind: number, source: string) => {
    const value = gl.createShader(kind);

    if (!value) {
      throw new Error(
        "Minecraft popover gpu WebGL shader could not be created"
      );
    }

    gl.shaderSource(value, source);
    gl.compileShader(value);

    if (gl.getShaderParameter(value, gl.COMPILE_STATUS) !== true) {
      throw new Error(
        gl.getShaderInfoLog(value) ?? "Popover glyph shader failed"
      );
    }

    return value;
  };

  const vertex = shader(
    gl.VERTEX_SHADER,
    "attribute vec2 position;attribute vec2 uv;uniform vec2 projection;varying vec2 coord;void main(){gl_Position=vec4(position*projection+vec2(-1.,1.),0.,1.);coord=uv;}"
  );

  const fragment = shader(
    gl.FRAGMENT_SHADER,
    "precision highp float;varying vec2 coord;uniform sampler2D atlas;uniform float ink;void main(){float a=texture2D(atlas,coord).r;if(a<.1)discard;gl_FragColor=vec4(vec3(ink),a);}"
  );

  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.useProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  for (const parameter of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) {
    gl.texParameteri(gl.TEXTURE_2D, parameter, gl.NEAREST);
  }

  for (const parameter of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) {
    gl.texParameteri(gl.TEXTURE_2D, parameter, gl.CLAMP_TO_EDGE);
  }

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.LUMINANCE,
    256,
    256,
    0,
    gl.LUMINANCE,
    gl.UNSIGNED_BYTE,
    null
  );
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
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

  gl.disable(gl.DITHER);

  return { buffer, canvas, gl, program, texture };
};

export const paintPopoverGlyph = function paintPopoverGlyph(
  context: CanvasRenderingContext2D,
  code: number,
  pixels: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  scale: number,
  bold: boolean
) {
  let painter = painters.get(context);

  if (painter === undefined) {
    painter = create();
    painters.set(context, painter);
  }

  if (!painter) {
    return false;
  }

  const { canvas, gl, program } = painter;
  const bounds = origins.get(context);
  const originX = Math.round(bounds?.x ?? 0);
  const originY = Math.round(bounds?.y ?? 0);
  const observed = popoverGlyphAtlas[code.toString(16)];

  if (canvas.width !== innerWidth) {
    canvas.width = innerWidth;
  }

  if (canvas.height !== innerHeight) {
    canvas.height = innerHeight;
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform2f(
    gl.getUniformLocation(program, "projection"),
    2 / canvas.width,
    -2 / canvas.height
  );

  const fill = String(context.fillStyle);

  const ink = fill.startsWith("#")
    ? Number.parseInt(fill.slice(1, 3), 16)
    : Number(/[\d.]+/u.exec(fill)?.[0] ?? 255);

  gl.uniform1f(gl.getUniformLocation(program, "ink"), ink / 255);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const u0 = observed?.u0 ?? Math.fround(0.01) / 256;
  const u1 = observed?.u1 ?? Math.fround(width - Math.fround(0.01)) / 256;
  const v0 = observed?.v0 ?? Math.fround(0.01) / 256;
  const v1 = observed?.v1 ?? Math.fround(height - Math.fround(0.01)) / 256;

  gl.texSubImage2D(
    gl.TEXTURE_2D,
    0,
    Math.round(u0 * 256 - 0.01),
    Math.round(v0 * 256 - 0.01),
    width,
    height,
    gl.LUMINANCE,
    gl.UNSIGNED_BYTE,
    Uint8Array.from(
      { length: width * height },
      (_, index) => pixels[index * 4 + 3]
    )
  );

  const oversample = code < 128 ? 1 : 2;
  const thickness = bold ? 0.1 : 0;

  const left = originX + (x + (observed?.left ?? 0) - thickness) * scale;
  const top = originY + (y + (observed?.up ?? 0) - thickness) * scale;

  const right =
    originX + (x + (observed?.right ?? width / oversample) + thickness) * scale;

  const bottom =
    originY + (y + (observed?.down ?? height / oversample) + thickness) * scale;

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
  context.drawImage(
    canvas,
    originX,
    originY,
    context.canvas.width,
    context.canvas.height,
    0,
    0,
    context.canvas.width,
    context.canvas.height
  );

  return true;
};

export const disposePopoverGlyphs = function disposePopoverGlyphs(
  context: CanvasRenderingContext2D
) {
  const painter = painters.get(context);

  if (painter) {
    const { gl, program, buffer, texture } = painter;
    gl.deleteProgram(program);
    gl.deleteBuffer(buffer);
    gl.deleteTexture(texture);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }

  painters.delete(context);
  origins.delete(context);
};
