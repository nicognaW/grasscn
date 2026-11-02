"use client";

import { AlertDialog as Primitive } from "@base-ui/react/alert-dialog";
import * as React from "react";

import { Button } from "./button";
import { confirmationMenuBackground } from "./minecraft-confirmation-assets";
import { MinecraftConfirmationBlur } from "./minecraft-confirmation-blur";
import {
  ConfirmationTextContext,
  MinecraftConfirmationText,
  confirmationButtonText,
} from "./minecraft-confirmation-text";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import type { MinecraftProps } from "./minecraft-render";

import "./minecraft-card.css";
import "./minecraft-dialog.css";
import "./minecraft-alert-dialog.css";

interface AlertDialogScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

const ScaleContext = React.createContext<1 | 2 | 3>(2);
const IdentityContext = React.createContext("");

const AlertDialog = ({
  scale = 2,
  ...props
}: MinecraftProps<typeof Primitive.Root> & {
  scale?: 1 | 2 | 3;
}) => {
  const identity = React.useId();

  return (
    <IdentityContext.Provider value={identity}>
      <ScaleContext.Provider value={scale}>
        <Primitive.Root {...props} />
      </ScaleContext.Provider>
    </IdentityContext.Provider>
  );
};

const AlertDialogTrigger = ({
  render,
  children,
  ...props
}: MinecraftProps<typeof Primitive.Trigger>) => {
  const scale = React.useContext(ScaleContext);

  return (
    <Primitive.Trigger
      data-slot="alert-dialog-trigger"
      render={render ?? <Button scale={scale} />}
      {...props}
    >
      {children}
    </Primitive.Trigger>
  );
};

const AlertDialogPortal = (props: MinecraftProps<typeof Primitive.Portal>) => (
  <Primitive.Portal {...props} />
);

const AlertDialogOverlay = ({
  className,
  children,
  render,
  blur = 5,
  style,
  ...props
}: MinecraftProps<typeof Primitive.Backdrop> & {
  blur?: number;
}) => {
  const identity = React.useContext(IdentityContext);

  const content = (
    <>
      <MinecraftConfirmationBlur radius={blur} identity={identity} />
      {children}
    </>
  );

  return (
    <Primitive.Backdrop
      render={render}
      data-slot="alert-dialog-overlay"
      data-mc-confirmation-id={identity}
      className={cn(`mc-alert-dialog-overlay`, className)}
      style={minecraftStyle(style, (__style) => ({
        backgroundImage: `url("${confirmationMenuBackground}")`,
        ...__style,
      }))}
      {...props}
    >
      {content}
    </Primitive.Backdrop>
  );
};

type AlertDialogContentProps = MinecraftProps<typeof Primitive.Popup> & {
  scale?: 1 | 2 | 3;
  blur?: number;
  keepMounted?: boolean;
};

const AlertDialogContent = ({
  scale: explicitScale,
  blur = 5,
  children,
  className,
  ref,
  style,
  render,
  keepMounted,
  ...props
}: AlertDialogContentProps) => {
  const inherited = React.useContext(ScaleContext);
  const scale = explicitScale ?? inherited;

  const identity = React.useContext(IdentityContext);

  const [node, setNode] = React.useState<HTMLDivElement | null>(null);

  const [viewport, setViewport] = React.useState(() =>
    typeof window === "undefined" ? 1024 : innerWidth
  );

  const [compact, setCompact] = React.useState(false);
  const [measuredWidth, setMeasuredWidth] = React.useState(462);

  const forwarded = React.useCallback(
    (element: HTMLDivElement | null) => {
      setNode(element);

      if (typeof ref === "function") {
        const cleanup = ref(element);

        if (typeof cleanup === "function") {
          return () => {
            setNode(null);
            cleanup();
          };
        }
      } else if (ref) {
        ref.current = element;
      }
    },
    [ref]
  );

  React.useLayoutEffect(() => {
    if (!node) {
      return;
    }

    let frame = 0;

    const measure = () => {
      setViewport(innerWidth);

      if (!node.offsetWidth) {
        return;
      }

      const gutter = 8 * scale;
      const availableHeight = Math.max(scale, innerHeight - 2 * gutter);

      node.style.setProperty(
        "--mc-confirmation-max-width",
        `${Math.max(scale, innerWidth - 2 * gutter)}px`
      );
      node.style.setProperty(
        "--mc-confirmation-max-height",
        `${availableHeight}px`
      );

      const naturalTitle = Number(
        node.querySelector<HTMLElement>("[data-mc-confirmation-natural-width]")
          ?.dataset.mcConfirmationNaturalWidth ?? 0
      );

      const header = node.querySelector<HTMLElement>(
        '[data-slot="alert-dialog-header"]'
      );

      let naturalHeight =
        node.scrollHeight +
        (header ? Math.max(0, header.scrollHeight - header.clientHeight) : 0);

      for (const text of node.querySelectorAll<HTMLElement>(
        "[data-mc-confirmation-native-height]"
      )) {
        naturalHeight +=
          Number(text.dataset.mcConfirmationNativeHeight) -
          text.getBoundingClientRect().height;
      }

      const nextCompact =
        innerWidth < 320 * scale ||
        naturalTitle > innerWidth ||
        naturalHeight > availableHeight;

      node.dataset.mcConfirmationCompact = String(nextCompact);
      setCompact(nextCompact);

      const availableWidth = Math.max(
        scale,
        Math.floor(node.clientWidth / scale) * scale
      );

      node.dataset.mcConfirmationStacked = String(
        nextCompact && availableWidth < 304 * scale
      );
      node.style.setProperty(
        "--mc-confirmation-action-width",
        `${Math.min(150 * scale, availableWidth)}px`
      );
      setMeasuredWidth(
        Math.max(
          1,
          Math.floor(
            (nextCompact && header ? header.clientWidth : node.clientWidth) /
              scale
          )
        )
      );

      const boxWidth = node.offsetWidth / scale;
      const width = (nextCompact ? node.clientWidth : node.offsetWidth) / scale;
      const height = node.offsetHeight / scale;

      node.style.left = `${Math.floor((Math.ceil(innerWidth / scale) - boxWidth) / 2) * scale}px`;
      node.style.top = `${Math.floor((Math.ceil(innerHeight / scale) - height) / 2) * scale}px`;
      const bounds = node.getBoundingClientRect();

      for (const item of node.querySelectorAll<HTMLElement>(
        '[data-mc-confirmation-item="true"]'
      )) {
        if (item.closest(".mc-alert-dialog-content") !== node) {
          continue;
        }

        const rect = item.getBoundingClientRect();

        const inHeader =
          nextCompact &&
          header &&
          item.closest('[data-slot="alert-dialog-header"]') === header;

        const areaWidth = inHeader ? header.clientWidth / scale : width;

        const areaLeft = inHeader
          ? header.getBoundingClientRect().left
          : bounds.left;

        const previous = Number(item.dataset.mcConfirmationShift ?? 0);

        const next =
          previous +
          areaLeft +
          Math.floor((areaWidth - rect.width / scale) / 2) * scale -
          rect.left;

        item.dataset.mcConfirmationShift = String(next);
        item.style.setProperty("--mc-confirmation-x", `${next}px`);
      }

      node.dataset.mcConfirmationReady = "true";
    };

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    const resize = new ResizeObserver(update);
    const mutation = new MutationObserver(update);

    resize.observe(node);
    mutation.observe(node, {
      characterData: true,
      childList: true,
      subtree: true,
    });
    window.addEventListener("resize", update);
    measure();

    return () => {
      resize.disconnect();
      mutation.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
    };
  }, [node, scale]);

  return (
    <AlertDialogPortal keepMounted={keepMounted}>
      <AlertDialogOverlay blur={blur} />
      <ScaleContext.Provider value={scale}>
        <ConfirmationTextContext.Provider
          value={{
            compact,
            contentWidth: compact
              ? measuredWidth
              : Math.max(1, Math.ceil(viewport / scale) - 50),
            nativeContentWidth: Math.max(1, Math.ceil(viewport / scale) - 50),
            scale,
          }}
        >
          <Primitive.Popup
            render={render}
            data-slot="alert-dialog-content"
            data-mc-confirmation-id={identity}
            ref={forwarded}
            className={cn(`mc-alert-dialog-content`, className)}
            style={minecraftStyle(
              style,
              (__style): AlertDialogScaleStyle =>
                ({ "--mc-scale": scale, ...__style })
            )}
            {...props}
          >
            {children}
          </Primitive.Popup>
        </ConfirmationTextContext.Provider>
      </ScaleContext.Provider>
    </AlertDialogPortal>
  );
};

const AlertDialogHeader = ({
  className,
  tabIndex,
  ...props
}: MinecraftProps<"div">) => {
  const { compact } = React.useContext(ConfirmationTextContext);

  return (
    <div
      data-slot="alert-dialog-header"
      tabIndex={tabIndex ?? ((compact ?? false) ? 0 : undefined)}
      className={cn(`mc-alert-dialog-header`, className)}
      {...props}
    />
  );
};

const AlertDialogMedia = ({ className, ...props }: MinecraftProps<"div">) => (
  <div
    data-slot="alert-dialog-media"
    data-mc-confirmation-item="true"
    className={cn(`mc-alert-dialog-media`, className)}
    {...props}
  />
);

const AlertDialogFooter = ({ className, ...props }: MinecraftProps<"div">) => (
  <div
    data-slot="alert-dialog-footer"
    data-mc-confirmation-item="true"
    className={cn(`mc-alert-dialog-footer`, className)}
    {...props}
  />
);

const AlertDialogTitle = ({
  children,
  className,
  render,
  ...props
}: MinecraftProps<typeof Primitive.Title>) => {
  const content = (
    <MinecraftConfirmationText title>{children}</MinecraftConfirmationText>
  );

  return (
    <Primitive.Title
      render={render}
      data-slot="alert-dialog-title"
      data-mc-confirmation-item="true"
      className={cn(`mc-alert-dialog-title`, className)}
      {...props}
    >
      {content}
    </Primitive.Title>
  );
};

const AlertDialogDescription = ({
  children,
  className,
  render,
  ...props
}: MinecraftProps<typeof Primitive.Description>) => {
  const content = (
    <MinecraftConfirmationText>{children}</MinecraftConfirmationText>
  );

  return (
    <Primitive.Description
      render={render}
      data-slot="alert-dialog-description"
      data-mc-confirmation-item="true"
      className={cn(`mc-alert-dialog-description`, className)}
      {...props}
    >
      {content}
    </Primitive.Description>
  );
};

const AlertDialogAction = ({
  children = "Yes",
  ...props
}: MinecraftProps<typeof Button>) => {
  const scale = React.useContext(ScaleContext);

  return (
    <Button data-slot="alert-dialog-action" scale={scale} {...props}>
      {confirmationButtonText(children)}
    </Button>
  );
};

const AlertDialogCancel = ({
  render,
  children = "No",
  ...props
}: MinecraftProps<typeof Primitive.Close>) => {
  const scale = React.useContext(ScaleContext);

  return (
    <Primitive.Close
      data-slot="alert-dialog-cancel"
      render={render ?? <Button scale={scale} />}
      {...props}
    >
      {confirmationButtonText(children)}
    </Primitive.Close>
  );
};

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};

export type { AlertDialogContentProps };
