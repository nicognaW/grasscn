"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import * as React from "react";

import { Button } from "./button";
import { minecraftCardSprite } from "./minecraft-card-sprite";
import { MinecraftDialogBackdrop } from "./minecraft-dialog-backdrop";
import {
  DialogLayoutContext,
  MinecraftDialogText,
} from "./minecraft-dialog-text";
import {
  minecraftClasses as cn,
  minecraftStyle,
  MinecraftRender,
} from "./minecraft-render";
import type { MinecraftProps } from "./minecraft-render";
import { MinecraftSurface } from "./minecraft-surface";
import { minecraftTextareaAssets } from "./minecraft-textarea-assets";

import "./minecraft-card.css";
import "./minecraft-dialog.css";

const ScaleContext = React.createContext<1 | 2 | 3>(2);

function useElement<T extends HTMLElement>(ref: React.Ref<T> | undefined) {
  const [element, setElement] = React.useState<T | null>(null);

  const callback = React.useCallback(
    (node: T | null) => {
      setElement(node);

      if (typeof ref === "function") {
        const cleanup = ref(node);

        if (typeof cleanup === "function") {
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

  return [element, callback] as const;
}

const Dialog = ({
  scale = 2,
  ...props
}: MinecraftProps<typeof DialogPrimitive.Root> & {
  scale?: 1 | 2 | 3;
}) => (
  <ScaleContext.Provider value={scale}>
    <DialogPrimitive.Root {...props} />
  </ScaleContext.Provider>
);

const DialogTrigger = ({
  render,
  children,
  ...props
}: MinecraftProps<typeof DialogPrimitive.Trigger>) => {
  const scale = React.useContext(ScaleContext);

  return (
    <DialogPrimitive.Trigger
      data-slot="dialog-trigger"
      render={render ?? <Button scale={scale} />}
      {...props}
    >
      {children}
    </DialogPrimitive.Trigger>
  );
};

const DialogClose = ({
  render,
  children,
  ...props
}: MinecraftProps<typeof DialogPrimitive.Close>) => {
  const scale = React.useContext(ScaleContext);

  return (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      render={render ?? <Button scale={scale} />}
      {...props}
    >
      {children}
    </DialogPrimitive.Close>
  );
};

const DialogPortal = (props: MinecraftProps<typeof DialogPrimitive.Portal>) => (
  <DialogPrimitive.Portal {...props} />
);

const DialogOverlay = ({
  className,
  children,
  render,
  ...props
}: MinecraftProps<typeof DialogPrimitive.Backdrop>) => {
  const child = null;

  const content = (
    <>
      <MinecraftDialogBackdrop />
      {children}
    </>
  );

  return (
    <DialogPrimitive.Backdrop
      render={render}
      data-slot="dialog-overlay"
      className={cn(`mc-dialog-overlay`, className)}
      {...props}
    >
      {content}
    </DialogPrimitive.Backdrop>
  );
};

// oxlint-disable-next-line unicorn/prefer-number-coercion -- Computed lengths end in "px", which Number() reads as NaN.
const pixels = (length: string) => Number.parseFloat(length);

// The background is position: fixed so that it stays with the visible popup
// while the popup scrolls. Its containing block is normally the viewport, but a
// transform, filter or contain on an ancestor (or on the popup) changes it, so
// the offset is corrected from where the background actually lands.
const placeBackground = (element: HTMLElement) => {
  const bounds = element.getBoundingClientRect();

  const background = element.querySelector<HTMLElement>(
    ":scope > .mc-dialog-background"
  );

  if (!background) {
    return bounds;
  }

  const placed = background.getBoundingClientRect();

  const left =
    Number(background.dataset.mcLeft ?? 0) + bounds.left - placed.left;

  const top = Number(background.dataset.mcTop ?? 0) + bounds.top - placed.top;

  background.dataset.mcLeft = String(left);
  background.dataset.mcTop = String(top);
  background.style.setProperty("left", `${left}px`);
  background.style.setProperty("top", `${top}px`);
  background.style.setProperty("width", `${element.offsetWidth}px`);
  background.style.setProperty("height", `${element.offsetHeight}px`);

  return bounds;
};

type DialogContentProps = MinecraftProps<typeof DialogPrimitive.Popup> & {
  scale?: 1 | 2 | 3;
  width?: number;
  showCloseButton?: false;
};

const DialogContent = ({
  children,
  className,
  scale: explicitScale,
  width = 250,
  showCloseButton = false,
  style,
  ref,
  render,
  ...props
}: DialogContentProps) => {
  if (showCloseButton) {
    throw new Error(
      "Vanilla PopupScreen closes through its footer actions and Escape"
    );
  }

  const inherited = React.useContext(ScaleContext);
  const scale = explicitScale ?? inherited;
  const [element, forwarded] = useElement(ref);

  React.useLayoutEffect(() => {
    if (!element) {
      return;
    }

    let frame = 0;

    const measure = () => {
      const logicalWidth = element.offsetWidth / scale;
      const logicalHeight = element.offsetHeight / scale;

      element.style.setProperty(
        "--mc-dialog-left",
        `${Math.floor((Math.ceil(innerWidth / scale) - logicalWidth) / 2) * scale}px`
      );
      element.style.setProperty(
        "--mc-dialog-top",
        `${Math.floor((Math.ceil(innerHeight / scale) - logicalHeight) / 2) * scale}px`
      );

      const bounds = placeBackground(element);
      const computed = getComputedStyle(element);

      // Border plus padding, so custom padding still centres dialog items.
      const insetLeft =
        pixels(computed.borderLeftWidth) + pixels(computed.paddingLeft);

      const insetRight =
        pixels(computed.borderRightWidth) + pixels(computed.paddingRight);

      const inside = logicalWidth - (insetLeft + insetRight) / scale;

      for (const node of element.querySelectorAll<HTMLElement>(
        '[data-mc-dialog-item="true"]'
      )) {
        if (node.closest(".mc-dialog-content") !== element) {
          continue;
        }

        const rect = node.getBoundingClientRect();
        const previous = Number(node.dataset.mcDialogShift ?? 0);

        const next =
          previous +
          bounds.left +
          insetLeft +
          Math.floor((inside - rect.width / scale) / 2) * scale -
          rect.left;

        node.dataset.mcDialogShift = String(next);
        node.style.setProperty("--mc-dialog-item-x", `${next}px`);
      }

      element.dataset.mcDialogReady = "true";
    };

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    const resize = new ResizeObserver(update);
    const mutation = new MutationObserver(update);

    const scroll = () => {
      placeBackground(element);
    };

    resize.observe(element);
    mutation.observe(element, {
      characterData: true,
      childList: true,
      subtree: true,
    });
    measure();
    element.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      resize.disconnect();
      mutation.disconnect();
      cancelAnimationFrame(frame);
      element.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", update);
    };
  }, [element, scale, width]);
  const child = null;

  const contents = (
    <>
      <span className="mc-dialog-background" aria-hidden="true">
        <MinecraftSurface sprite={minecraftCardSprite} />
      </span>
      {children}
    </>
  );

  return (
    <DialogPortal>
      <DialogOverlay />
      <ScaleContext.Provider value={scale}>
        <DialogLayoutContext.Provider
          value={{ contentWidth: Math.max(1, width - 36), scale }}
        >
          <DialogPrimitive.Popup
            render={render}
            data-slot="dialog-content"
            ref={forwarded}
            className={cn(`mc-dialog-content`, className)}
            style={minecraftStyle(
              style,
              (__style) =>
                ({
                  "--mc-dialog-maximum": `${width * scale}px`,
                  "--mc-dialog-scroll-thumb": `url("${minecraftTextareaAssets.scroller}")`,
                  "--mc-dialog-scroll-track": `url("${minecraftTextareaAssets.scroller_background}")`,
                  "--mc-scale": scale,
                  ...__style,
                }) as React.CSSProperties
            )}
            {...props}
          >
            {contents}
          </DialogPrimitive.Popup>
        </DialogLayoutContext.Provider>
      </ScaleContext.Provider>
    </DialogPortal>
  );
};

const DialogHeader = ({ className, ...props }: MinecraftProps<"div">) => (
  <div
    data-slot="dialog-header"
    className={cn(`mc-dialog-header`, className)}
    {...props}
  />
);

const DialogFooter = ({
  className,
  children,
  ref,
  showCloseButton = false,
  ...props
}: MinecraftProps<"div"> & {
  showCloseButton?: boolean;
}) => {
  const { scale, contentWidth } = React.useContext(DialogLayoutContext);
  const [element, forwarded] = useElement(ref);

  React.useLayoutEffect(() => {
    if (!element) {
      return;
    }

    const measure = () => {
      const count = Math.max(1, element.children.length);
      element.style.setProperty(
        "--mc-dialog-button-width",
        `${Math.min(150, Math.floor((contentWidth - 6 * (count - 1)) / count)) * scale}px`
      );
    };

    measure();
    const observer = new MutationObserver(measure);
    observer.observe(element, { childList: true });

    return () => {
      observer.disconnect();
    };
  }, [element, scale, contentWidth]);

  return (
    <div
      data-slot="dialog-footer"
      data-mc-dialog-item="true"
      ref={forwarded}
      className={cn(`mc-dialog-footer`, className)}
      {...props}
    >
      {children}
      {showCloseButton && <DialogClose>Close</DialogClose>}
    </div>
  );
};

const DialogTitle = ({
  children,
  className,
  render,
  ...props
}: MinecraftProps<typeof DialogPrimitive.Title>) => {
  const child = null;
  const content = <MinecraftDialogText bold>{children}</MinecraftDialogText>;

  return (
    <DialogPrimitive.Title
      render={render}
      data-slot="dialog-title"
      data-mc-dialog-item="true"
      className={cn(`mc-dialog-title`, className)}
      {...props}
    >
      {content}
    </DialogPrimitive.Title>
  );
};

const DialogDescription = ({
  children,
  className,
  render,
  ...props
}: MinecraftProps<typeof DialogPrimitive.Description>) => {
  const child = null;
  const text = children;

  const content =
    typeof text === "string" ? (
      text.split("\n\n").map((part, index) => (
        <MinecraftDialogText key={index} item>
          {part}
        </MinecraftDialogText>
      ))
    ) : (
      <MinecraftDialogText item>{text}</MinecraftDialogText>
    );

  return (
    <DialogPrimitive.Description
      render={render}
      data-slot="dialog-description"
      className={cn(`mc-dialog-description`, className)}
      {...props}
    >
      {content}
    </DialogPrimitive.Description>
  );
};

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};

export type { DialogContentProps };
