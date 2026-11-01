import {
  minecraftTooltipSprites as sprites,
  minecraftTooltipAtlas as atlas,
} from "./minecraft-tooltip-sprites";

/** Original atlas coordinates and nearest sampling, with native source-alpha blending. */
export function gpuTooltipPixels(
  width: number,
  height: number,
  scale: number,
  backdrop: readonly number[],
  x: number,
  y: number
) {
  const canvas = document.createElement("canvas");

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  canvas.width = viewportWidth;
  canvas.height = viewportHeight;

  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: true,
  });

  if (!gl) {
    return;
  }

  const shader = (kind: number, source: string) => {
    const value = gl.createShader(kind)!;
    gl.shaderSource(value, source);
    gl.compileShader(value);

    if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(value) ?? "Tooltip shader failed");
    }

    return value;
  };

  const program = gl.createProgram();

  const vertex = shader(
    gl.VERTEX_SHADER,
    "attribute vec2 position; attribute vec2 uv; varying vec2 coord; uniform vec2 projection; void main(){gl_Position=vec4(position*projection+vec2(-1.,1.),0.,1.);coord=uv;}"
  );

  const fragment = shader(
    gl.FRAGMENT_SHADER,
    "precision highp float; varying vec2 coord; uniform sampler2D atlas; void main(){gl_FragColor=texture2D(atlas,coord);}"
  );

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.useProgram(program);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
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

  for (const name of ["background", "frame"] as const) {
    const sprite = sprites[name];
    const location = atlas.locations[name];

    const rgba = Uint8Array.from(atob(sprite.rgba), (c) => c.charCodeAt(0));
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      location.x,
      location.y,
      sprite.width,
      sprite.height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      rgba
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

  gl.uniform2f(
    gl.getUniformLocation(program, "projection"),
    2 / viewportWidth,
    -2 / viewportHeight
  );
  gl.viewport(0, 0, viewportWidth, viewportHeight);
  gl.clearColor(backdrop[0] / 255, backdrop[1] / 255, backdrop[2] / 255, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const originX = Math.round(x);
  const originY = Math.round(y);

  const draw = (
    dx: number,
    dy: number,
    w: number,
    h: number,
    u: number,
    v: number,
    sw: number,
    sh: number
  ) => {
    const x = originX + dx;
    const y = originY + dy;

    const a = [x, y, u / atlas.width, v / atlas.height];
    const b = [x, y + h, u / atlas.width, (v + sh) / atlas.height];
    const c = [x + w, y + h, (u + sw) / atlas.width, (v + sh) / atlas.height];
    const d = [x + w, y, (u + sw) / atlas.width, v / atlas.height];

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([...a, ...b, ...c, ...a, ...c, ...d]),
      gl.STREAM_DRAW
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  for (const name of ["background", "frame"] as const) {
    const sprite = sprites[name];
    const location = atlas.locations[name];

    const border = sprite.border.left;
    const sizes = [border, 100 - border * 2, border];

    const widths = [border * scale, width - border * scale * 2, border * scale];

    const heights = [
      border * scale,
      height - border * scale * 2,
      border * scale,
    ];

    for (
      let row = 0, sy = 0, y = 0;
      row < 3;
      y += heights[row], sy += sizes[row], row += 1
    ) {
      for (
        let col = 0, sx = 0, x = 0;
        col < 3;
        x += widths[col], sx += sizes[col], col += 1
      ) {
        if (sprite.stretch) {
          draw(
            x,
            y,
            widths[col],
            heights[row],
            sx + location.x,
            sy + location.y,
            sizes[col],
            sizes[row]
          );
        } else {
          for (let dy = 0; dy < heights[row]; dy += sizes[row] * scale) {
            for (let dx = 0; dx < widths[col]; dx += sizes[col] * scale) {
              const w = Math.min(sizes[col] * scale, widths[col] - dx),
                h = Math.min(sizes[row] * scale, heights[row] - dy);

              draw(
                x + dx,
                y + dy,
                w,
                h,
                sx + location.x,
                sy + location.y,
                w / scale,
                h / scale
              );
            }
          }
        }
      }
    }
  }

  const raw = new Uint8Array(width * height * 4);
  const result = new Uint8ClampedArray(raw.length);

  gl.readPixels(
    originX,
    viewportHeight - originY - height,
    width,
    height,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    raw
  );

  for (let y = 0; y < height; y += 1) {
    result.set(
      raw.subarray((height - y - 1) * width * 4, (height - y) * width * 4),
      y * width * 4
    );
  }

  gl.deleteBuffer(buffer);
  gl.deleteTexture(texture);
  gl.deleteProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  gl.getExtension("WEBGL_lose_context")?.loseContext();

  return result;
}
