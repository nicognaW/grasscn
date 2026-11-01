"use client";
import { Popover as Primitive } from "@base-ui/react/popover";
import * as React from "react";

import { Button } from "./button";
import { minecraftCardSprite } from "./minecraft-card-sprite";
import { CardScaleContext } from "./minecraft-card-text";
import {
  PopoverTextContext,
  MinecraftPopoverText,
} from "./minecraft-popover-text";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { MinecraftRender, type MinecraftProps } from "./minecraft-render";
import { MinecraftSurface } from "./minecraft-surface";
import { minecraftTextareaAssets } from "./minecraft-textarea-assets";

import "./minecraft-card.css";
import "./minecraft-popover.css";
const ScaleContext = React.createContext<1 | 2 | 3>(2);
function Popover({
  scale = 2,
  ...props
}: MinecraftProps<typeof Primitive.Root> & {
  scale?: 1 | 2 | 3;
}) {
  return (
    <ScaleContext.Provider value={scale}>
      <Primitive.Root {...props} />
    </ScaleContext.Provider>
  );
}
function PopoverTrigger({
  render,
  children,
  ...props
}: MinecraftProps<typeof Primitive.Trigger>) {
  const scale = React.useContext(ScaleContext);
  return (
    <Primitive.Trigger
      data-slot="popover-trigger"
      render={render ?? <Button scale={scale} />}
      {...props}
    >
      {children}
    </Primitive.Trigger>
  );
}

type PopoverContentProps = (MinecraftProps<typeof Primitive.Popup> &
  (Pick<
    MinecraftProps<typeof Primitive.Positioner>,
    | "side"
    | "align"
    | "sideOffset"
    | "alignOffset"
    | "collisionPadding"
    | "collisionBoundary"
    | "collisionAvoidance"
    | "anchor"
  > & {
    keepMounted?: boolean;
  })) & {
  scale?: 1 | 2 | 3;
};
function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  scale: explicitScale,
  children,
  render,
  ref,
  style,
  side = "bottom",
  alignOffset,
  collisionPadding,
  collisionBoundary,
  collisionAvoidance,
  anchor,
  keepMounted,
  ...props
}: PopoverContentProps) {
  const inherited = React.useContext(ScaleContext),
    scale = explicitScale ?? inherited,
    id = React.useId();
  const [node, setNode] = React.useState<HTMLDivElement | null>(null),
    [width, setWidth] = React.useState(214);
  const forwarded = React.useCallback(
    (element: HTMLDivElement | null) => {
      setNode(element);
      if (typeof ref === "function") {
        const cleanup = ref(element);
        if (typeof cleanup === "function")
          return () => {
            setNode(null);
            cleanup();
          };
      } else if (ref) ref.current = element;
    },
    [ref]
  );
  React.useLayoutEffect(() => {
    if (!node) return;
    let frame = 0;
    const measure = () => {
      const computed = getComputedStyle(node);
      setWidth(
        Math.max(
          1,
          Math.floor(
            (node.clientWidth -
              parseFloat(computed.paddingLeft) -
              parseFloat(computed.paddingRight)) /
              scale
          )
        )
      );
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        node.dataset.mcPopoverReady = "true";
      });
    };
    const resize = new ResizeObserver(measure),
      mutation = new MutationObserver(measure);
    resize.observe(node);
    mutation.observe(node, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["id"],
    });
    measure();
    return () => {
      resize.disconnect();
      mutation.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [
    node,
    scale,
    id,
    props["aria-labelledby"],
    props["aria-describedby"],
    props["aria-label"],
  ]);
  const child = null;
  const text = children;
  const contents = (
    <>
      <span className="mc-popover-background" aria-hidden="true">
        <MinecraftSurface sprite={minecraftCardSprite} />
      </span>
      {typeof text === "string" || typeof text === "number" ? (
        <MinecraftPopoverText>{text}</MinecraftPopoverText>
      ) : (
        text
      )}
    </>
  );
  return (
    <Primitive.Portal keepMounted={keepMounted}>
      <ScaleContext.Provider value={scale}>
        <CardScaleContext.Provider value={scale}>
          <PopoverTextContext.Provider value={{ scale, width }}>
            <Primitive.Positioner
              anchor={anchor}
              data-mc-positioner=""
              style={{ zIndex: 50 }}
              side={side}
              align={align}
              sideOffset={sideOffset}
              alignOffset={alignOffset}
              collisionPadding={collisionPadding}
              collisionBoundary={collisionBoundary}
              collisionAvoidance={collisionAvoidance}
            >
              <Primitive.Popup
                render={render}
                data-slot="popover-content"
                ref={forwarded}
                className={cn(`mc-card mc-popover ${""}`, className)}
                style={minecraftStyle(
                  style,
                  (__style) =>
                    ({
                      "--mc-scale": scale,
                      "--mc-popover-scroll-thumb": `url("${minecraftTextareaAssets.scroller}")`,
                      "--mc-popover-scroll-track": `url("${minecraftTextareaAssets.scroller_background}")`,
                      ...__style,
                    }) as React.CSSProperties
                )}
                {...props}
              >
                {contents}
              </Primitive.Popup>
            </Primitive.Positioner>
          </PopoverTextContext.Provider>
        </CardScaleContext.Provider>
      </ScaleContext.Provider>
    </Primitive.Portal>
  );
}
function PopoverHeader({ className, ...props }: MinecraftProps<"div">) {
  return (
    <div
      data-slot="popover-header"
      className={cn(`mc-card-header ${""}`, className)}
      {...props}
    />
  );
}
function PopoverTitle({
  className,
  children,
  ...props
}: MinecraftProps<typeof Primitive.Title>) {
  return (
    <Primitive.Title
      data-slot="popover-title"
      className={cn(`mc-card-title mc-popover-title ${""}`, className)}
      {...props}
    >
      <MinecraftPopoverText bold>{children}</MinecraftPopoverText>
    </Primitive.Title>
  );
}
function PopoverDescription({
  className,
  children,
  ...props
}: MinecraftProps<typeof Primitive.Description>) {
  return (
    <Primitive.Description
      data-slot="popover-description"
      className={cn(
        `mc-card-description mc-popover-description ${""}`,
        className
      )}
      {...props}
    >
      <MinecraftPopoverText>{children}</MinecraftPopoverText>
    </Primitive.Description>
  );
}
function PopoverClose({
  render,
  children,
  ...props
}: MinecraftProps<typeof Primitive.Close>) {
  const scale = React.useContext(ScaleContext);
  return (
    <Primitive.Close
      data-slot="popover-close"
      render={render ?? <Button scale={scale} />}
      {...props}
    >
      {children}
    </Primitive.Close>
  );
}

export {
  PopoverClose,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
};
export type { PopoverContentProps };
