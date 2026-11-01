import type { UnihexGlyph } from "./minecraft-unifont";
import { nativeUnihexAtlas } from "./minecraft-unifont-atlas";

type Painter = {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  buffer: WebGLBuffer;
  texture: WebGLTexture;
  program: WebGLProgram;
};
// Every glyph is synchronously copied into its destination2D canvas before reuse.
// A single leased GPU painter prevents long message histories exhausting WebGL contexts.
let sharedPainter: Painter | null | undefined;
const targets = new WeakSet<CanvasRenderingContext2D>();
let targetCount = 0;
const origins = new WeakMap<CanvasRenderingContext2D, DOMRect>();
export type ColorUnihexAtlas = Record<
  string,
  { u0: number; u1: number; v0: number; v1: number }
>;
const atlases = new WeakMap<CanvasRenderingContext2D, ColorUnihexAtlas>();
export function setColorUnihexAtlas(
  context: CanvasRenderingContext2D,
  atlas?: ColorUnihexAtlas
) {
  if (atlas) atlases.set(context, atlas);
  else atlases.delete(context);
}
export function positionColorUnihex(
  context: CanvasRenderingContext2D,
  bounds: DOMRect
) {
  origins.set(context, bounds);
}
function releasePainter(painter: Painter | null | undefined) {
  if (!painter) return;
  const { gl, buffer, texture, program } = painter;
  gl.deleteBuffer(buffer);
  gl.deleteTexture(texture);
  gl.deleteProgram(program);
  gl.getExtension("WEBGL_lose_context")?.loseContext();
}
export function disposeColorUnihex(context: CanvasRenderingContext2D) {
  origins.delete(context);
  atlases.delete(context);
  if (!targets.delete(context)) return;
  if (--targetCount === 0) {
    releasePainter(sharedPainter);
    sharedPainter = undefined;
  }
}
function create(): Painter | null {
  const canvas = document.createElement("canvas"),
    gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
    });
  if (!gl) return null;
  try {
    const compile = (kind: number, source: string) => {
      const shader = gl.createShader(kind)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error(
          gl.getShaderInfoLog(shader) ?? "Native font shader failed"
        );
      return shader;
    };
    const vertex = compile(
      gl.VERTEX_SHADER,
      "attribute vec2 position; attribute vec2 uv; uniform vec2 projection; varying vec2 coord; void main(){gl_Position=vec4(position*projection+vec2(-1.,1.),0.,1.);coord=uv;}"
    );
    const fragment = compile(
      gl.FRAGMENT_SHADER,
      "precision highp float; varying vec2 coord; uniform sampler2D atlas; uniform vec4 ink; void main(){float a=texture2D(atlas,coord).a;if(a<.1)discard;gl_FragColor=vec4(ink.rgb,a*ink.a);}"
    );
    const program = gl.createProgram()!;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.useProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(
        gl.getProgramInfoLog(program) ?? "Native font program failed"
      );
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      256,
      256,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    const buffer = gl.createBuffer()!;
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
    return { canvas, gl, buffer, texture, program };
  } catch (error) {
    const lost = gl.isContextLost();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    if (lost) return null;
    throw error;
  }
}
export function paintColorUnihexGPU(
  context: CanvasRenderingContext2D,
  glyph: UnihexGlyph,
  x: number,
  y: number,
  scale: number
) {
  if (!targets.has(context)) {
    targets.add(context);
    targetCount++;
  }
  let painter = sharedPainter;
  if (painter?.gl.isContextLost()) {
    releasePainter(painter);
    sharedPainter = painter = undefined;
  }
  if (painter === undefined) sharedPainter = painter = create();
  if (!painter) return false;
  const { gl, canvas, program } = painter,
    bounds = origins.get(context);
  const originX = Math.round(bounds?.x ?? 0),
    originY = Math.round(bounds?.y ?? 0);
  if (canvas.width !== innerWidth) canvas.width = innerWidth;
  if (canvas.height !== innerHeight) canvas.height = innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform2f(
    gl.getUniformLocation(program, "projection"),
    2 / canvas.width,
    -2 / canvas.height
  );
  const fill = String(context.fillStyle),
    channels = fill.startsWith("#")
      ? [
          parseInt(fill.slice(1, 3), 16),
          parseInt(fill.slice(3, 5), 16),
          parseInt(fill.slice(5, 7), 16),
          fill.length === 9 ? parseInt(fill.slice(7, 9), 16) / 255 : 1,
        ]
      : (fill.match(/[\d.]+/g)?.map(Number) ?? [255, 255, 255, 1]);
  gl.uniform4f(
    gl.getUniformLocation(program, "ink"),
    channels[0] / 255,
    channels[1] / 255,
    channels[2] / 255,
    channels[3] ?? 1
  );
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  const rgba = new Uint8Array(glyph.width * 16 * 4);
  for (let row = 0; row < 16; row++)
    for (let col = 0; col < glyph.width; col++) {
      const on =
        (glyph.rows[row] >>> (glyph.bitWidth - 1 - col - glyph.left)) & 1;
      rgba.set([255, 255, 255, on ? 255 : 0], (row * glyph.width + col) * 4);
    }
  const observed = (atlases.get(context) ?? nativeUnihexAtlas)[
    glyph.code.toString(16)
  ];
  const atlasX = observed ? Math.round(observed.u0 * 256 - 0.01) : 0,
    atlasY = observed ? Math.round(observed.v0 * 256 - 0.01) : 0;
  gl.texSubImage2D(
    gl.TEXTURE_2D,
    0,
    atlasX,
    atlasY,
    glyph.width,
    16,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    rgba
  );
  const left = originX + x * scale,
    top = originY + y * scale,
    right = left + (glyph.width / 2) * scale,
    bottom = top + 8 * scale;
  const u0 = observed?.u0 ?? Math.fround(0.01) / 256,
    u1 = observed?.u1 ?? Math.fround(glyph.width - Math.fround(0.01)) / 256,
    v0 = observed?.v0 ?? u0,
    v1 = observed?.v1 ?? Math.fround(16 - Math.fround(0.01)) / 256;
  const a = [left, top, u0, v0],
    b = [left, bottom, u0, v1],
    c = [right, bottom, u1, v1],
    d = [right, top, u1, v0];
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([...a, ...b, ...c, ...a, ...c, ...d]),
    gl.STREAM_DRAW
  );
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  if (gl.isContextLost()) {
    sharedPainter = undefined;
    return false;
  }
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
}
