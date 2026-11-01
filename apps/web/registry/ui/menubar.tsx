"use client";

import { Menu as Primitive } from "@base-ui/react/menu";
import { Menubar as MenubarPrimitive } from "@base-ui/react/menubar";
import * as React from "react";

import { Button } from "./button";
import { minecraftCardSprite } from "./minecraft-card-sprite";
import { MinecraftMenuCheckboxSprite } from "./minecraft-menu-checkbox";
import {
  MenuScaleContext,
  MinecraftMenuText,
  menuTextNodes,
} from "./minecraft-menu-text";
import {
  minecraftClasses as cn,
  minecraftStyle,
  MinecraftRender,
} from "./minecraft-render";
import type { MinecraftProps } from "./minecraft-render";
import { playMinecraftClick } from "./minecraft-sound";
import { MinecraftSurface } from "./minecraft-surface";
import { Separator } from "./separator";

import "./minecraft-checkbox.css";
import "./minecraft-menu.css";
import "./minecraft-menubar.css";

type MenuSurface = "popup" | "suggestions";

const Menubar = ({
  scale = 2,
  className,
  style,
  ...props
}: MinecraftProps<typeof MenubarPrimitive> & {
  scale?: 1 | 2 | 3;
}) => {
  return (
    <MenuScaleContext.Provider value={scale}>
      <MenubarPrimitive
        data-slot="menubar"
        className={cn("mc-menubar", className)}
        style={minecraftStyle(
          style,
          (__style) =>
            ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
        )}
        {...props}
      />
    </MenuScaleContext.Provider>
  );
};

const MenubarMenu = (props: MinecraftProps<typeof Primitive.Root>) => {
  return <Primitive.Root {...props} />;
};

const MenubarPortal = (props: MinecraftProps<typeof Primitive.Portal>) => {
  return <Primitive.Portal data-slot="menubar-portal" {...props} />;
};

const MenubarTrigger = ({
  render,
  children,
  className,
  ...props
}: MinecraftProps<typeof Primitive.Trigger>) => {
  const scale = React.useContext(MenuScaleContext);

  return (
    <Primitive.Trigger
      data-slot="menubar-trigger"
      className={cn("mc-menubar-trigger", className)}
      render={render ?? <Button scale={scale} />}
      {...props}
    >
      {children}
    </Primitive.Trigger>
  );
};

function useMenuFrame(
  ref: React.Ref<HTMLDivElement> | undefined,
  scale: number,
  surface: MenuSurface
) {
  const [node, setNode] = React.useState<HTMLDivElement | null>(null);

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

    const items = [...node.children].find((child) =>
      child.classList.contains("mc-menu-items")
    ) as HTMLElement | undefined;

    if (!items) {
      return;
    }

    let frame = 0;

    const measure = () => {
      if (!node.clientWidth || !node.clientHeight) {
        return;
      }

      node.dataset.mcMenuScrollable = String(
        node.scrollHeight > node.clientHeight + 0.5
      );

      const style = getComputedStyle(node);

      const padding =
        Number.parseFloat(style.paddingTop) +
        Number.parseFloat(style.paddingBottom);

      const maximum = Math.max(0, node.scrollHeight - node.clientHeight);
      node.dataset.mcMenuAbove = String(node.scrollTop > 0.5);
      node.dataset.mcMenuBelow = String(node.scrollTop < maximum - 0.5);

      const values = {
        "--mc-menu-clip-bottom": `${Math.max(0, items.offsetHeight - node.scrollTop - (node.clientHeight - padding))}px`,
        "--mc-menu-clip-top": `${node.scrollTop}px`,
        "--mc-menu-frame-height": `${node.clientHeight}px`,
        "--mc-menu-frame-width": `${node.clientWidth}px`,
        "--mc-menu-scroll-px": `${node.scrollTop}px`,
      };

      for (const [key, value] of Object.entries(values)) {
        if (node.style.getPropertyValue(key) !== value) {
          node.style.setProperty(key, value);
        }
      }

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        node.dataset.mcMenuReady = "true";
      });
    };

    const resize = new ResizeObserver(measure);
    const mutation = new MutationObserver(measure);

    resize.observe(node);
    resize.observe(items);
    mutation.observe(items, {
      characterData: true,
      childList: true,
      subtree: true,
    });
    node.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    measure();

    return () => {
      resize.disconnect();
      mutation.disconnect();
      node.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(frame);
    };
  }, [node, scale, surface]);

  return forwarded;
}

function contentChildren(
  children: React.ReactNode,
  render: unknown,
  surface: MenuSurface
) {
  const content = (
    <>
      {surface === "popup" && (
        <span className="mc-menu-background" aria-hidden="true">
          <MinecraftSurface sprite={minecraftCardSprite} />
        </span>
      )}
      <div className="mc-menu-items">{children}</div>
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

  return content;
}

type MenubarContentProps = MinecraftProps<typeof Primitive.Popup> &
  Pick<
    MinecraftProps<typeof Primitive.Positioner>,
    | "side"
    | "align"
    | "sideOffset"
    | "alignOffset"
    | "collisionPadding"
    | "collisionBoundary"
    | "collisionAvoidance"
  > & {
    keepMounted?: boolean;
    scale?: 1 | 2 | 3;
    surface?: MenuSurface;
  };

const MenubarContent = ({
  children,
  className,
  sideOffset = 4,
  scale: explicitScale,
  surface = "popup",
  render,
  style,
  ref,
  side = "bottom",
  align = "start",
  alignOffset,
  collisionPadding,
  collisionBoundary,
  collisionAvoidance,
  keepMounted,
  ...props
}: MenubarContentProps) => {
  const inherited = React.useContext(MenuScaleContext);
  const scale = explicitScale ?? inherited;

  const forwarded = useMenuFrame(ref, scale, surface);

  return (
    <Primitive.Portal keepMounted={keepMounted}>
      <MenuScaleContext.Provider value={scale}>
        <Primitive.Positioner
          data-mc-positioner=""
          side={side}
          align={align}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          collisionPadding={collisionPadding}
          collisionBoundary={collisionBoundary}
          collisionAvoidance={collisionAvoidance}
          style={{ zIndex: 50 }}
        >
          <Primitive.Popup
            render={render}
            data-slot="menubar-content"
            data-surface={surface}
            ref={forwarded}
            className={cn("mc-menu-content", className)}
            style={minecraftStyle(
              style,
              (__style) =>
                ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
            )}
            {...props}
          >
            {contentChildren(children, render, surface)}
          </Primitive.Popup>
        </Primitive.Positioner>
      </MenuScaleContext.Provider>
    </Primitive.Portal>
  );
};

const MenubarGroup = (props: MinecraftProps<typeof Primitive.Group>) => {
  return <Primitive.Group data-slot="menubar-group" {...props} />;
};

function rowChildren(
  children: React.ReactNode,
  _render: unknown,
  before?: React.ReactNode,
  after?: React.ReactNode
) {
  return (
    <>
      {before}
      {menuTextNodes(children)}
      {after}
    </>
  );
}

type MenubarItemProps = MinecraftProps<typeof Primitive.Item> & {
  inset?: boolean;
  variant?: "default";
};

const MenubarItem = ({
  children,
  className,
  inset,
  variant = "default",
  render,
  style,
  ...props
}: MenubarItemProps) => {
  const scale = React.useContext(MenuScaleContext);

  if (variant !== "default") {
    throw new Error(
      "Minecraft menu items support the default visual variant only"
    );
  }

  return (
    <Primitive.Item
      render={render}
      data-slot="menubar-item"
      data-inset={inset}
      className={cn("mc-menu-item", className)}
      style={minecraftStyle(
        style,
        (__style) =>
          ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
      )}
      {...props}
    >
      {rowChildren(children, render)}
    </Primitive.Item>
  );
};

function checkboxIcon(scale: 1 | 2 | 3, radio = false) {
  const Indicator = radio
    ? Primitive.RadioItemIndicator
    : Primitive.CheckboxItemIndicator;

  return (
    <Indicator
      keepMounted
      aria-hidden="true"
      className="mc-checkbox mc-menu-check"
      style={
        {
          "--mc-checkbox-checked": `var(--mc-checkbox-selected-native-s${scale})`,
          "--mc-checkbox-checked-focused": `var(--mc-checkbox-selected-highlighted-native-s${scale})`,
          "--mc-checkbox-focused": `var(--mc-checkbox-highlighted-native-s${scale})`,
          "--mc-checkbox-normal": `var(--mc-checkbox-native-s${scale})`,
          "--mc-scale": scale,
        } as React.CSSProperties
      }
    >
      <MinecraftMenuCheckboxSprite />
      <span className="mc-checkbox-indicator" />
    </Indicator>
  );
}

const MenubarCheckboxItem = ({
  children,
  className,
  render,
  style,
  onCheckedChange,
  ...props
}: MinecraftProps<typeof Primitive.CheckboxItem>) => {
  const scale = React.useContext(MenuScaleContext);

  return (
    <Primitive.CheckboxItem
      render={render}
      data-slot="menubar-checkbox-item"
      className={cn("mc-menu-item mc-menu-checkbox-item", className)}
      style={minecraftStyle(
        style,
        (__style) =>
          ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
      )}
      onCheckedChange={(next, details) => {
        onCheckedChange?.(next, details);

        if (!props.disabled) {
          playMinecraftClick();
        }
      }}
      {...props}
    >
      {rowChildren(children, render, checkboxIcon(scale))}
    </Primitive.CheckboxItem>
  );
};

const MenubarRadioGroup = (
  props: MinecraftProps<typeof Primitive.RadioGroup>
) => {
  return <Primitive.RadioGroup data-slot="menubar-radio-group" {...props} />;
};

const MenubarRadioItem = ({
  children,
  className,
  render,
  style,
  onClick,
  ...props
}: MinecraftProps<typeof Primitive.RadioItem>) => {
  const scale = React.useContext(MenuScaleContext);

  return (
    <Primitive.RadioItem
      render={render}
      data-slot="menubar-radio-item"
      className={cn("mc-menu-item mc-menu-checkbox-item", className)}
      style={minecraftStyle(
        style,
        (__style) =>
          ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
      )}
      onClick={(event) => {
        onClick?.(event);

        if (!props.disabled) {
          playMinecraftClick();
        }
      }}
      {...props}
    >
      {rowChildren(children, render, checkboxIcon(scale, true))}
    </Primitive.RadioItem>
  );
};

const MenubarLabel = ({
  children,
  className,
  inset,
  render,
  style,
  ...props
}: MinecraftProps<typeof Primitive.GroupLabel> & {
  inset?: boolean;
}) => {
  const scale = React.useContext(MenuScaleContext);

  return (
    <Primitive.GroupLabel
      render={render}
      data-slot="menubar-label"
      data-inset={inset}
      className={cn("mc-menu-item mc-menu-label", className)}
      style={minecraftStyle(
        style,
        (__style) =>
          ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
      )}
      {...props}
    >
      {rowChildren(children, render)}
    </Primitive.GroupLabel>
  );
};

const MenubarSeparator = ({
  className,
  style,
  render,
  children,
  ...props
}: MinecraftProps<typeof Primitive.Separator>) => {
  const scale = React.useContext(MenuScaleContext);

  return (
    <Primitive.Separator
      render={render}
      data-slot="menubar-separator"
      className={cn("mc-menu-separator", className)}
      style={style}
      {...props}
    >
      {render ? children : <Separator scale={scale} role="separator" />}
    </Primitive.Separator>
  );
};

const MenubarShortcut = ({
  children,
  className,
  ...props
}: MinecraftProps<"span">) => {
  return (
    <span
      data-slot="menubar-shortcut"
      className={cn("mc-menu-shortcut", className)}
      {...props}
    >
      {menuTextNodes(children)}
    </span>
  );
};

const MenubarSub = (props: MinecraftProps<typeof Primitive.SubmenuRoot>) => {
  return <Primitive.SubmenuRoot data-slot="menubar-sub" {...props} />;
};

const MenubarSubTrigger = ({
  children,
  className,
  inset,
  render,
  style,
  ...props
}: MinecraftProps<typeof Primitive.SubmenuTrigger> & {
  inset?: boolean;
}) => {
  const scale = React.useContext(MenuScaleContext);

  const arrow = (
    <span className="mc-menu-arrow" aria-hidden="true">
      <span className="mc-menu-arrow-ltr">
        <MinecraftMenuText>{">"}</MinecraftMenuText>
      </span>
      <span className="mc-menu-arrow-rtl">
        <MinecraftMenuText>{"<"}</MinecraftMenuText>
      </span>
    </span>
  );

  return (
    <Primitive.SubmenuTrigger
      render={render}
      data-slot="menubar-sub-trigger"
      data-inset={inset}
      className={cn("mc-menu-item mc-menu-sub-trigger", className)}
      style={minecraftStyle(
        style,
        (__style) =>
          ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
      )}
      {...props}
    >
      {rowChildren(children, render, undefined, arrow)}
    </Primitive.SubmenuTrigger>
  );
};

type MenubarSubContentProps = MinecraftProps<typeof Primitive.Popup> &
  Pick<
    MinecraftProps<typeof Primitive.Positioner>,
    | "side"
    | "align"
    | "sideOffset"
    | "alignOffset"
    | "collisionPadding"
    | "collisionBoundary"
    | "collisionAvoidance"
  > & {
    keepMounted?: boolean;
    scale?: 1 | 2 | 3;
    surface?: MenuSurface;
  };

const MenubarSubContent = ({
  children,
  className,
  scale: explicitScale,
  surface = "popup",
  render,
  style,
  ref,
  side = "right",
  align = "start",
  sideOffset,
  alignOffset,
  collisionPadding,
  collisionBoundary,
  collisionAvoidance,
  keepMounted,
  ...props
}: MenubarSubContentProps) => {
  const inherited = React.useContext(MenuScaleContext);
  const scale = explicitScale ?? inherited;

  const forwarded = useMenuFrame(ref, scale, surface);

  return (
    <MenuScaleContext.Provider value={scale}>
      <Primitive.Positioner
        data-mc-positioner=""
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        collisionBoundary={collisionBoundary}
        collisionAvoidance={collisionAvoidance}
        style={{ zIndex: 50 }}
      >
        <Primitive.Popup
          render={render}
          data-slot="menubar-sub-content"
          data-surface={surface}
          ref={forwarded}
          className={cn("mc-menu-content", className)}
          style={minecraftStyle(
            style,
            (__style) =>
              ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
          )}
          {...props}
        >
          {contentChildren(children, render, surface)}
        </Primitive.Popup>
      </Primitive.Positioner>
    </MenuScaleContext.Provider>
  );
};

export {
  Menubar,
  MenubarMenu,
  MenubarPortal,
  MenubarTrigger,
  MenubarContent,
  MenubarGroup,
  MenubarLabel,
  MenubarItem,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
};

export type { MenubarContentProps, MenubarItemProps, MenubarSubContentProps };
