import { minecraftAvatarSkins } from "./minecraft-avatar-assets";
import type { MinecraftAvatarSkin } from "./minecraft-avatar-assets";

let renderer:
  | {
      canvas: HTMLCanvasElement;
      gl: WebGLRenderingContext;
      program: WebGLProgram;
      buffer: WebGLBuffer;
      texture: WebGLTexture;
    }
  | undefined;

export const paintMinecraftAvatar = function paintMinecraftAvatar(
  target: HTMLCanvasElement,
  skin: MinecraftAvatarSkin,
  hat: boolean,
  upsideDown: boolean,
  scale: number
) {
  if (renderer?.gl.isContextLost()) {
    renderer = undefined;
  }

  if (!renderer) {
    const canvas = document.createElement("canvas");

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });

    if (!gl) {
      return false;
    }

    const shader = (type: number, source: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, source);
      gl.compileShader(s);

      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(s) ?? "Avatar shader");
      }

      return s;
    };

    const program = gl.createProgram();
    gl.attachShader(
      program,
      shader(
        gl.VERTEX_SHADER,
        "attribute vec2 position;attribute vec2 uv;uniform mat4 projection;varying vec2 coord;void main(){gl_Position=projection*vec4(position,0.,1.);coord=uv;}"
      )
    );
    gl.attachShader(
      program,
      shader(
        gl.FRAGMENT_SHADER,
        "precision highp float;varying vec2 coord;uniform sampler2D skin;void main(){vec4 color=texture2D(skin,coord);if(color.a<.1)discard;gl_FragColor=color;}"
      )
    );
    gl.linkProgram(program);
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    for (const [name, offset] of [
      ["position", 0],
      ["uv", 8],
    ] as const) {
      const p = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(p);
      gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 16, offset);
    }

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) {
      gl.texParameteri(gl.TEXTURE_2D, p, gl.NEAREST);
    }

    for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) {
      gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE);
    }

    gl.disable(gl.DITHER);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA
    );
    renderer = { buffer, canvas, gl, program, texture };
  }

  const { canvas, gl, program } = renderer;
  const b = target.getBoundingClientRect();
  const w = Math.round(b.width);
  const h = Math.round(b.height);

  if (canvas.width !== innerWidth) {
    canvas.width = innerWidth;
  }

  if (canvas.height !== innerHeight) {
    canvas.height = innerHeight;
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(program);
  gl.uniformMatrix4fv(
    gl.getUniformLocation(program, "projection"),
    false,
    new Float32Array([
      2 / Math.ceil(innerWidth / scale),
      0,
      0,
      0,
      0,
      -2 / Math.ceil(innerHeight / scale),
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
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindTexture(gl.TEXTURE_2D, renderer.texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    64,
    64,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    Uint8Array.from(atob(minecraftAvatarSkins[skin].rgba), (c) =>
      c.charCodeAt(0)
    )
  );

  const x = Math.round(b.x) / scale;
  const y = Math.round(b.y) / scale;
  const right = x + w / scale;
  const bottom = y + h / scale;
  const v0 = (upsideDown ? 16 : 8) / 64;
  const v1 = (upsideDown ? 8 : 16) / 64;

  const quad = (u: number) => {
    const a = [x, y, u / 64, v0];
    const c = [right, bottom, (u + 8) / 64, v1];
    const left = [x, bottom, u / 64, v1];
    const top = [right, y, (u + 8) / 64, v0];

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([...a, ...left, ...c, ...c, ...top, ...a]),
      gl.STREAM_DRAW
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  quad(8);

  if (hat) {
    quad(40);
  }

  if (target.width !== w) {
    target.width = w;
  }

  if (target.height !== h) {
    target.height = h;
  }

  const context = target.getContext("2d")!;
  context.clearRect(0, 0, w, h);
  context.imageSmoothingEnabled = false;
  context.drawImage(canvas, Math.round(b.x), Math.round(b.y), w, h, 0, 0, w, h);

  return true;
};
