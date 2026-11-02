import { menuCheckboxAtlas as atlas } from "./minecraft-menu-checkbox-assets";

interface Painter {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  texture: WebGLTexture;
  buffer: WebGLBuffer;
}

let painter: Painter | null | undefined;
let users = 0;

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
    const shaderHandle = gl.createShader(kind)!;
    gl.shaderSource(shaderHandle, source);
    gl.compileShader(shaderHandle);

    if (!gl.getShaderParameter(shaderHandle, gl.COMPILE_STATUS)) {
      throw new Error(
        gl.getShaderInfoLog(shaderHandle) ?? "Checkbox shader failed"
      );
    }

    return shaderHandle;
  };

  const vertex = shader(
    gl.VERTEX_SHADER,
    "attribute vec2 position;attribute vec2 uv;uniform vec2 projection;varying vec2 coord;void main(){gl_Position=vec4(position*projection+vec2(-1.,1.),0.,1.);coord=uv;}"
  );

  const fragment = shader(
    gl.FRAGMENT_SHADER,
    "precision highp float;varying vec2 coord;uniform sampler2D atlas;void main(){gl_FragColor=texture2D(atlas,coord);}"
  );

  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.useProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(
      gl.getProgramInfoLog(program) ?? "Checkbox shader link failed"
    );
  }

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
    gl.RGBA,
    atlas.width,
    atlas.height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );

  for (const sprite of Object.values(atlas.sprites)) {
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      sprite.x,
      sprite.y,
      sprite.width,
      sprite.height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      Uint8Array.from(
        atob(sprite.rgba),
        (char) => char.codePointAt(0) ?? Number.NaN
      )
    );
  }

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

export const retainMenuCheckboxPainter = function retainMenuCheckboxPainter() {
  users += 1;
};

export const releaseMenuCheckboxPainter =
  function releaseMenuCheckboxPainter() {
    users -= 1;

    if (users > 0) {
      return;
    }

    if (painter) {
      const { gl, texture, program, buffer } = painter;
      gl.deleteBuffer(buffer);
      gl.deleteTexture(texture);
      gl.deleteProgram(program);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }

    painter = undefined;
  };

export const menuCheckboxPixels = function menuCheckboxPixels(
  name: keyof typeof atlas.sprites,
  scale: number,
  x: number,
  y: number
) {
  if (painter?.gl.isContextLost() ?? false) {
    painter = undefined;
  }

  if (painter === undefined) {
    painter = create();
  }

  if (!painter) {
    return;
  }

  const { canvas, gl, program } = painter;
  const width = innerWidth;
  const height = innerHeight;
  const size = 17 * scale;

  const originX = Math.round(x);
  const originY = Math.round(y);
  const sprite = atlas.sprites[name];

  if (canvas.width !== width) {
    canvas.width = width;
  }

  if (canvas.height !== height) {
    canvas.height = height;
  }

  gl.viewport(0, 0, width, height);
  gl.uniform2f(
    gl.getUniformLocation(program, "projection"),
    2 / width,
    -2 / height
  );
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const a = [originX, originY, sprite.u0, sprite.v0];
  const b = [originX, originY + size, sprite.u0, sprite.v1];
  const c = [originX + size, originY + size, sprite.u1, sprite.v1];
  const d = [originX + size, originY, sprite.u1, sprite.v0];

  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([...a, ...b, ...c, ...c, ...d, ...a]),
    gl.STREAM_DRAW
  );
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  const left = Math.max(0, originX);
  const top = Math.max(0, originY);
  const right = Math.min(width, originX + size);
  const bottom = Math.min(height, originY + size);

  const result = new Uint8ClampedArray(size * size * 4);

  if (right > left && bottom > top) {
    const w = right - left;
    const h = bottom - top;
    const raw = new Uint8Array(w * h * 4);

    gl.readPixels(left, height - bottom, w, h, gl.RGBA, gl.UNSIGNED_BYTE, raw);

    for (let row = 0; row < h; row += 1) {
      result.set(
        raw.subarray((h - row - 1) * w * 4, (h - row) * w * 4),
        ((top - originY + row) * size + left - originX) * 4
      );
    }
  }

  return result;
};
