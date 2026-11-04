"use client";

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import * as React from "react";

import {
  isMinecraftRefCallback,
  isMinecraftRefCleanup,
  minecraftClasses as cn,
  minecraftStyle,
} from "./minecraft-render";
import type { MinecraftProps } from "./minecraft-render";
import { minecraftTextareaAssets } from "./minecraft-textarea-assets";

import "./minecraft-scroll-area.css";

interface ScrollAreaThumbStyle extends React.CSSProperties {
  "--mc-thumb": string;
  "--mc-thumb-height": string;
  "--mc-thumb-offset": string;
  "--mc-track": string;
}

interface ScrollAreaScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

interface Geometry {
  height: number;
  content: number;
  maximum: number;
  thumb: number;
  offset: number;
}

const empty: Geometry = {
  content: 0,
  height: 0,
  maximum: 0,
  offset: 0,
  thumb: 32,
};

const ScrollContext = React.createContext<{
  viewport: React.RefObject<HTMLDivElement | null>;
  scale: number;
  disabled: boolean;
  geometry: Geometry;
} | null>(null);

type ScrollAreaProps = Omit<
  MinecraftProps<typeof ScrollAreaPrimitive.Root>,
  "type" | "scrollHideDelay"
> & {
  type?: "auto";
  scale?: 1 | 2 | 3;
  /** Disables scrolling; child controls retain their own state. */
  disabled?: boolean;
  viewportRef?: React.Ref<HTMLDivElement>;
  viewportProps?: Omit<
    MinecraftProps<typeof ScrollAreaPrimitive.Viewport>,
    "children" | "ref" | "render"
  >;
};

const ScrollBar = ({
  children,
  render,
  className,
  orientation = "vertical",
  style,
  onPointerDownCapture,
  onPointerMoveCapture,
  onPointerUpCapture,
  onPointerCancelCapture,
  onLostPointerCapture,
  ...props
}: ScrollBarProps) => {
  if (orientation !== "vertical") {
    throw new Error("Minecraft ScrollBar supports vertical orientation only");
  }

  const context = React.useContext(ScrollContext);

  if (!context) {
    throw new Error("ScrollBar must be rendered inside ScrollArea");
  }

  const { viewport, scale, disabled, geometry } = context;

  const drag = React.useRef<{
    y: number;
    scroll: number;
  } | null>(null);

  const [dragging, setDragging] = React.useState(false);

  const stop = () => {
    drag.current = null;
    setDragging(false);
  };

  const thumb = (
    <ScrollAreaPrimitive.Thumb
      data-slot="scroll-area-thumb"
      className="mc-scroll-area-thumb"
    />
  );

  return (
    <ScrollAreaPrimitive.Scrollbar
      render={render}
      {...props}
      orientation={orientation}
      data-slot="scroll-area-scrollbar"
      data-dragging={dragging || undefined}
      aria-disabled={disabled || undefined}
      className={cn(`mc-scroll-area-scrollbar`, className)}
      style={minecraftStyle(style, (__style): ScrollAreaThumbStyle => ({
        "--mc-thumb": `url("${minecraftTextareaAssets.scroller}")`,
        "--mc-thumb-height": `${geometry.thumb * scale}px`,
        "--mc-thumb-offset": `${geometry.offset * scale}px`,
        "--mc-track": `url("${minecraftTextareaAssets.scroller_background}")`,
        ...__style,
      }))}
      onPointerDownCapture={(event) => {
        onPointerDownCapture?.(event);
        event.preventBaseUIHandler();

        if (event.defaultPrevented) {
          return;
        }

        if (disabled) {
          event.preventDefault();
          event.stopPropagation();

          return;
        }

        if (event.button !== 0) {
          return;
        }

        event.preventDefault();

        const element = viewport.current!;
        const bounds = event.currentTarget.getBoundingClientRect();

        if (
          !(event.target as Element).closest('[data-slot="scroll-area-thumb"]')
        ) {
          // oxlint-disable-next-line react/immutability -- This pointer handler uses the native scrollTop setter; scrollTo previously failed per-frame equivalence controls.
          element.scrollTop = Math.max(
            0,
            Math.min(
              geometry.maximum * scale,
              ((event.clientY - bounds.top - (geometry.thumb * scale) / 2) *
                geometry.maximum) /
                Math.max(1, geometry.height - geometry.thumb)
            )
          );
        }

        drag.current = { scroll: element.scrollTop, y: event.clientY };
        setDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMoveCapture={(event) => {
        onPointerMoveCapture?.(event);
        event.preventBaseUIHandler();

        if (!event.defaultPrevented && drag.current && !disabled) {
          event.preventDefault();
          // oxlint-disable-next-line react/immutability -- This pointer handler uses the native scrollTop setter; scrollTo previously failed per-frame equivalence controls.
          viewport.current!.scrollTop =
            drag.current.scroll +
            ((event.clientY - drag.current.y) * geometry.maximum) /
              Math.max(1, geometry.height - geometry.thumb);
        }
      }}
      onPointerUpCapture={(event) => {
        onPointerUpCapture?.(event);
        event.preventBaseUIHandler();

        if (drag.current) {
          event.preventDefault();
          stop();
        }
      }}
      onPointerCancelCapture={(event) => {
        onPointerCancelCapture?.(event);
        stop();
      }}
      onLostPointerCapture={(event) => {
        onLostPointerCapture?.(event);
        stop();
      }}
    >
      <>
        {thumb}
        {children}
      </>
    </ScrollAreaPrimitive.Scrollbar>
  );
};

const ScrollArea = ({
  children,
  className,
  scale = 2,
  disabled = false,
  type = "auto",
  viewportRef,
  viewportProps,
  style,
  ref,
  render,
  onWheelCapture,
  onKeyDownCapture,
  ...props
}: ScrollAreaProps) => {
  if (type !== "auto") {
    throw new Error(
      "Minecraft ScrollArea shows its scrollbar whenever content overflows"
    );
  }

  const viewport = React.useRef<HTMLDivElement>(null);

  const setViewportRef = React.useCallback(
    (element: HTMLDivElement | null): (() => void) | undefined => {
      viewport.current = element;

      if (isMinecraftRefCallback(viewportRef)) {
        const cleanup = viewportRef(element);

        if (isMinecraftRefCleanup(cleanup)) {
          return () => {
            viewport.current = null;
            cleanup();
          };
        }
      } else if (viewportRef) {
        // oxlint-disable-next-line react/immutability -- React commit forwards this mutable object ref outside render; preserve the existing callback and cleanup order.
        viewportRef.current = element;
      }

      return undefined;
    },
    [viewportRef]
  );

  const [geometry, setGeometry] = React.useState(empty);
  const [ready, setReady] = React.useState(false);
  React.useLayoutEffect(() => {
    let frame = 0;
    let signature = "";

    const measure = () => {
      const element = viewport.current!;

      const height = element.clientHeight / scale;
      const content = element.scrollHeight / scale;

      const maximum = Math.max(0, content - height);

      // Mth.clamp applies the upper bound last, even when height - 8 is below 32.
      const thumb = Math.min(
        height - 8,
        Math.max(
          32,
          Math.trunc(
            Math.fround(Math.fround(height * height) / Math.fround(content))
          )
        )
      );

      const offset =
        maximum > 0
          ? Math.floor(
              (Math.floor(element.scrollTop / scale) * (height - thumb)) /
                maximum
            )
          : 0;

      const next = JSON.stringify([height, content, maximum, thumb, offset]);

      if (next !== signature) {
        signature = next;
        setGeometry({ content, height, maximum, offset, thumb });
        setReady(true);
      }

      frame = requestAnimationFrame(measure);
    };

    frame = requestAnimationFrame(measure);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [scale]);
  const content = children;

  const flatten = (value: React.ReactNode): React.ReactNode[] =>
    React.Children.toArray(value).flatMap((node) =>
      React.isValidElement<{
        children?: React.ReactNode;
      }>(node) && node.type === React.Fragment
        ? flatten(node.props.children)
        : [node]
    );

  const nodes = flatten(content);

  const customBars = nodes.filter(
    (node) => React.isValidElement(node) && node.type === ScrollBar
  );

  const contents = nodes.filter(
    (node) => !React.isValidElement(node) || node.type !== ScrollBar
  );

  const chrome = (
    <>
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        ref={setViewportRef}
        tabIndex={disabled ? -1 : 0}
        {...viewportProps}
        className={`mc-scroll-area-viewport ${viewportProps?.className ?? ""}`}
        style={minecraftStyle(viewportProps?.style, (__style) => ({
          ...(disabled ? { overflowY: "hidden" } : {}),
          ...__style,
        }))}
      >
        {contents}
      </ScrollAreaPrimitive.Viewport>
      {customBars.length ? customBars : <ScrollBar />}
    </>
  );

  const scrollContext = React.useMemo(
    () => ({ disabled, geometry, scale, viewport }),
    [disabled, geometry, scale, viewport]
  );

  return (
    <ScrollContext.Provider value={scrollContext}>
      <ScrollAreaPrimitive.Root
        render={render}
        ref={ref}
        data-slot="scroll-area"
        data-mc-scroll-ready={ready}
        data-scrollable={geometry.maximum > 0}
        data-disabled={disabled || undefined}
        className={cn(`mc-scroll-area`, className)}
        style={minecraftStyle(style, (__style): ScrollAreaScaleStyle => ({
          "--mc-scale": scale,
          ...__style,
        }))}
        onWheelCapture={(event) => {
          onWheelCapture?.(event);

          if (disabled) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onKeyDownCapture={(event) => {
          onKeyDownCapture?.(event);

          if (
            disabled &&
            event.target === viewport.current &&
            [
              "ArrowUp",
              "ArrowDown",
              "PageUp",
              "PageDown",
              "Home",
              "End",
              " ",
            ].includes(event.key)
          ) {
            event.preventDefault();
          }
        }}
        {...props}
      >
        {chrome}
      </ScrollAreaPrimitive.Root>
    </ScrollContext.Provider>
  );
};

type ScrollBarProps = Omit<
  MinecraftProps<typeof ScrollAreaPrimitive.Scrollbar>,
  "orientation"
> & {
  orientation?: "vertical";
};

export { ScrollArea, ScrollBar };

export type { ScrollAreaProps, ScrollBarProps };
