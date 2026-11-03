"use client";

import * as React from "react";

import { AdventureImage } from "./minecraft-adventure-image";
import { hotbarRgba } from "./minecraft-hotbar-rgba";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";

import "./minecraft-hotbar.css";

interface HotbarLayoutStyle1 extends React.CSSProperties {
  "--mc-dynamic-hotbar-1-height": number;
  "--mc-dynamic-hotbar-1-width": number;
}

interface HotbarLayoutStyle2 extends React.CSSProperties {
  "--mc-dynamic-hotbar-2-left": number;
  "--mc-dynamic-hotbar-2-top": number;
}

interface HotbarLayoutStyle3 extends React.CSSProperties {
  "--mc-dynamic-hotbar-3-left": number;
}

interface HotbarLayoutStyle4 extends React.CSSProperties {
  "--mc-dynamic-hotbar-4-height": number;
  "--mc-dynamic-hotbar-4-left": number;
  "--mc-dynamic-hotbar-4-top": number;
  "--mc-dynamic-hotbar-4-width": number;
}

interface HotbarScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

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

      const bytes = Uint8Array.from(
        atob(asset.rgba),
        (c) => c.codePointAt(0) ?? Number.NaN
      );

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
      className="mc-layout-hotbar-1 mc-dynamic-layout-hotbar-1"
      style={
        /* SAFETY: The owned mc-dynamic-layout-hotbar-1 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
        {
          "--mc-dynamic-hotbar-1-height": 23 * scale,
          "--mc-dynamic-hotbar-1-width": 184 * scale,
        } satisfies HotbarLayoutStyle1 as HotbarLayoutStyle1
      }
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
    throw new Error("A Minecraft hotbar has nine slots");
  }

  const [internal, setInternal] = React.useState(defaultValue);
  const current = value ?? internal;
  const root = React.useRef<HTMLDivElement>(null);

  const cancelledWheel = React.useRef<WheelEvent | null>(null);
  React.useImperativeHandle<typeof root.current, typeof root.current>(
    forwardedRef,
    () => root.current,
    []
  );

  if (!Number.isInteger(current) || current < 0 || current > 8) {
    throw new Error("Hotbar value must be a slot from 0 to 8");
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
      style={minecraftStyle(style, (__style): HotbarScaleStyle => ({
        "--mc-scale": scale,
        height: 23 * scale,
        width: 184 * scale,
        ...__style,
      }))}
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
            className="mc-layout-hotbar-2 mc-dynamic-layout-hotbar-2"
            style={
              /* SAFETY: The owned mc-dynamic-layout-hotbar-2 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
              {
                "--mc-dynamic-hotbar-2-left": scale,
                "--mc-dynamic-hotbar-2-top": scale,
              } satisfies HotbarLayoutStyle2 as HotbarLayoutStyle2
            }
          />
          <AdventureImage
            texture="gui/sprites/hud/hotbar_selection"
            scale={scale}
            className="mc-layout-hotbar-3 mc-dynamic-layout-hotbar-3"
            style={
              /* SAFETY: The owned mc-dynamic-layout-hotbar-3 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
              {
                "--mc-dynamic-hotbar-3-left": current * 20 * scale,
              } satisfies HotbarLayoutStyle3 as HotbarLayoutStyle3
            }
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
          className="mc-dynamic-layout-hotbar-4"
          style={
            /* SAFETY: The owned mc-dynamic-layout-hotbar-4 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
            {
              "--mc-dynamic-hotbar-4-height": 16 * scale,
              "--mc-dynamic-hotbar-4-left": (4 + i * 20) * scale,
              "--mc-dynamic-hotbar-4-top": 4 * scale,
              "--mc-dynamic-hotbar-4-width": 16 * scale,
            } satisfies HotbarLayoutStyle4 as HotbarLayoutStyle4
          }
        >
          {items[i]?.icon}
        </button>
      ))}
    </div>
  );
};

export { Hotbar };

export type { HotbarItem, HotbarProps };
