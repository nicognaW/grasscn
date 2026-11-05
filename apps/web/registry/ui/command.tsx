"use client";

import { Command as CommandPrimitive } from "cmdk";
import * as React from "react";

import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./dialog";
import { minecraftCardSprite } from "./minecraft-card-sprite";

import "./minecraft-input.css";
import { attachMinecraftInput } from "./minecraft-input-paint";
import {
  MenuScaleContext,
  MinecraftMenuText,
  menuTextNodes,
} from "./minecraft-menu-text";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import type { MinecraftProps } from "./minecraft-render";
import { MinecraftSurface } from "./minecraft-surface";
import { Separator } from "./separator";

import "./minecraft-menu.css";
import "./minecraft-command.css";

interface CommandScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

type Scale = 1 | 2 | 3;

const Command = ({
  scale = 2,
  className,
  style,
  ...props
}: MinecraftProps<typeof CommandPrimitive> & {
  scale?: Scale;
}) => (
  <MenuScaleContext.Provider value={scale}>
    <CommandPrimitive
      data-slot="command"
      className={cn(`mc-command`, className)}
      style={minecraftStyle(style, (__style): CommandScaleStyle => ({
        "--mc-scale": scale,
        ...__style,
      }))}
      {...props}
    />
  </MenuScaleContext.Provider>
);

const CommandDialog = ({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = true,
  scale = 2,
  ...props
}: Omit<MinecraftProps<typeof Dialog>, "children"> & {
  children?: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  showCloseButton?: boolean;
  scale?: Scale;
}) => {
  const isOpen = Boolean(props.open ?? props.defaultOpen);

  const [focusCapture, setFocusCapture] = React.useState<{
    element: HTMLElement | null;
    open: boolean;
  }>({ element: null, open: false });

  // Keep the open-transition snapshot before descendant autofocus/layout effects.
  // React retries this conditional state adjustment before committing children.
  if (isOpen !== focusCapture.open) {
    setFocusCapture({
      element:
        isOpen && typeof document !== "undefined"
          ? (document.activeElement as HTMLElement)
          : focusCapture.element,
      open: isOpen,
    });
  }

  return (
    <Dialog scale={scale} {...props}>
      <DialogContent
        className={cn(className)}
        finalFocus={() =>
          focusCapture.element?.isConnected === true
            ? focusCapture.element
            : undefined
        }
      >
        <DialogHeader className="mc-command-dialog-heading">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Command scale={scale} data-mc-dialog-item="true">
          {children}
        </Command>
        {showCloseButton && (
          <DialogClose render={<Button scale={scale} />}>Done</DialogClose>
        )}
      </DialogContent>
    </Dialog>
  );
};

const CommandInput = ({
  className,
  scale: explicit,
  ref,
  style,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input> & {
  scale?: Scale;
}) => {
  const inherited = React.useContext(MenuScaleContext);
  const scale = explicit ?? inherited;

  const node = React.useRef<HTMLInputElement>(null);
  React.useImperativeHandle<typeof node.current, typeof node.current>(
    ref,
    () => node.current,
    []
  );
  React.useEffect(
    () =>
      node.current ? attachMinecraftInput(node.current, scale) : undefined,
    [scale]
  );

  const inputClassName = cn("mc-input mc-command-input", className);
  const inputStyle: CommandScaleStyle = { "--mc-scale": scale, ...style };

  return (
    <CommandPrimitive.Input
      ref={node}
      data-slot="command-input"
      spellCheck={false}
      autoCorrect="off"
      className={inputClassName}
      style={inputStyle}
      {...props}
    />
  );
};

const CommandList = ({
  className,
  ref,
  children,
  style,
  surface = "suggestions",
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List> & {
  surface?: "suggestions" | "popup";
}) => {
  const scale = React.useContext(MenuScaleContext);
  const node = React.useRef<HTMLDivElement>(null);

  const [attached, setAttached] = React.useState<HTMLDivElement | null>(null);

  const captureNode = React.useCallback((element: HTMLDivElement | null) => {
    node.current = element;

    setAttached(element);
  }, []);

  React.useImperativeHandle<typeof node.current, typeof node.current>(
    ref,
    () => node.current,
    []
  );
  React.useLayoutEffect((): (() => void) | undefined => {
    // The committed attachment schedules this lifetime; the private ref retains its mutable DOM capability.
    const element = node.current;

    if (element === null) {
      return undefined;
    }

    const items = element.querySelector<HTMLElement>("[data-mc-command-items]");

    if (!items) {
      return undefined;
    }

    let frame = 0;

    const measure = () => {
      if (!element.clientWidth || !element.clientHeight) {
        return;
      }

      const maximum = Math.max(0, element.scrollHeight - element.clientHeight);
      element.dataset.mcMenuScrollable = String(maximum > 0.5);
      element.dataset.mcMenuAbove = String(element.scrollTop > 0.5);
      element.dataset.mcMenuBelow = String(element.scrollTop < maximum - 0.5);

      const padding =
        // oxlint-disable-next-line unicorn/prefer-number-coercion -- CSS lengths intentionally retain unit suffixes; parseFloat extracts the numeric prefix while Number would reject px values.
        Number.parseFloat(getComputedStyle(element).paddingTop) +
        // oxlint-disable-next-line unicorn/prefer-number-coercion -- CSS lengths intentionally retain unit suffixes; parseFloat extracts the numeric prefix while Number would reject px values.
        Number.parseFloat(getComputedStyle(element).paddingBottom);

      for (const [key, value] of Object.entries({
        "--mc-menu-clip-bottom": `${Math.max(0, items.offsetHeight - element.scrollTop - (element.clientHeight - padding))}px`,
        "--mc-menu-clip-top": `${element.scrollTop}px`,
        "--mc-menu-frame-height": `${element.clientHeight}px`,
        "--mc-menu-scroll-px": `${element.scrollTop}px`,
      })) {
        if (element.style.getPropertyValue(key) !== value) {
          element.style.setProperty(key, value);
        }
      }

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.dataset.mcMenuReady = "true";
      });
    };

    const resize = new ResizeObserver(measure);
    const mutation = new MutationObserver(measure);

    resize.observe(element);
    resize.observe(items);
    mutation.observe(items, {
      attributeFilter: ["hidden"],
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
    element.addEventListener("scroll", measure, { passive: true });
    measure();

    return () => {
      resize.disconnect();
      mutation.disconnect();
      element.removeEventListener("scroll", measure);
      cancelAnimationFrame(frame);
    };
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- Scale and surface alter the rendered menu geometry; synchronously refresh clipping/readiness before paint.
  }, [attached, scale, surface]);

  const contents = (
    <>
      {surface === "popup" && (
        <span className="mc-menu-background" aria-hidden="true">
          <MinecraftSurface sprite={minecraftCardSprite} />
        </span>
      )}
      <div className="mc-menu-items" data-mc-command-items="">
        {children}
      </div>
      <span
        className="mc-menu-scroll-hint"
        data-edge="top"
        aria-hidden="true"
      />
      <span
        className="mc-menu-scroll-hint"
        data-edge="bottom"
        aria-hidden="true"
      />
    </>
  );

  const listClassName = cn(`mc-menu-content mc-command-list`, className);
  const listStyle: CommandScaleStyle = { "--mc-scale": scale, ...style };

  return (
    <CommandPrimitive.List
      data-slot="command-list"
      data-surface={surface}
      ref={captureNode}
      className={listClassName}
      style={listStyle}
      {...props}
    >
      {contents}
    </CommandPrimitive.List>
  );
};

const CommandEmpty = ({
  children,
  className,
  ...props
}: MinecraftProps<typeof CommandPrimitive.Empty>) => (
  <CommandPrimitive.Empty
    data-slot="command-empty"
    className={cn(`mc-command-empty`, className)}
    {...props}
  >
    {menuTextNodes(children)}
  </CommandPrimitive.Empty>
);

const CommandGroup = ({
  heading,
  className,
  ...props
}: MinecraftProps<typeof CommandPrimitive.Group>) => (
  <CommandPrimitive.Group
    data-slot="command-group"
    className={cn(`mc-command-group`, className)}
    heading={
      heading === undefined || heading === null ? undefined : (
        <MinecraftMenuText>{heading}</MinecraftMenuText>
      )
    }
    {...props}
  />
);

const CommandItem = ({
  children,
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) => (
  <CommandPrimitive.Item
    data-slot="command-item"
    className={cn("mc-command-item", className)}
    {...props}
  >
    {menuTextNodes(children)}
  </CommandPrimitive.Item>
);

const CommandSeparator = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) => {
  const scale = React.useContext(MenuScaleContext);

  return (
    <CommandPrimitive.Separator data-slot="command-separator" {...props}>
      <Separator
        scale={scale}
        className={cn("mc-command-separator", className)}
      />
      {children}
    </CommandPrimitive.Separator>
  );
};

const CommandShortcut = ({
  children,
  className,
  ...props
}: MinecraftProps<"span">) => (
  <span
    data-slot="command-shortcut"
    className={cn(`mc-command-shortcut`, className)}
    {...props}
  >
    {menuTextNodes(children)}
  </span>
);

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
