"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import * as React from "react";

import {
  isMinecraftTextContent,
  minecraftClasses as cn,
  minecraftStyle,
} from "./minecraft-render";
import type { MinecraftProps } from "./minecraft-render";
import { MinecraftSurface } from "./minecraft-surface";
import { MinecraftText } from "./minecraft-text";
import {
  minecraftTextWidth,
  wrapMinecraftTooltip,
} from "./minecraft-tooltip-layout";
import { MinecraftTooltipSurface } from "./minecraft-tooltip-paint";
import { minecraftTooltipSprites as sprites } from "./minecraft-tooltip-sprites";

import "./minecraft-tooltip.css";

interface TooltipPaintStyle extends React.CSSProperties {
  "--mc-scale": number;
  "--mc-tooltip-height": number | undefined;
  "--mc-tooltip-max": number;
  "--mc-tooltip-width": number | undefined;
}

const TooltipProvider = ({
  delay = 0,
  ...props
}: MinecraftProps<typeof TooltipPrimitive.Provider>) => (
  <TooltipPrimitive.Provider
    data-slot="tooltip-provider"
    delay={delay}
    {...props}
  />
);

const Tooltip = (props: MinecraftProps<typeof TooltipPrimitive.Root>) => (
  <TooltipPrimitive.Root data-slot="tooltip" {...props} />
);

const TooltipTrigger = (
  props: MinecraftProps<typeof TooltipPrimitive.Trigger>
) => <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;

const TooltipContent = ({
  className,
  sideOffset = 0,
  scale = 2,
  maxWidth = 170,
  children,
  render,
  style,
  ref,
  side = "top",
  align = "center",
  alignOffset,
  collisionPadding,
  collisionBoundary,
  collisionAvoidance,
  keepMounted,
  ...props
}: (MinecraftProps<typeof TooltipPrimitive.Popup> &
  (Pick<
    MinecraftProps<typeof TooltipPrimitive.Positioner>,
    | "side"
    | "align"
    | "sideOffset"
    | "alignOffset"
    | "collisionPadding"
    | "collisionBoundary"
    | "collisionAvoidance"
  > & {
    keepMounted?: boolean;
  })) & {
  scale?: 1 | 2 | 3;
  maxWidth?: number;
}) => {
  const [node, setNode] = React.useState<HTMLDivElement | null>(null);
  const [available, setAvailable] = React.useState(maxWidth);
  React.useImperativeHandle<typeof node, typeof node>(ref, () => node, [node]);
  React.useLayoutEffect((): (() => void) | undefined => {
    if (!node) {
      return undefined;
    }

    const measure = () => {
      const physical =
        // oxlint-disable-next-line unicorn/prefer-number-coercion -- CSS lengths intentionally retain unit suffixes; parseFloat extracts the numeric prefix while Number would reject px values.
        Number.parseFloat(
          getComputedStyle(node).getPropertyValue("--available-width")
        ) || window.innerWidth;

      setAvailable(
        Math.max(1, Math.min(maxWidth, Math.floor(physical / scale - 24)))
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [node, maxWidth, scale]);

  const skin = (content: React.ReactNode) => {
    const plain =
      isMinecraftTextContent(content) &&
      /^[\u0020-\u007E\n]*$/u.test(String(content))
        ? String(content)
        : undefined;

    const lines =
      plain === undefined
        ? undefined
        : wrapMinecraftTooltip(plain, Math.min(maxWidth, available));

    const width = lines
      ? Math.max(0, ...lines.map(minecraftTextWidth)) + 24
      : undefined;

    const height = lines
      ? (lines.length === 1 ? 8 : lines.length * 10) + 24
      : undefined;

    return (
      <>
        {width && height ? (
          <MinecraftTooltipSurface
            width={width}
            height={height}
            scale={scale}
          />
        ) : (
          <>
            <MinecraftSurface sprite={sprites.background} />
            <MinecraftSurface sprite={sprites.frame} />
          </>
        )}
        <div className="mc-tooltip-lines">
          {lines
            ? lines.map((line, index) => (
                <MinecraftText className="mc-tooltip-line" key={index}>
                  {line}
                </MinecraftText>
              ))
            : content}
        </div>
      </>
    );
  };

  let selectedPlain: string | undefined;

  if (isMinecraftTextContent(children)) {
    selectedPlain = String(children);
  } else if (
    render &&
    React.isValidElement<{
      children?: React.ReactNode;
    }>(children) &&
    typeof children.props.children === "string"
  ) {
    selectedPlain = children.props.children;
  } else {
    selectedPlain = undefined;
  }

  const plain = selectedPlain;

  const lines =
    plain == null || !/^[\u0020-\u007E\n]*$/u.test(plain)
      ? undefined
      : wrapMinecraftTooltip(plain, Math.min(maxWidth, available));

  const width = lines
    ? Math.max(0, ...lines.map(minecraftTextWidth)) + 24
    : undefined;

  const height = lines
    ? (lines.length === 1 ? 8 : lines.length * 10) + 24
    : undefined;

  const content = skin(children);

  return (
    <TooltipPrimitive.Portal keepMounted={keepMounted}>
      <TooltipPrimitive.Positioner
        data-mc-positioner=""
        className="z-50"
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        collisionBoundary={collisionBoundary}
        collisionAvoidance={collisionAvoidance}
      >
        <TooltipPrimitive.Popup
          render={render}
          ref={setNode}
          data-slot="tooltip-content"
          className={cn("mc-tooltip", className)}
          style={minecraftStyle(style, (__style): TooltipPaintStyle => ({
            "--mc-scale": scale,
            "--mc-tooltip-height": height,
            "--mc-tooltip-max": maxWidth,
            "--mc-tooltip-width": width,
            ...__style,
          }))}
          {...props}
        >
          {content}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
};

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
