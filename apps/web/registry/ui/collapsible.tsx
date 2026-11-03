"use client";

import { Collapsible as Primitive } from "@base-ui/react/collapsible";
import * as React from "react";

import { Button } from "./button";
import { MinecraftCollapsibleText } from "./minecraft-collapsible-text";
import {
  isMinecraftRefCallback,
  isMinecraftRefCleanup,
  isMinecraftTextContent,
  minecraftClasses as cn,
  minecraftStyle,
} from "./minecraft-render";
import type { MinecraftProps } from "./minecraft-render";

import "./minecraft-collapsible.css";

interface CollapsibleScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

const ScaleContext = React.createContext<1 | 2 | 3>(2);

type CollapsibleProps = MinecraftProps<typeof Primitive.Root> & {
  scale?: 1 | 2 | 3;
};

const Collapsible = ({
  scale = 2,
  className,
  style,
  ...props
}: CollapsibleProps) => (
  <ScaleContext.Provider value={scale}>
    <Primitive.Root
      data-slot="collapsible"
      className={cn("mc-collapsible", className)}
      style={minecraftStyle(style, (__style): CollapsibleScaleStyle => ({
        "--mc-scale": scale,
        ...__style,
      }))}
      {...props}
    />
  </ScaleContext.Provider>
);

const CollapsibleTrigger = ({
  children,
  render,
  className,
  onClick,
  ...props
}: MinecraftProps<typeof Primitive.Trigger>) => {
  const scale = React.useContext(ScaleContext);

  return (
    <Primitive.Trigger
      render={render ?? <Button scale={scale} />}
      data-slot="collapsible-trigger"
      className={cn("mc-collapsible-trigger", className)}
      onClick={(event) => {
        onClick?.(event);

        if (event.currentTarget.getAttribute("aria-disabled") === "true") {
          event.preventDefault();
        }
      }}
      {...props}
    >
      {children}
    </Primitive.Trigger>
  );
};

type CollapsibleContentProps = MinecraftProps<typeof Primitive.Panel> & {
  scale?: 1 | 2 | 3;
  maxWidth?: number;
  align?: "left" | "center";
  wrap?: boolean;
};

const CollapsibleContent = ({
  children,
  className,
  ref,
  style,
  scale: explicitScale,
  maxWidth,
  align = "left",
  wrap = true,
  ...props
}: CollapsibleContentProps) => {
  const inherited = React.useContext(ScaleContext);
  const scale = explicitScale ?? inherited;
  const [element, setElement] = React.useState<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState<number>();

  const forwarded = React.useCallback(
    (node: HTMLDivElement | null) => {
      setElement(node);

      if (isMinecraftRefCallback(ref)) {
        const cleanup = ref(node);

        if (isMinecraftRefCleanup(cleanup)) {
          return () => {
            setElement(null);
            cleanup();
          };
        }
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref]
  );

  React.useLayoutEffect(() => {
    if (!element) {
      return;
    }

    const measure = () => {
      const computed = getComputedStyle(element);
      const root = element.closest<HTMLElement>('[data-slot="collapsible"]');

      const physical =
        (element.clientWidth ||
          (computed.width.endsWith("px")
            // oxlint-disable-next-line unicorn/prefer-number-coercion -- CSS lengths intentionally retain unit suffixes; parseFloat extracts the numeric prefix while Number would reject px values.
            ? Number.parseFloat(computed.width)
            : 0) ||
          root?.clientWidth) ??
        0;

      const logical = Math.floor(
        (physical -
          // oxlint-disable-next-line unicorn/prefer-number-coercion -- CSS lengths intentionally retain unit suffixes; parseFloat extracts the numeric prefix while Number would reject px values.
          Number.parseFloat(computed.paddingLeft) -
          // oxlint-disable-next-line unicorn/prefer-number-coercion -- CSS lengths intentionally retain unit suffixes; parseFloat extracts the numeric prefix while Number would reject px values.
          Number.parseFloat(computed.paddingRight)) /
          scale
      );

      if (logical > 0) {
        setWidth(logical);
        element.dataset.mcDisclosureReady = "true";
      }
    };

    const resize = new ResizeObserver(measure);
    resize.observe(element);
    measure();

    return () => {
      resize.disconnect();
    };
  }, [element, scale]);
  const scalar = isMinecraftTextContent(children);

  return (
    <Primitive.Panel
      ref={forwarded}
      data-slot="collapsible-content"
      className={cn("mc-collapsible-content", className)}
      style={minecraftStyle(style, (__style): CollapsibleScaleStyle => ({
        "--mc-scale": scale,
        ...__style,
      }))}
      {...props}
    >
      {scalar ? (
        <MinecraftCollapsibleText
          scale={scale}
          maxWidth={maxWidth ?? (wrap ? width : undefined)}
          align={align}
          style={{ width: "100%" }}
        >
          {children}
        </MinecraftCollapsibleText>
      ) : (
        children
      )}
    </Primitive.Panel>
  );
};

export { Collapsible, CollapsibleTrigger, CollapsibleContent };

export type { CollapsibleProps, CollapsibleContentProps };
