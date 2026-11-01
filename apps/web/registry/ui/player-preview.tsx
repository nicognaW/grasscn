"use client";

import * as React from "react";

import { minecraftAvatarSkins } from "./minecraft-avatar-assets";
import type { MinecraftAvatarSkin } from "./minecraft-avatar-assets";
import { playerMeshes } from "./minecraft-player-mesh";
import { inferPlayerSkinModel } from "./minecraft-player-skin";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";

import "./minecraft-player-preview.css";

interface PlayerRotation {
  pitch: number;
  yaw: number;
}

type PlayerPreviewProps = React.ComponentProps<"div"> & {
  skin?: MinecraftAvatarSkin;
  src?: string;
  username?: string;
  model?: "wide" | "slim";
  rotation?: PlayerRotation;
  defaultRotation?: PlayerRotation;
  onRotationChange?: (rotation: PlayerRotation) => void;
  width?: number;
  height?: number;
  scale?: 1 | 2 | 3;
  onLoadingStatusChange?: (status: "loading" | "loaded" | "error") => void;
};

const vs = `attribute vec3 position;attribute vec2 uv;attribute vec3 normal;uniform mat4 projection;uniform mat4 modelView;varying vec2 vUv;varying vec3 vNormal;void main(){gl_Position=projection*modelView*vec4(position,1.);vUv=uv;vNormal=normal;}`;
const fs = `precision highp float;uniform sampler2D skin;varying vec2 vUv;varying vec3 vNormal;void main(){vec4 color=texture2D(skin,vUv);if(color.a<.1)discard;vec3 n=sign(vNormal)*floor(abs(vNormal)*127.)/127.;if(!gl_FrontFacing)n=-n;vec3 l0=normalize(vec3(.2,-1.,1.));vec3 l1=normalize(vec3(-.2,-1.,0.));float brightness=min(1.,(max(0.,dot(l0,n))+max(0.,dot(l1,n)))*.6+.4);gl_FragColor=vec4(color.rgb*brightness,color.a);}`;

function buildRenderer(canvas: HTMLCanvasElement, model: "wide" | "slim") {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
  });

  if (!gl) {
    throw new Error("WebGL is unavailable");
  }

  const shader = (type: number, source: string) => {
    const result = gl.createShader(type)!;
    gl.shaderSource(
      result,
      `#version 300 es\n${
        type === gl.VERTEX_SHADER
          ? source
              .replaceAll("attribute ", "in ")
              .replaceAll("varying ", "out ")
          : source
              .replaceAll("varying ", "in ")
              .replaceAll("texture2D(", "texture(")
              .replace("void main()", "out vec4 fragmentColor;void main()")
              .replaceAll("gl_FragColor", "fragmentColor")
      }`
    );
    gl.compileShader(result);

    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(result);
      gl.deleteShader(result);
      throw new Error(message ?? "Player shader failed");
    }

    return result;
  };

  const vertex = shader(gl.VERTEX_SHADER, vs);
  const fragment = shader(gl.FRAGMENT_SHADER, fs);
  const program = gl.createProgram();

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(
      gl.getProgramInfoLog(program) ?? "Player shader link failed"
    );
  }

  gl.useProgram(program);

  const source = playerMeshes[model];
  const data = new Float32Array((source.length / 4) * 6 * 8);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

  for (const [name, size, offset] of [
    ["position", 3, 0],
    ["uv", 2, 12],
    ["normal", 3, 20],
  ] as const) {
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 32, offset);
  }

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.disable(gl.CULL_FACE);
  gl.frontFace(gl.CW);
  gl.disable(gl.DITHER);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.GEQUAL);
  gl.clearDepth(0);
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(
    gl.SRC_ALPHA,
    gl.ONE_MINUS_SRC_ALPHA,
    gl.ONE,
    gl.ONE_MINUS_SRC_ALPHA
  );

  const framebuffer = gl.createFramebuffer();
  const colorBuffer = gl.createRenderbuffer();
  const depthBuffer = gl.createRenderbuffer();

  let loaded = false;

  return {
    dispose() {
      gl.deleteFramebuffer(framebuffer);
      gl.deleteRenderbuffer(colorBuffer);
      gl.deleteRenderbuffer(depthBuffer);
      gl.deleteBuffer(buffer);
      gl.deleteTexture(texture);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    },
    load(image: HTMLImageElement) {
      if (image.naturalWidth !== 64 || image.naturalHeight !== 64) {
        throw Error("Player skins must be64×64 PNG images");
      }

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image
      );
      loaded = true;
    },
    paint(width: number, height: number, scale: number, pose: PlayerRotation) {
      if (!loaded) {
        return;
      }

      canvas.width = width * scale;
      canvas.height = height * scale;
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.bindRenderbuffer(gl.RENDERBUFFER, colorBuffer);
      gl.renderbufferStorage(
        gl.RENDERBUFFER,
        gl.RGBA8,
        canvas.width,
        canvas.height
      );
      gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.RENDERBUFFER,
        colorBuffer
      );
      gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
      gl.renderbufferStorage(
        gl.RENDERBUFFER,
        gl.DEPTH_COMPONENT32F,
        canvas.width,
        canvas.height
      );
      gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER,
        gl.DEPTH_ATTACHMENT,
        gl.RENDERBUFFER,
        depthBuffer
      );
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(
        gl.getUniformLocation(program, "viewport"),
        canvas.width,
        canvas.height
      );
      gl.uniform2f(
        gl.getUniformLocation(program, "angle"),
        (pose.pitch * Math.PI) / 180,
        (pose.yaw * Math.PI) / 180
      );

      const f = Math.fround;
      const half = f(f(f(-pose.yaw) * f(Math.PI / 180)) * 0.5);
      const qy = f(Math.sin(half));
      const qw = nativeCosFromSin(qy, half);
      const cy = f(f(qw * qw) - f(qy * qy));
      const sy = f(f(qy * qw) + f(qy * qw));
      const yy = f(f(qw * qw) + f(qy * qy));
      const size = f(f(f(f(0.97) * height) / 2.125) * scale);
      const a = f(size * cy);
      const b = f(size * sy);
      const c = f(size * sy);
      const d = f(-size * cy);
      const ys = f(size * yy);
      const baseY = f(f(ys * f(-1.6010001)) + canvas.height);

      let cursor = 0;

      for (let q = 0; q < source.length; q += 4) {
        for (const i of [0, 1, 2, 2, 3, 0]) {
          const v = source[q + i],
            tx = f(f(a * v[8]) + f(f(b * v[10]) + canvas.width * 0.5)),
            ty = f(f(ys * v[9]) + baseY),
            tz = f(f(c * v[8]) + f(d * v[10]));

          data.set(
            [
              f(f(a * v[0]) + f(f(b * v[2]) + tx)),
              f(f(ys * v[1]) + ty),
              f(f(c * v[0]) + f(f(d * v[2]) + tz)),
              v[3],
              v[4],
              f(f(cy * v[5]) + f(sy * v[7])),
              f(yy * v[6]),
              f(-f(f(-sy * v[5]) + f(cy * v[7]))),
            ],
            cursor
          );
          cursor += 8;
        }
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

      const order = Array.from({ length: source.length / 4 }, (_, i) => i).sort(
        (a, b) =>
          Math.fround(Math.fround(data[a * 48 + 2] + data[a * 48 + 18]) * 0.5) -
          Math.fround(Math.fround(data[b * 48 + 2] + data[b * 48 + 18]) * 0.5)
      );

      const sorted = new Float32Array(data.length);

      for (const [index, q] of order.entries()) {
        sorted.set(data.subarray(q * 48, (q + 1) * 48), index * 48);
      }

      gl.bufferSubData(gl.ARRAY_BUFFER, 0, sorted);

      const ph = f(f(f(pose.pitch) * f(Math.PI / 180)) * 0.5);
      const qx = f(Math.sin(ph));
      const pw = nativeCosFromSin(qx, ph);
      const xx = f(f(pw * pw) + f(qx * qx));
      const cx = f(f(pw * pw) - f(qx * qx));
      const sx = f(f(qx * pw) + f(qx * pw));
      const pivot = f(size * 1.0625);

      gl.uniformMatrix4fv(
        gl.getUniformLocation(program, "modelView"),
        false,
        new Float32Array([
          xx,
          0,
          0,
          0,
          0,
          cx,
          sx,
          0,
          0,
          -sx,
          cx,
          0,
          0,
          f(pivot - f(cx * pivot)),
          f(-f(sx * pivot)),
          1,
        ])
      );
      gl.uniformMatrix4fv(
        gl.getUniformLocation(program, "projection"),
        false,
        new Float32Array([
          f(2 / canvas.width),
          0,
          0,
          0,
          0,
          f(2 / canvas.height),
          0,
          0,
          0,
          0,
          f(0.001),
          0,
          -1,
          -1,
          0,
          1,
        ])
      );
      gl.drawArrays(gl.TRIANGLES, 0, data.length / 8);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffer);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
      gl.blitFramebuffer(
        0,
        0,
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height,
        gl.COLOR_BUFFER_BIT,
        gl.NEAREST
      );
    },
  };
}

// Match JOML's float quaternion construction, including the exact half-turn.
function nativeCosFromSin(sine: number, angle: number) {
  const f = Math.fround;
  const pi = f(Math.PI);
  const tau = f(Math.PI * 2);
  const shifted = f(angle + f(Math.PI / 2));

  let wrapped = f(shifted - f(Math.trunc(f(shifted / tau)) * tau));

  if (wrapped < 0) {
    wrapped = f(tau + wrapped);
  }

  const magnitude = f(Math.sqrt(f(1 - f(sine * sine))));

  return wrapped >= pi ? -magnitude : magnitude;
}

const PlayerPreview = ({
  skin = "wide/steve",
  src,
  username,
  model,
  rotation,
  defaultRotation = { pitch: -5, yaw: 30 },
  onRotationChange,
  width = 80,
  height = 120,
  scale = 2,
  onLoadingStatusChange,
  className,
  style,
  onKeyDown,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  ...props
}: PlayerPreviewProps) => {
  const requestedModel =
    model ??
    (!src && !username
      ? skin.startsWith("slim/")
        ? "slim"
        : "wide"
      : undefined);

  const [resolvedModel, setResolvedModel] = React.useState<
    "wide" | "slim" | undefined
  >(requestedModel);

  const url =
    src ??
    (username
      ? `https://mc-heads.net/skin/${encodeURIComponent(username)}`
      : minecraftAvatarSkins[skin].png);

  const [pose, setPose] = React.useState(defaultRotation);

  const [status, setStatus] = React.useState<"loading" | "loaded" | "error">(
    "loading"
  );

  const canvas = React.useRef<HTMLCanvasElement>(null);
  const renderer = React.useRef<ReturnType<typeof buildRenderer> | null>(null);

  const drag = React.useRef<{
    x: number;
    y: number;
    pose: PlayerRotation;
    id: number;
  } | null>(null);

  const current = rotation ?? pose;
  const latest = React.useRef(current);

  latest.current = current;

  const update = (next: PlayerRotation) => {
    const value = {
      pitch: Math.max(-50, Math.min(50, Math.fround(next.pitch))),
      yaw: Math.fround(next.yaw),
    };

    if (rotation === undefined) {
      setPose(value);
    }

    onRotationChange?.(value);
  };

  React.useEffect(() => {
    const node = canvas.current;

    return () => {
      if (renderer.current) {
        node
          ?.getContext("webgl2")
          ?.getExtension("WEBGL_lose_context")
          ?.loseContext();
      }
    };
  }, []);
  const loadingCallback = React.useRef(onLoadingStatusChange);
  loadingCallback.current = onLoadingStatusChange;
  React.useEffect(() => {
    let live = true;
    let instance: ReturnType<typeof buildRenderer> | undefined;
    setStatus("loading");
    loadingCallback.current?.("loading");
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (!live) {
        return;
      }

      try {
        const actualModel = requestedModel ?? inferPlayerSkinModel(image);
        instance = buildRenderer(canvas.current!, actualModel);
        renderer.current = instance;
        instance.load(image);
        instance.paint(width, height, scale, latest.current);
        setResolvedModel(actualModel);
        setStatus("loaded");
        loadingCallback.current?.("loaded");
      } catch {
        setStatus("error");
        loadingCallback.current?.("error");
      }
    };

    image.onerror = () => {
      if (live) {
        setStatus("error");
        loadingCallback.current?.("error");
      }
    };

    image.src = url;

    return () => {
      live = false;
      image.onload = null;
      image.onerror = null;
      instance?.dispose();
      renderer.current = null;
    };
  }, [url, requestedModel]);
  React.useLayoutEffect(() => {
    renderer.current?.paint(width, height, scale, current);
  }, [width, height, scale, current.pitch, current.yaw, status]);

  return (
    <div
      {...props}
      data-slot="player-preview"
      data-model={resolvedModel}
      data-ready={status === "loaded"}
      className={cn(`mc-player-preview`, className)}
      tabIndex={props.tabIndex ?? 0}
      role={props.role ?? "group"}
      aria-label={
        props["aria-label"] ??
        `${username ?? skin.split("/")[1]} player preview`
      }
      style={minecraftStyle(style, (__style) => ({
        height: height * scale,
        width: width * scale,
        ...__style,
      }))}
      onKeyDown={(event) => {
        onKeyDown?.(event);

        if (event.defaultPrevented) {
          return;
        }

        const delta = {
          ArrowDown: [5, 0],
          ArrowLeft: [0, -5],
          ArrowRight: [0, 5],
          ArrowUp: [-5, 0],
        }[event.key];

        if (delta) {
          event.preventDefault();
          update({
            pitch: current.pitch + delta[0],
            yaw: current.yaw + delta[1],
          });
        }

        if (event.key === "Home") {
          event.preventDefault();
          update(defaultRotation);
        }
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event);

        if (event.defaultPrevented) {
          return;
        }

        if (event.button !== 0) {
          return;
        }

        drag.current = {
          id: event.pointerId,
          pose: current,
          x: event.clientX,
          y: event.clientY,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);

        if (event.defaultPrevented) {
          return;
        }

        const start = drag.current;

        if (!start || start.id !== event.pointerId) {
          return;
        }

        update({
          pitch: start.pose.pitch - ((event.clientY - start.y) / scale) * 2.5,
          yaw: start.pose.yaw + ((event.clientX - start.x) / scale) * 2.5,
        });
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        drag.current = null;

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        drag.current = null;
      }}
    >
      <canvas
        ref={canvas}
        width={width * scale}
        height={height * scale}
        aria-hidden="true"
        style={{
          height: "100%",
          transform: "scaleY(-1)",
          visibility: status === "loaded" ? "visible" : "hidden",
          width: "100%",
        }}
      />
      {status !== "loaded" && (
        <span role="status">
          {status === "loading" ? "Loading skin..." : "3D preview unavailable"}
        </span>
      )}
      <span className="mc-player-preview-accessible">
        Drag to rotate. Arrow keys rotate; Home resets.
      </span>
    </div>
  );
};

export { PlayerPreview };

export type { PlayerRotation, PlayerPreviewProps };
