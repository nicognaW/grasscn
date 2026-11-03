"use client";

import * as React from "react";

import { adventureAssets } from "./minecraft-adventure-assets";
import { AdventureImage } from "./minecraft-adventure-image";
import { mapAtlasPng } from "./minecraft-map-atlas";
import { mapGpuPixels } from "./minecraft-map-gpu";
import { minecraftMapPalette } from "./minecraft-map-palette";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";

import "./minecraft-map.css";

interface MapLayoutStyle1 extends React.CSSProperties {
  "--mc-dynamic-map-1-height": number;
  "--mc-dynamic-map-1-width": number;
}

interface MapLayoutStyle2 extends React.CSSProperties {
  "--mc-dynamic-map-2-height": number;
  "--mc-dynamic-map-2-left": number;
  "--mc-dynamic-map-2-top": number;
  "--mc-dynamic-map-2-transform": string;
  "--mc-dynamic-map-2-width": number;
}

interface MapLayoutStyle3 extends React.CSSProperties {
  "--mc-dynamic-map-3-visibility": string;
}

interface MapLayoutStyle4 extends React.CSSProperties {
  "--mc-dynamic-map-4-height": number;
  "--mc-dynamic-map-4-width": number;
}

interface MapLayoutStyle5 extends React.CSSProperties {
  "--mc-dynamic-map-5-height": number;
  "--mc-dynamic-map-5-left": number;
  "--mc-dynamic-map-5-top": number;
  "--mc-dynamic-map-5-width": number;
}

interface MapLayoutStyle6 extends React.CSSProperties {
  "--mc-dynamic-map-6-left": number;
  "--mc-dynamic-map-6-top": number;
}

interface MapScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

type MapDecoration = keyof typeof adventureAssets extends infer K
  ? K extends `map/decorations/${infer N}`
    ? N
    : never
  : never;

interface MapMarker {
  id: string;
  x: number;
  y: number;
  label: string;
  decoration?: MapDecoration;
  rotation?: number;
}

type MinecraftMapProps = React.ComponentProps<"div"> & {
  pixels: Uint8Array;
  markers?: readonly MapMarker[];
  scale?: 1 | 2 | 3;
  onMarkerSelect?: (id: string) => void;
  onMapClick?: (point: { x: number; y: number }) => void;
};

const MinecraftMap = ({
  pixels,
  markers = [],
  scale = 2,
  onMarkerSelect,
  onMapClick,
  onClick,
  className,
  style,
  ...props
}: MinecraftMapProps) => {
  if (pixels.length !== 16_384) {
    throw new Error("Minecraft maps require exactly128脳128 palette bytes");
  }

  const ref = React.useRef<HTMLCanvasElement>(null);
  const [gpuReady, setGpuReady] = React.useState(false);
  const [revision, setRevision] = React.useState(0);

  React.useEffect(() => {
    const repaint = () => {
      setRevision((v) => v + 1);
    };

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        repaint();
      }
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

    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const image = ctx.createImageData(128, 128);

    canvas.width = 128;
    canvas.height = 128;
    setGpuReady(false);

    for (let i = 0; i < pixels.length; i += 1) {
      const color = pixels[i];
      const rgba = minecraftMapPalette[color];
      const j = i * 4;

      // oxlint-disable-next-line no-bitwise -- Map palette bytes reserve their low two bits for shade; a zero base-color field is transparent.
      if (color >> 2 === 0) {
        continue;
      }

      /* oxlint-disable no-bitwise -- Unpack the palette ARGB word into the four ImageData byte channels. */
      image.data[j] = (rgba >>> 16) & 255;
      image.data[j + 1] = (rgba >>> 8) & 255;
      image.data[j + 2] = rgba & 255;
      image.data[j + 3] = rgba >>> 24;
      /* oxlint-enable no-bitwise */
    }

    ctx.putImageData(image, 0, 0);

    if (markers.length) {
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
          async (src) =>
            // oxlint-disable-next-line promise/avoid-new -- Preserve this Image event bridge, loaded-element result and raw load-error event.
            await new Promise<HTMLImageElement>((resolve, reject) => {
              const loadedImage = new Image();
              loadedImage.onload = () => {
                resolve(loadedImage);
              };

              loadedImage.onerror = reject;
              loadedImage.src = src;
            })
        )
      )
        .then((images) => {
          if (!live) {
            return;
          }

          const bounds = canvas.getBoundingClientRect();

          const output = mapGpuPixels(
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
    }

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
      className={cn(`mc-map`, className)}
      style={minecraftStyle(style, (__style) => ({
        height: 128 * scale,
        width: 128 * scale,
        ...__style,
      }))}
      onClick={(event) => {
        onClick?.(event);

        if (
          event.defaultPrevented ||
          (event.target as HTMLElement).closest("button")
        ) {
          return;
        }

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
        className="mc-dynamic-layout-map-1"
        style={
          /* SAFETY: The owned mc-dynamic-layout-map-1 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
          {
            "--mc-dynamic-map-1-height": 128 * scale,
            "--mc-dynamic-map-1-width": 128 * scale,
          } satisfies MapLayoutStyle1 as MapLayoutStyle1
        }
      />
      {markers.map((marker) => (
        <button
          type="button"
          key={marker.id}
          className="mc-map-marker mc-dynamic-layout-map-2"
          aria-label={marker.label}
          onClick={(event) => {
            if (!event.defaultPrevented) {
              onMarkerSelect?.(marker.id);
            }
          }}
          style={
            /* SAFETY: The owned mc-dynamic-layout-map-2 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
            {
              "--mc-dynamic-map-2-height": 8 * scale,
              "--mc-dynamic-map-2-left": (64 + marker.x / 2 - 4) * scale,
              "--mc-dynamic-map-2-top": (64 + marker.y / 2 - 4) * scale,
              "--mc-dynamic-map-2-transform": `rotate(${(marker.rotation ?? 0) * 22.5}deg) translate(${-scale * 0.5}px,${scale * 0.5}px)`,
              "--mc-dynamic-map-2-width": 8 * scale,
            } satisfies MapLayoutStyle2 as MapLayoutStyle2
          }
        >
          <AdventureImage
            texture={`map/decorations/${marker.decoration ?? "player"}`}
            scale={scale}
            className="mc-layout-map-3 mc-dynamic-layout-map-3"
            style={
              /* SAFETY: The owned mc-dynamic-layout-map-3 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
              {
                "--mc-dynamic-map-3-visibility": gpuReady
                  ? "hidden"
                  : "visible",
              } satisfies MapLayoutStyle3 as MapLayoutStyle3
            }
          />
        </button>
      ))}
    </div>
  );
};

const LocatorDot = ({
  shape,
  color,
  scale,
}: {
  shape: "default_0" | "default_1" | "default_2" | "default_3" | "bowtie";
  color: string;
  scale: number;
}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    let live = true;
    const image = new Image();
    image.onload = () => {
      if (!live) {
        return;
      }

      const canvas = ref.current!;
      const ctx = canvas.getContext("2d")!;

      canvas.width = 9;
      canvas.height = 9;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 0, 0, 9, 9);

      const pixels = ctx.getImageData(0, 0, 9, 9);

      const raw = /^#[0-9a-f]{6}$/iu.test(color)
        ? Number.parseInt(color.slice(1), 16)
        : 0xff_ff_ff;

      for (let i = 0; i < pixels.data.length; i += 4) {
        /* oxlint-disable no-bitwise -- Tint each texture byte with the corresponding channel of the packed RGB color. */
        pixels.data[i] = Math.round(
          (pixels.data[i] * ((raw >> 16) & 255)) / 255
        );
        pixels.data[i + 1] = Math.round(
          (pixels.data[i + 1] * ((raw >> 8) & 255)) / 255
        );
        pixels.data[i + 2] = Math.round(
          (pixels.data[i + 2] * (raw & 255)) / 255
        );
        /* oxlint-enable no-bitwise */
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
      className="mc-layout-map-4 mc-dynamic-layout-map-4"
      style={
        /* SAFETY: The owned mc-dynamic-layout-map-4 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
        {
          "--mc-dynamic-map-4-height": 9 * scale,
          "--mc-dynamic-map-4-width": 9 * scale,
        } satisfies MapLayoutStyle4 as MapLayoutStyle4
      }
    />
  );
};

interface LocatorMarker {
  id: string;
  label: string;
  bearing: number;
  direction?: "up" | "down";
  color?: string;
  shape?: "default_0" | "default_1" | "default_2" | "default_3" | "bowtie";
}

type LocatorBarProps = React.ComponentProps<"div"> & {
  markers: readonly LocatorMarker[];
  heading?: number;
  scale?: 1 | 2 | 3;
  onMarkerSelect?: (id: string) => void;
};

const LocatorBar = ({
  markers,
  heading = 0,
  scale = 2,
  onMarkerSelect,
  className,
  style,
  ...props
}: LocatorBarProps) => (
  <div
    {...props}
    data-slot="locator-bar"
    role={props.role ?? "group"}
    aria-label={props["aria-label"] ?? "Locator bar"}
    className={cn(`mc-locator-bar`, className)}
    style={minecraftStyle(style, (__style): MapScaleStyle => ({
      "--mc-scale": scale,
      borderImageRepeat: "repeat",
      borderImageSlice: "1 5 fill",
      borderImageSource: `url("${adventureAssets["gui/sprites/hud/locator_bar_background"].src}")`,
      borderImageWidth: `${scale}px ${5 * scale}px`,
      height: 5 * scale,
      width: 182 * scale,
      ...__style,
    }))}
  >
    {markers.map((marker) => {
      const relative = ((((marker.bearing - heading) % 360) + 540) % 360) - 180;

      if (relative <= -60 || relative > 60) {
        return null;
      }

      const x = 87 + Math.floor((relative * 173) / 120);

      return (
        <button
          type="button"
          key={marker.id}
          aria-label={marker.label}
          onClick={(event) => {
            if (!event.defaultPrevented) {
              onMarkerSelect?.(marker.id);
            }
          }}
          className="mc-locator-marker mc-dynamic-layout-map-5"
          style={
            /* SAFETY: The owned mc-dynamic-layout-map-5 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
            {
              "--mc-dynamic-map-5-height": 9 * scale,
              "--mc-dynamic-map-5-left": x * scale,
              "--mc-dynamic-map-5-top": -2 * scale,
              "--mc-dynamic-map-5-width": 9 * scale,
            } satisfies MapLayoutStyle5 as MapLayoutStyle5
          }
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
              className="mc-layout-map-6 mc-dynamic-layout-map-6"
              style={
                /* SAFETY: The owned mc-dynamic-layout-map-6 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
                {
                  "--mc-dynamic-map-6-left": scale,
                  "--mc-dynamic-map-6-top":
                    (marker.direction === "up" ? -4 : 8) * scale,
                } satisfies MapLayoutStyle6 as MapLayoutStyle6
              }
            />
          )}
        </button>
      );
    })}
  </div>
);

export { MinecraftMap, LocatorBar };

export type { MinecraftMapProps, MapMarker, LocatorMarker, LocatorBarProps };
