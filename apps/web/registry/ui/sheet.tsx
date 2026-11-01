"use client";

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import * as React from "react";

import { Button } from "./button";
import { minecraftCardSprite } from "./minecraft-card-sprite";
import { CardScaleContext } from "./minecraft-card-text";
import { MinecraftDialogBackdrop } from "./minecraft-dialog-backdrop";
import { MinecraftDisclosureText } from "./minecraft-disclosure-text";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import type { MinecraftProps } from "./minecraft-render";
import { MinecraftSurface } from "./minecraft-surface";

import "./minecraft-card.css";
import "./minecraft-sheet.css";

const SheetScale = React.createContext<1 | 2 | 3>(2);

const Sheet = ({
  scale = 2,
  ...props
}: MinecraftProps<typeof SheetPrimitive.Root> & {
  scale?: 1 | 2 | 3;
}) => (
  <SheetScale.Provider value={scale}>
    <SheetPrimitive.Root {...props} />
  </SheetScale.Provider>
);

const SheetTrigger = ({
  render,
  children,
  ...props
}: MinecraftProps<typeof SheetPrimitive.Trigger>) => {
  const scale = React.useContext(SheetScale);

  return (
    <SheetPrimitive.Trigger
      data-slot="sheet-trigger"
      render={render ?? <Button scale={scale} />}
      {...props}
    >
      {children}
    </SheetPrimitive.Trigger>
  );
};

const SheetClose = ({
  render,
  children,
  ...props
}: MinecraftProps<typeof SheetPrimitive.Close>) => {
  const scale = React.useContext(SheetScale);

  return (
    <SheetPrimitive.Close
      data-slot="sheet-close"
      render={render ?? <Button scale={scale} />}
      {...props}
    >
      {children}
    </SheetPrimitive.Close>
  );
};

const SheetPortal = (props: MinecraftProps<typeof SheetPrimitive.Portal>) => (
  <SheetPrimitive.Portal {...props} />
);

const SheetOverlay = ({
  className,
  render,
  children,
  ...props
}: MinecraftProps<typeof SheetPrimitive.Backdrop>) => {
  const content = (
    <>
      <MinecraftDialogBackdrop />
      {children}
    </>
  );

  return (
    <SheetPrimitive.Backdrop
      render={render}
      data-slot="sheet-overlay"
      className={cn(`mc-sheet-overlay`, className)}
      {...props}
    >
      {content}
    </SheetPrimitive.Backdrop>
  );
};

type SheetContentProps = MinecraftProps<typeof SheetPrimitive.Popup> & {
  side?: "top" | "right" | "bottom" | "left";
  scale?: 1 | 2 | 3;
  showCloseButton?: boolean;
};

const SheetContent = ({
  side = "right",
  scale: explicit,
  showCloseButton = true,
  render,
  children,
  className,
  style,
  ...props
}: SheetContentProps) => {
  const inherited = React.useContext(SheetScale);
  const scale = explicit ?? inherited;

  const content = (
    <>
      <MinecraftSurface sprite={minecraftCardSprite} />
      {children}
      {showCloseButton && <SheetClose className="mc-sheet-default-close" />}
    </>
  );

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetScale.Provider value={scale}>
        <CardScaleContext.Provider value={scale}>
          <SheetPrimitive.Popup
            render={render}
            data-slot="sheet-content"
            data-side={side}
            className={cn(`mc-card mc-sheet-content`, className)}
            style={minecraftStyle(
              style,
              (__style) =>
                ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
            )}
            {...props}
          >
            {content}
          </SheetPrimitive.Popup>
        </CardScaleContext.Provider>
      </SheetScale.Provider>
    </SheetPortal>
  );
};

const SheetHeader = ({ className, ...props }: MinecraftProps<"div">) => (
  <div
    data-slot="sheet-header"
    className={cn(`mc-sheet-header`, className)}
    {...props}
  />
);

const SheetFooter = ({ className, ...props }: MinecraftProps<"div">) => (
  <div
    data-slot="sheet-footer"
    className={cn(`mc-sheet-footer`, className)}
    {...props}
  />
);

const SheetTitle = ({
  render,
  children,
  className,
  ...props
}: MinecraftProps<typeof SheetPrimitive.Title>) => {
  const scale = React.useContext(SheetScale);

  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={className}
      render={
        render ?? (
          <MinecraftDisclosureText
            role="heading"
            aria-level={2}
            scale={scale}
          />
        )
      }
      {...props}
    >
      {children}
    </SheetPrimitive.Title>
  );
};

const SheetDescription = ({
  render,
  children,
  className,
  ...props
}: MinecraftProps<typeof SheetPrimitive.Description>) => {
  const scale = React.useContext(SheetScale);

  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={className}
      render={render ?? <MinecraftDisclosureText scale={scale} />}
      {...props}
    >
      {children}
    </SheetPrimitive.Description>
  );
};

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetPortal,
  SheetOverlay,
};

export type { SheetContentProps };
