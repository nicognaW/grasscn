"use client";
import * as React from "react";

import { adventureAssets } from "./minecraft-adventure-assets";
import { AdventureImage } from "./minecraft-adventure-image";
import { mapAtlasPng } from "./minecraft-map-atlas";
import { mapGpuPixels } from "./minecraft-map-gpu";
import { minecraftMapPalette } from "./minecraft-map-palette";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";

import "./minecraft-map.css";
type MapDecoration = keyof typeof adventureAssets extends infer K
  ? K extends `map/decorations/${infer N}`
    ? N
    : never
  : never;
type MapMarker = {
  id: string;
  x: number;
  y: number;
  label: string;
  decoration?: MapDecoration;
  rotation?: number;
};
type MinecraftMapProps = React.ComponentProps<"div"> & {
  pixels: Uint8Array;
  markers?: readonly MapMarker[];
  scale?: 1 | 2 | 3;
  onMarkerSelect?: (id: string) => void;
  onMapClick?: (point: { x: number; y: number }) => void;
};
function MinecraftMap({
  pixels,
  markers = [],
  scale = 2,
  onMarkerSelect,
  onMapClick,
  onClick,
  className,
  style,
  ...props
}: MinecraftMapProps) {
  if (pixels.length !== 16384)
    throw Error("Minecraft maps require exactly128脳128 palette bytes");
  const ref = React.useRef<HTMLCanvasElement>(null),
    [gpuReady, setGpuReady] = React.useState(false),
    [revision, setRevision] = React.useState(0);
  React.useEffect(() => {
    const repaint = () => setRevision((v) => v + 1),
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) repaint();
      });
    observer.observe(ref.current!);
    window.addEventListener("resize", repaint);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", repaint);
    };
  }, []);
  React.useLayoutEffect(() => {
    let live = true;
    const canvas = ref.current!,
      ctx = canvas.getContext("2d")!,
      image = ctx.createImageData(128, 128);
    canvas.width = 128;
    canvas.height = 128;
    setGpuReady(false);
    for (let i = 0; i < pixels.length; i++) {
      const color = pixels[i],
        rgba = minecraftMapPalette[color],
        j = i * 4;
      if (color >> 2 === 0) continue;
      image.data[j] = (rgba >>> 16) & 255;
      image.data[j + 1] = (rgba >>> 8) & 255;
      image.data[j + 2] = rgba & 255;
      image.data[j + 3] = rgba >>> 24;
    }
    ctx.putImageData(image, 0, 0);
    if (markers.length)
      Promise.all(
        [
          ...markers.map(
            (marker) =>
              adventureAssets[
                `map/decorations/${marker.decoration ?? "player"}`
              ].src
          ),
          mapAtlasPng,
        ].map(
          (src) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const image = new Image();
              image.onload = () => resolve(image);
              image.onerror = reject;
              image.src = src;
            })
        )
      )
        .then((images) => {
          if (!live) return;
          const bounds = canvas.getBoundingClientRect(),
            output = mapGpuPixels(
              image,
              images,
              markers,
              scale,
              bounds.x,
              bounds.y
            );
          if (output) {
            canvas.width = 128 * scale;
            canvas.height = 128 * scale;
            ctx.putImageData(
              new ImageData(output, canvas.width, canvas.height),
              0,
              0
            );
            setGpuReady(true);
          }
        })
        .catch(() => {});
    return () => {
      live = false;
    };
  }, [pixels, markers, scale, revision]);
  return (
    <div
      {...props}
      data-slot="minecraft-map"
      role={props.role ?? "group"}
      aria-label={props["aria-label"] ?? "Map"}
      className={cn(`mc-map ${""}`, className)}
      style={minecraftStyle(style, (__style) => ({
        width: 128 * scale,
        height: 128 * scale,
        ...__style,
      }))}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          (event.target as HTMLElement).closest("button")
        )
          return;
        const r = event.currentTarget.getBoundingClientRect();
        onMapClick?.({
          x: Math.max(
            0,
            Math.min(127, Math.floor((event.clientX - r.left) / scale))
          ),
          y: Math.max(
            0,
            Math.min(127, Math.floor((event.clientY - r.top) / scale))
          ),
        });
      }}
    >
      <canvas
        ref={ref}
        width={128}
        height={128}
        role="img"
        aria-label={props["aria-label"] ?? "Map terrain"}
        style={{ width: 128 * scale, height: 128 * scale }}
      />
      {markers.map((marker) => (
        <button
          type="button"
          key={marker.id}
          className="mc-map-marker"
          aria-label={marker.label}
          onClick={(event) => {
            if (!event.defaultPrevented) onMarkerSelect?.(marker.id);
          }}
          style={{
            left: (64 + marker.x / 2 - 4) * scale,
            top: (64 + marker.y / 2 - 4) * scale,
            width: 8 * scale,
            height: 8 * scale,
            transform: `rotate(${(marker.rotation ?? 0) * 22.5}deg) translate(${-scale * 0.5}px,${scale * 0.5}px)`,
          }}
        >
          <AdventureImage
            texture={`map/decorations/${marker.decoration ?? "player"}`}
            scale={scale}
            style={{
              width: "100%",
              height: "100%",
              transform: "scaleY(-1)",
              visibility: gpuReady ? "hidden" : "visible",
            }}
          />
        </button>
      ))}
    </div>
  );
}
function LocatorDot({
  shape,
  color,
  scale,
}: {
  shape: "default_0" | "default_1" | "default_2" | "default_3" | "bowtie";
  color: string;
  scale: number;
}) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    let live = true;
    const image = new Image();
    image.onload = () => {
      if (!live) return;
      const canvas = ref.current!,
        ctx = canvas.getContext("2d")!;
      canvas.width = 9;
      canvas.height = 9;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 0, 0, 9, 9);
      const pixels = ctx.getImageData(0, 0, 9, 9),
        raw = /^#[0-9a-f]{6}$/i.test(color)
          ? parseInt(color.slice(1), 16)
          : 0xffffff;
      for (let i = 0; i < pixels.data.length; i += 4) {
        pixels.data[i] = Math.round(
          (pixels.data[i] * ((raw >> 16) & 255)) / 255
        );
        pixels.data[i + 1] = Math.round(
          (pixels.data[i + 1] * ((raw >> 8) & 255)) / 255
        );
        pixels.data[i + 2] = Math.round(
          (pixels.data[i + 2] * (raw & 255)) / 255
        );
        pixels.data[i + 3] = pixels.data[i + 3];
      }
      ctx.putImageData(pixels, 0, 0);
    };
    image.src = adventureAssets[`gui/sprites/hud/locator_bar_dot/${shape}`].src;
    return () => {
      live = false;
    };
  }, [shape, color]);
  return (
    <canvas
      ref={ref}
      width={9}
      height={9}
      aria-hidden="true"
      style={{
        display: "block",
        width: 9 * scale,
        height: 9 * scale,
        imageRendering: "pixelated",
      }}
    />
  );
}
type LocatorMarker = {
  id: string;
  label: string;
  bearing: number;
  direction?: "up" | "down";
  color?: string;
  shape?: "default_0" | "default_1" | "default_2" | "default_3" | "bowtie";
};
type LocatorBarProps = React.ComponentProps<"div"> & {
  markers: readonly LocatorMarker[];
  heading?: number;
  scale?: 1 | 2 | 3;
  onMarkerSelect?: (id: string) => void;
};
function LocatorBar({
  markers,
  heading = 0,
  scale = 2,
  onMarkerSelect,
  className,
  style,
  ...props
}: LocatorBarProps) {
  return (
    <div
      {...props}
      data-slot="locator-bar"
      role={props.role ?? "group"}
      aria-label={props["aria-label"] ?? "Locator bar"}
      className={cn(`mc-locator-bar ${""}`, className)}
      style={minecraftStyle(
        style,
        (__style) =>
          ({
            "--mc-scale": scale,
            width: 182 * scale,
            height: 5 * scale,
            borderImageSource: `url("${adventureAssets["gui/sprites/hud/locator_bar_background"].src}")`,
            borderImageSlice: "1 5 fill",
            borderImageWidth: `${scale}px ${5 * scale}px`,
            borderImageRepeat: "repeat",
            ...__style,
          }) as React.CSSProperties
      )}
    >
      {markers.map((marker) => {
        const relative =
          ((((marker.bearing - heading) % 360) + 540) % 360) - 180;
        if (relative <= -60 || relative > 60) return null;
        const x = 87 + Math.floor((relative * 173) / 120);
        return (
          <button
            type="button"
            key={marker.id}
            aria-label={marker.label}
            onClick={(event) => {
              if (!event.defaultPrevented) onMarkerSelect?.(marker.id);
            }}
            className="mc-locator-marker"
            style={{
              left: x * scale,
              top: -2 * scale,
              width: 9 * scale,
              height: 9 * scale,
            }}
          >
            <LocatorDot
              shape={marker.shape ?? "default_0"}
              color={marker.color ?? "#ffffff"}
              scale={scale}
            />
            {marker.direction && (
              <AdventureImage
                texture={`gui/sprites/hud/locator_bar_arrow_${marker.direction}`}
                scale={scale}
                style={{
                  position: "absolute",
                  left: scale,
                  top: (marker.direction === "up" ? -4 : 8) * scale,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
export { MinecraftMap, LocatorBar };
export type { MinecraftMapProps, MapMarker, LocatorMarker, LocatorBarProps };
