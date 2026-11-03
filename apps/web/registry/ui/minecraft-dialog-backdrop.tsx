import * as React from "react";

interface Band {
  start: number;
  height: number;
  alpha: number;
}

// Quantize the original Screen.fillGradient alpha with the GPU. Apply each
// quantized band to the live backdrop, avoiding an RGBA8 premultiplication step.
// SVG's channel lookup truncates; the half-unit bias reproduces GPU rounding.
export const MinecraftDialogBackdrop = () => {
  const ref = React.useRef<SVGSVGElement>(null);
  const id = React.useId().replaceAll(/[^a-zA-Z0-9_-]/gu, "");

  const [bands, setBands] = React.useState<Band[]>([]);
  React.useLayoutEffect((): (() => void) | undefined => {
    const host = ref.current!.parentElement!;

    const canvas = document.createElement("canvas");

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });

    if (!gl || !CSS.supports("backdrop-filter", "url(#native)")) {
      return undefined;
    }

    const shader = (kind: number, source: string) => {
      const value = gl.createShader(kind)!;
      gl.shaderSource(value, source);
      gl.compileShader(value);

      if (gl.getShaderParameter(value, gl.COMPILE_STATUS) !== true) {
        throw new Error(gl.getShaderInfoLog(value) ?? "Backdrop shader failed");
      }

      return value;
    };

    const vertex = shader(
      gl.VERTEX_SHADER,
      "attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}"
    );

    const fragment = shader(
      gl.FRAGMENT_SHADER,
      "precision highp float;uniform float height;void main(){float t=(height-gl_FragCoord.y)/height;gl_FragColor=vec4(vec3(16./255.),mix(192./255.,208./255.,t));}"
    );

    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    // oxlint-disable-next-line react/hooks -- WebGL's native useProgram selects a shader program, not a React hook.
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]),
      gl.STATIC_DRAW
    );
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.DITHER);
    gl.disable(gl.BLEND);

    const paint = () => {
      const box = host.getBoundingClientRect();
      const height = Math.round(box.height * devicePixelRatio);

      if (height <= 0) {
        return;
      }

      canvas.width = 1;
      canvas.height = height;
      gl.viewport(0, 0, 1, height);
      gl.uniform1f(gl.getUniformLocation(program, "height"), height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      const pixels = new Uint8Array(height * 4);
      gl.readPixels(0, 0, 1, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      const next: Band[] = [];

      for (let y = 0; y < height; y += 1) {
        const alpha = pixels[(height - y - 1) * 4 + 3];
        const last = next.at(-1);

        if (last?.alpha === alpha) {
          last.height += 1 / devicePixelRatio;
        } else {
          next.push({
            start: y / devicePixelRatio,
            height: 1 / devicePixelRatio,
            alpha,
          });
        }
      }

      setBands(next);
    };

    const observer = new ResizeObserver(paint);
    observer.observe(host);
    paint();

    return () => {
      observer.disconnect();
      delete host.dataset.mcBackdropReady;
      gl.deleteBuffer(buffer);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.deleteProgram(program);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);
  React.useLayoutEffect(() => {
    if (bands.length) {
      ref.current!.parentElement!.dataset.mcBackdropReady = "true";
    }
  }, [bands]);

  return (
    <>
      <svg
        ref={ref}
        width="0"
        height="0"
        aria-hidden="true"
        className="pointer-events-none absolute"
      >
        <defs>
          {Array.from({ length: 17 }, (_, index) => 192 + index).map(
            (alpha) => (
              <filter
                key={alpha}
                id={`${id}-${alpha}`}
                x="0"
                y="0"
                width="1"
                height="1"
                colorInterpolationFilters="sRGB"
              >
                <feComponentTransfer>
                  <feFuncR
                    type="linear"
                    slope={1 - alpha / 255}
                    intercept={((16 * alpha) / 255 + 0.5) / 255}
                  />
                  <feFuncG
                    type="linear"
                    slope={1 - alpha / 255}
                    intercept={((16 * alpha) / 255 + 0.5) / 255}
                  />
                  <feFuncB
                    type="linear"
                    slope={1 - alpha / 255}
                    intercept={((16 * alpha) / 255 + 0.5) / 255}
                  />
                  <feFuncA type="identity" />
                </feComponentTransfer>
              </filter>
            )
          )}
        </defs>
      </svg>
      {bands.map((band, index) => (
        <span
          aria-hidden="true"
          key={index}
          className="pointer-events-none absolute right-0 left-0"
          style={{
            backdropFilter: `url(#${id}-${band.alpha})`,
            height: band.height,

            top: band.start,
          }}
        />
      ))}
    </>
  );
};
