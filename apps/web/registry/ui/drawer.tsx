"use client";

import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
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
import "./minecraft-drawer.css";

const DrawerScale = React.createContext<1 | 2 | 3>(2);

const DrawerDirection = React.createContext<
  "top" | "right" | "bottom" | "left"
>("bottom");

const Drawer = ({
  scale = 2,
  swipeDirection = "down",
  ...props
}: MinecraftProps<typeof DrawerPrimitive.Root> & {
  scale?: 1 | 2 | 3;
}) => {
  return (
    <DrawerScale.Provider value={scale}>
      <DrawerDirection.Provider
        value={
          swipeDirection === "down"
            ? "bottom"
            : swipeDirection === "up"
              ? "top"
              : swipeDirection
        }
      >
        <DrawerPrimitive.Root swipeDirection={swipeDirection} {...props} />
      </DrawerDirection.Provider>
    </DrawerScale.Provider>
  );
};

const DrawerTrigger = ({
  render,
  children,
  ...props
}: MinecraftProps<typeof DrawerPrimitive.Trigger>) => {
  const scale = React.useContext(DrawerScale);

  return (
    <DrawerPrimitive.Trigger
      data-slot="drawer-trigger"
      render={render ?? <Button scale={scale} />}
      {...props}
    >
      {children}
    </DrawerPrimitive.Trigger>
  );
};

const DrawerClose = ({
  render,
  children = "Done",
  ...props
}: MinecraftProps<typeof DrawerPrimitive.Close>) => {
  const scale = React.useContext(DrawerScale);

  return (
    <DrawerPrimitive.Close
      data-slot="drawer-close"
      render={render ?? <Button scale={scale} />}
      {...props}
    >
      {children}
    </DrawerPrimitive.Close>
  );
};

const DrawerPortal = (props: MinecraftProps<typeof DrawerPrimitive.Portal>) => {
  return <DrawerPrimitive.Portal {...props} />;
};

const DrawerOverlay = ({
  className,
  render,
  children,
  ...props
}: MinecraftProps<typeof DrawerPrimitive.Backdrop>) => {
  const content = (
    <>
      <MinecraftDialogBackdrop />
      {children}
    </>
  );

  return (
    <DrawerPrimitive.Backdrop
      render={render}
      data-slot="drawer-overlay"
      className={cn(`mc-drawer-overlay`, className)}
      {...props}
    >
      {content}
    </DrawerPrimitive.Backdrop>
  );
};

type DrawerContentProps = MinecraftProps<typeof DrawerPrimitive.Popup> & {
  scale?: 1 | 2 | 3;
  showCloseButton?: boolean;
};

const DrawerContent = ({
  scale: explicit,
  showCloseButton = true,
  render,
  children,
  className,
  style,
  ...props
}: DrawerContentProps) => {
  const inherited = React.useContext(DrawerScale);
  const scale = explicit ?? inherited;
  const side = React.useContext(DrawerDirection);

  const content = (
    <>
      <MinecraftSurface sprite={minecraftCardSprite} />
      {children}
      {showCloseButton && <DrawerClose className="mc-drawer-default-close" />}
    </>
  );

  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerScale.Provider value={scale}>
        <CardScaleContext.Provider value={scale}>
          <DrawerPrimitive.Viewport
            style={{
              inset: 0,
              pointerEvents: "none",
              position: "fixed",
              zIndex: 50,
            }}
          >
            <DrawerPrimitive.Popup
              render={render}
              data-slot="drawer-content"
              data-side={side}
              className={cn(`mc-card mc-drawer-content`, className)}
              style={minecraftStyle(
                style,
                (__style) =>
                  ({
                    "--mc-scale": scale,
                    pointerEvents: "auto",
                    ...__style,
                  }) as React.CSSProperties
              )}
              {...props}
            >
              <DrawerPrimitive.Content
                data-slot="drawer-body"
                style={{ display: "contents" }}
              >
                {content}
              </DrawerPrimitive.Content>
            </DrawerPrimitive.Popup>
          </DrawerPrimitive.Viewport>
        </CardScaleContext.Provider>
      </DrawerScale.Provider>
    </DrawerPortal>
  );
};

const DrawerHeader = ({ className, ...props }: MinecraftProps<"div">) => {
  return (
    <div
      data-slot="drawer-header"
      className={cn(`mc-drawer-header`, className)}
      {...props}
    />
  );
};

const DrawerFooter = ({ className, ...props }: MinecraftProps<"div">) => {
  return (
    <div
      data-slot="drawer-footer"
      className={cn(`mc-drawer-footer`, className)}
      {...props}
    />
  );
};

const DrawerTitle = ({
  render,
  children,
  className,
  ...props
}: MinecraftProps<typeof DrawerPrimitive.Title>) => {
  const scale = React.useContext(DrawerScale);

  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
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
    </DrawerPrimitive.Title>
  );
};

const DrawerDescription = ({
  render,
  children,
  className,
  ...props
}: MinecraftProps<typeof DrawerPrimitive.Description>) => {
  const scale = React.useContext(DrawerScale);

  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={className}
      render={render ?? <MinecraftDisclosureText scale={scale} />}
      {...props}
    >
      {children}
    </DrawerPrimitive.Description>
  );
};

export {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerPortal,
  DrawerOverlay,
};

export type { DrawerContentProps };
