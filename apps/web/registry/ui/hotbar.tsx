"use client";

import * as React from "react";

import { AdventureImage } from "./minecraft-adventure-image";
import { hotbarRgba } from "./minecraft-hotbar-rgba";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";

import "./minecraft-hotbar.css";

interface HotbarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

type HotbarProps = Omit<
  React.ComponentProps<"div">,
  "defaultValue" | "onChange"
> & {
  items?: readonly HotbarItem[];
  value?: number;
  defaultValue?: number;
  onValueChange?: (slot: number) => void;
  scale?: 1 | 2 | 3;
  background?: string;
};

const HotbarPaint = ({
  value,
  background,
  scale,
}: {
  value: number;
  background: string;
  scale: number;
}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useLayoutEffect(() => {
    const ctx = ref.current!.getContext("2d")!;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 184, 23);
    const image = ctx.getImageData(0, 0, 184, 23);

    for (const [name, left, top] of [
      ["hotbar", 1, 1],
      ["hotbar_selection", value * 20, 0],
    ] as const) {
      const asset = hotbarRgba[name];
      const bytes = Uint8Array.from(atob(asset.rgba), (c) => c.charCodeAt(0));

      for (let y = 0; y < asset.height; y += 1) {
        for (let x = 0; x < asset.width; x += 1) {
          const from = (y * asset.width + x) * 4;
          const to = ((y + top) * 184 + x + left) * 4;
          const alpha = bytes[from + 3] / 255;

          for (let k = 0; k < 3; k += 1) {
            image.data[to + k] = Math.round(
              bytes[from + k] * alpha + image.data[to + k] * (1 - alpha)
            );
          }
        }
      }
    }

    ctx.putImageData(image, 0, 0);
  }, [value, background]);

  return (
    <canvas
      ref={ref}
      width={184}
      height={23}
      aria-hidden="true"
      style={{
        height: 23 * scale,
        imageRendering: "pixelated",
        left: 0,
        position: "absolute",
        top: 0,
        width: 184 * scale,
      }}
    />
  );
};

const Hotbar = ({
  items = [],
  value,
  defaultValue = 0,
  onValueChange,
  scale = 2,
  background,
  className,
  style,
  ref: forwardedRef,
  onKeyDown,
  onWheelCapture,
  ...props
}: HotbarProps) => {
  if (items.length > 9) {
    throw Error("A Minecraft hotbar has nine slots");
  }

  const [internal, setInternal] = React.useState(defaultValue);
  const current = value ?? internal;
  const root = React.useRef<HTMLDivElement>(null);

  const cancelledWheel = React.useRef<WheelEvent | null>(null);
  React.useImperativeHandle(forwardedRef, () => root.current!, []);

  if (!Number.isInteger(current) || current < 0 || current > 8) {
    throw Error("Hotbar value must be a slot from 0 to 8");
  }

  const select = React.useCallback(
    (next: number) => {
      if (items[next]?.disabled ?? false) {
        return;
      }

      if (value === undefined) {
        setInternal(next);
      }

      if (next !== current) {
        onValueChange?.(next);
      }
    },
    [value, current, onValueChange, items]
  );

  React.useEffect(() => {
    const element = root.current;

    if (!element) {
      return;
    }

    const wheel = (event: WheelEvent) => {
      if (cancelledWheel.current === event) {
        event.preventDefault();

        return;
      }

      if (event.defaultPrevented || !element.contains(document.activeElement)) {
        return;
      }

      event.preventDefault();
      select((current + (event.deltaY > 0 ? 1 : 8)) % 9);
    };

    element.addEventListener("wheel", wheel, { passive: false });

    return () => {
      element.removeEventListener("wheel", wheel);
    };
  }, [current, select]);

  return (
    <div
      {...props}
      ref={root}
      onWheelCapture={(event) => {
        onWheelCapture?.(event);
        cancelledWheel.current = event.defaultPrevented
          ? event.nativeEvent
          : null;
      }}
      role="toolbar"
      aria-label={props["aria-label"] ?? "Hotbar"}
      data-slot="hotbar"
      className={cn(`mc-hotbar`, className)}
      style={minecraftStyle(
        style,
        (__style) =>
          ({
            "--mc-scale": scale,
            height: 23 * scale,
            width: 184 * scale,
            ...__style,
          }) as React.CSSProperties
      )}
      onKeyDown={(event) => {
        onKeyDown?.(event);

        if (event.defaultPrevented) {
          return;
        }

        let next: number | undefined;

        if (/^[1-9]$/u.test(event.key)) {
          next = Number(event.key) - 1;
        }

        if (event.key === "ArrowRight") {
          next = (current + 1) % 9;
        }

        if (event.key === "ArrowLeft") {
          next = (current + 8) % 9;
        }

        if (event.key === "Home") {
          next = 0;
        }

        if (event.key === "End") {
          next = 8;
        }

        if (next !== undefined) {
          event.preventDefault();
          select(next);

          if (!(items[next]?.disabled ?? false)) {
            root.current
              ?.querySelectorAll<HTMLButtonElement>("button")
              [next]?.focus();
          }
        }
      }}
    >
      {background ? (
        <HotbarPaint value={current} background={background} scale={scale} />
      ) : (
        <>
          <AdventureImage
            texture="gui/sprites/hud/hotbar"
            scale={scale}
            style={{ left: scale, position: "absolute", top: scale }}
          />
          <AdventureImage
            texture="gui/sprites/hud/hotbar_selection"
            scale={scale}
            style={{ left: current * 20 * scale, position: "absolute", top: 0 }}
          />
        </>
      )}
      {Array.from({ length: 9 }, (_, i) => (
        <button
          key={items[i]?.id ?? i}
          type="button"
          data-slot="hotbar-item"
          aria-label={items[i]?.label ?? `Slot ${i + 1}`}
          aria-pressed={current === i}
          disabled={items[i]?.disabled}
          tabIndex={current === i ? 0 : -1}
          onClick={(event) => {
            if (!event.defaultPrevented) {
              select(i);
            }
          }}
          style={{
            height: 16 * scale,
            left: (4 + i * 20) * scale,
            top: 4 * scale,
            width: 16 * scale,
          }}
        >
          {items[i]?.icon}
        </button>
      ))}
    </div>
  );
};

export { Hotbar };

export type { HotbarItem, HotbarProps };
