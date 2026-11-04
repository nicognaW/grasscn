"use client";

import { cva } from "class-variance-authority";
import * as React from "react";

import { Button, buttonVariants } from "./button";
import { Card } from "./card";
import { Input } from "./input";
import { MinecraftDisclosureText } from "./minecraft-disclosure-text";
import {
  isMinecraftEmptyChild,
  isMinecraftTextScalar,
  isMinecraftTextContent,
  minecraftClasses as cn,
  minecraftStyle,
  MinecraftRender,
} from "./minecraft-render";
import type {
  MinecraftProps,
  MinecraftPolymorphicProps,
} from "./minecraft-render";
import { playMinecraftClick } from "./minecraft-sound";
import { MinecraftText } from "./minecraft-text";
import { MinecraftUnicodeLabel } from "./minecraft-unicode-label";
import { ScrollArea, ScrollBar } from "./scroll-area";
import { Separator } from "./separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "./sheet";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "./tooltip";

import "./minecraft-sidebar.css";

interface OwnedSidebarDimensions1 extends React.CSSProperties {
  "--mc-z-sidebar-base-1-right"?: string;
  "--mc-z-sidebar-base-1-top"?: string;
}

interface OwnedSidebarDimensions2 extends React.CSSProperties {
  "--mc-z-sidebar-base-2-right"?: string;
  "--mc-z-sidebar-base-2-top"?: string;
}

interface SidebarWidthStyle extends React.CSSProperties {
  "--mc-scale": number;
  "--sidebar-width": string;
  "--sidebar-width-icon": string;
  "--sidebar-width-mobile": string;
}

interface SidebarMobileStyle extends React.CSSProperties {
  "--sidebar-width-mobile": string;
}

interface SidebarScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

type Scale = 1 | 2 | 3;

interface SidebarState {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openMobile: boolean;
  setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>;
  isMobile: boolean;
  toggleSidebar: () => void;
}

type Context = SidebarState & {
  scale: Scale;
};

const SidebarContext = React.createContext<Context | null>(null);

const CollapsibleContext = React.createContext<"offcanvas" | "icon" | "none">(
  "offcanvas"
);

const useSidebarContext = function useSidebarContext() {
  const value = React.useContext(SidebarContext);

  if (!value) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return value;
};

const useSidebar = function useSidebar(): SidebarState {
  const { ...state } = useSidebarContext();

  return state;
};

const useIsMobile = function useIsMobile() {
  const [mobile, setMobile] = React.useState(false);
  React.useEffect(() => {
    const query = matchMedia("(max-width: 767px)");

    const update = () => {
      setMobile(query.matches);
    };

    update();
    query.addEventListener("change", update);

    return () => {
      query.removeEventListener("change", update);
    };
  }, []);

  return mobile;
};

const SidebarProvider = ({
  defaultOpen = true,
  open: controlled,
  onOpenChange,
  className,
  style,
  children,
  scale = 2,
  ...props
}: MinecraftProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  scale?: Scale;
}) => {
  const isMobile = useIsMobile();
  const [internal, setInternal] = React.useState(defaultOpen);
  const [openMobile, setOpenMobile] = React.useState(false);

  const open = controlled ?? internal;
  const pendingOpen = React.useRef(internal);

  const setOpen = React.useCallback<
    React.Dispatch<React.SetStateAction<boolean>>
  >(
    (update) => {
      const value =
        typeof update === "function"
          ? update(controlled ?? pendingOpen.current)
          : update;

      if (controlled === undefined) {
        pendingOpen.current = value;
        setInternal(value);
      }

      onOpenChange?.(value);
    },
    [controlled, onOpenChange]
  );

  React.useEffect(() => {
    document.cookie = `sidebar_state=${open}; path=/; max-age=${60 * 60 * 24 * 7}`;
  }, [open]);

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((value) => !value);
    } else {
      setOpen((value) => !value);
    }
  }, [isMobile, setOpen]);

  React.useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (
        !event.defaultPrevented &&
        event.key === "b" &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", listener);

    return () => {
      window.removeEventListener("keydown", listener);
    };
  }, [toggleSidebar]);

  const value = React.useMemo<Context>(
    () => ({
      isMobile,
      open,
      openMobile,
      scale,
      setOpen,
      setOpenMobile,
      state: open ? "expanded" : "collapsed",
      toggleSidebar,
    }),
    [open, setOpen, openMobile, isMobile, toggleSidebar, scale]
  );

  return (
    <SidebarContext.Provider value={value}>
      <TooltipProvider delay={0}>
        <div
          data-slot="sidebar-wrapper"
          className={cn(`mc-sidebar-wrapper`, className)}
          style={minecraftStyle(style, (__style): SidebarWidthStyle => ({
            "--mc-scale": scale,
            "--sidebar-width": `${120 * scale}px`,
            "--sidebar-width-icon": `${36 * scale}px`,
            "--sidebar-width-mobile": `${140 * scale}px`,
            ...__style,
          }))}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
};

type SidebarProps = MinecraftProps<"div"> & {
  side?: "left" | "right";
  variant?: "sidebar";
  collapsible?: "offcanvas" | "icon" | "none";
};

const Sidebar = ({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  style,
  ...props
}: SidebarProps) => {
  const { state, isMobile, openMobile, setOpenMobile, scale } =
    useSidebarContext();

  if (variant !== "sidebar") {
    throw new Error(
      "Minecraft Sidebar supports the default sidebar visual variant only"
    );
  }

  const content = (
    <CollapsibleContext.Provider value={collapsible}>
      {children}
    </CollapsibleContext.Provider>
  );

  if (collapsible === "none") {
    return (
      <Card
        scale={scale}
        data-slot="sidebar"
        data-sidebar="sidebar"
        data-side={side}
        data-state={state}
        data-collapsible="none"
        className={cn(`mc-sidebar mc-sidebar-static`, className)}
        style={style}
        {...props}
      >
        {content}
      </Card>
    );
  }

  if (isMobile) {
    return (
      <Sheet scale={scale} open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side={side}
          data-slot="sidebar"
          data-sidebar="sidebar"
          data-mobile="true"
          data-state={openMobile ? "expanded" : "collapsed"}
          className={cn(`mc-sidebar mc-sidebar-mobile`, className)}
          style={minecraftStyle(style, (__style): SidebarMobileStyle => ({
            "--sidebar-width-mobile": `${Math.min(140 * scale, innerWidth)}px`,
            ...__style,
          }))}
          {...props}
        >
          <SheetHeader className="mc-sidebar-accessible">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  const closed = state === "collapsed" && collapsible === "offcanvas";

  return (
    <div
      data-slot="sidebar"
      data-state={state}
      data-side={side}
      data-variant={variant}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      className="mc-sidebar"
    >
      <div data-slot="sidebar-gap" className="mc-sidebar-gap" />
      <div
        data-slot="sidebar-container"
        className={cn(`mc-sidebar-container`, className)}
        style={style}
        inert={closed || undefined}
        aria-hidden={closed || undefined}
        {...props}
      >
        <Card
          scale={scale}
          data-slot="sidebar-inner"
          data-sidebar="sidebar"
          className="mc-sidebar-inner"
        >
          {content}
        </Card>
      </div>
    </div>
  );
};

type SidebarControlProps = MinecraftPolymorphicProps<"button"> & {
  scale?: Scale;
};

const sidebarControlLabel = function sidebarControlLabel(
  children: React.ReactNode
): React.ReactNode {
  const parts: (
    | { kind: "text"; content: string }
    | { kind: "child"; content: React.ReactNode }
  )[] = [];

  let run = "";

  const flush = () => {
    if (run) {
      parts.push({ content: run, kind: "text" });
      run = "";
    }
  };

  const visit = (child: React.ReactNode) => {
    if (isMinecraftEmptyChild(child)) {
      return;
    }

    if (Array.isArray(child)) {
      // oxlint-disable-next-line unicorn/no-array-for-each -- Preserve this consumer ReactNode array's existing method dispatch and sparse/mutation behavior; indexed traversal would bypass custom forEach overrides.
      child.forEach(visit);

      return;
    }

    if (
      React.isValidElement<{ children?: React.ReactNode }>(child) &&
      child.type === React.Fragment
    ) {
      visit(child.props.children);

      return;
    }

    if (isMinecraftTextScalar(child)) {
      run += String(child);
    } else {
      flush();
      parts.push({ content: child, kind: "child" });
    }
  };

  visit(children);
  flush();

  return parts.map((part, index) => {
    let _selectedContent: React.ReactNode;

    if (part.kind === "text") {
      _selectedContent = /^[\u0020-\u007E]*$/u.test(part.content) ? (
        <MinecraftText className="mc-text">{part.content}</MinecraftText>
      ) : (
        <MinecraftUnicodeLabel text={part.content} />
      );
    } else {
      _selectedContent = part.content;
    }

    return <React.Fragment key={index}>{_selectedContent}</React.Fragment>;
  });
};

const SidebarControl = ({
  scale = 2,
  render,
  children,
  className,
  style,
  onClick,
  onClickCapture,
  ...props
}: SidebarControlProps) => {
  const inactive =
    (props.disabled ?? props["aria-disabled"] === true) ||
    props["aria-disabled"] === "true";

  return (
    <MinecraftRender
      as="button"
      render={render}
      type="button"
      data-variant="default"
      data-size="default"
      className={cn(
        buttonVariants({ size: "default", variant: "default" }),
        className
      )}
      // SAFETY: This view adds only the numeric --mc-scale custom property to the caller's CSSProperties; MinecraftRender forwards the unchanged inline object and spread precedence.
      style={{ "--mc-scale": scale, ...style } as React.CSSProperties}
      {...props}
      aria-disabled={inactive || props["aria-disabled"]}
      tabIndex={inactive ? -1 : props.tabIndex}
      onClickCapture={(event) => {
        if (inactive) {
          event.preventDefault();
          event.stopPropagation();

          return;
        }

        onClickCapture?.(event);
      }}
      onClick={(event) => {
        if (inactive) {
          event.preventDefault();

          return;
        }

        onClick?.(event);

        if (!event.defaultPrevented) {
          playMinecraftClick();
        }
      }}
    >
      <span className="mc-button-surface" aria-hidden="true">
        {Array.from({ length: 9 }, (_, index) => (
          <span key={index} />
        ))}
      </span>
      <span className="mc-button-label">{sidebarControlLabel(children)}</span>
    </MinecraftRender>
  );
};

const SidebarActionButton = ({
  render,
  children,
  onClick,
  onClickCapture,
  ...props
}: MinecraftProps<typeof Button>) => {
  const inactive =
    (props.disabled ?? props["aria-disabled"] === true) ||
    props["aria-disabled"] === "true";

  const content = children;

  return (
    <Button
      render={render}
      {...props}
      aria-disabled={inactive || props["aria-disabled"]}
      tabIndex={inactive ? -1 : props.tabIndex}
      onClickCapture={(event) => {
        if (inactive) {
          event.preventDefault();
          event.stopPropagation();

          return;
        }

        onClickCapture?.(event);
      }}
      onClick={(event) => {
        if (inactive) {
          event.preventDefault();

          return;
        }

        onClick?.(event);
      }}
    >
      {content}
    </Button>
  );
};

const SidebarTrigger = ({
  className,
  onClick,
  children = "=",
  scale: explicit,
  ...props
}: MinecraftProps<typeof Button>) => {
  const { toggleSidebar, open, openMobile, isMobile, scale } =
    useSidebarContext();

  return (
    <SidebarActionButton
      type="button"
      data-slot="sidebar-trigger"
      data-sidebar="trigger"
      aria-label="Toggle Sidebar"
      aria-expanded={isMobile ? openMobile : open}
      scale={explicit ?? scale}
      className={cn(`mc-sidebar-trigger`, className)}
      {...props}
      onClick={(event) => {
        onClick?.(event);

        if (!event.defaultPrevented) {
          toggleSidebar();
        }
      }}
    >
      {children}
    </SidebarActionButton>
  );
};

const SidebarRail = ({
  className,
  onClick,
  ...props
}: MinecraftProps<"button">) => {
  const { toggleSidebar } = useSidebarContext();

  return (
    <button
      type="button"
      data-slot="sidebar-rail"
      data-sidebar="rail"
      aria-label="Toggle Sidebar"
      title="Toggle Sidebar"
      tabIndex={-1}
      className={cn(`mc-sidebar-rail`, className)}
      {...props}
      onClick={(event) => {
        onClick?.(event);

        if (!event.defaultPrevented) {
          toggleSidebar();
        }
      }}
    />
  );
};

const SidebarInset = ({ className, ...props }: MinecraftProps<"main">) => (
  <main
    data-slot="sidebar-inset"
    className={cn(`mc-sidebar-inset`, className)}
    {...props}
  />
);

const SidebarInput = ({
  className,
  scale: explicit,
  ...props
}: MinecraftProps<typeof Input>) => {
  const { scale } = useSidebarContext();

  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      scale={explicit ?? scale}
      className={cn(`mc-sidebar-input`, className)}
      {...props}
    />
  );
};

const SidebarSeparator = ({
  className,
  scale: explicit,
  ...props
}: MinecraftProps<typeof Separator>) => {
  const { scale } = useSidebarContext();

  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      scale={explicit ?? scale}
      className={cn(`mc-sidebar-separator`, className)}
      {...props}
    />
  );
};

const SidebarHeader = ({ className, ...props }: MinecraftProps<"div">) => (
  <div
    data-slot="sidebar-header"
    data-sidebar="header"
    className={cn(`mc-sidebar-header`, className)}
    {...props}
  />
);

const SidebarFooter = ({ className, ...props }: MinecraftProps<"div">) => (
  <div
    data-slot="sidebar-footer"
    data-sidebar="footer"
    className={cn(`mc-sidebar-footer`, className)}
    {...props}
  />
);

const SidebarContent = ({
  className,
  children,
  onScroll,
  viewportProps,
  ...props
}: MinecraftProps<"div"> &
  Pick<
    MinecraftProps<typeof ScrollArea>,
    "viewportRef" | "viewportProps" | "disabled"
  >) => {
  const { scale } = useSidebarContext();

  return (
    <ScrollArea
      data-slot="sidebar-content"
      data-sidebar="content"
      scale={scale}
      className={cn(`mc-sidebar-content`, className)}
      {...props}
      viewportProps={{
        ...viewportProps,
        onScroll: (event) => {
          viewportProps?.onScroll?.(event);
          onScroll?.(event);
        },
      }}
    >
      <>{children}</>
      <ScrollBar />
    </ScrollArea>
  );
};

const SidebarGroup = ({ className, ...props }: MinecraftProps<"div">) => (
  <div
    data-slot="sidebar-group"
    data-sidebar="group"
    className={cn(`mc-sidebar-group`, className)}
    {...props}
  />
);

const SidebarGroupContent = ({
  className,
  ...props
}: MinecraftProps<"div">) => (
  <div
    data-slot="sidebar-group-content"
    data-sidebar="group-content"
    className={cn(`mc-sidebar-group-content`, className)}
    {...props}
  />
);

type SidebarLabelProps = MinecraftPolymorphicProps<"div"> & {
  maxWidth?: number;
  align?: "left" | "center";
};

const SidebarGroupLabel = ({
  className,
  render,
  children,
  maxWidth,
  align,
  ...props
}: SidebarLabelProps) => {
  const { scale } = useSidebarContext();

  return render ? (
    <MinecraftRender
      render={render}
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      className={cn(`mc-sidebar-group-label`, className)}
      {...props}
    >
      {children}
    </MinecraftRender>
  ) : (
    <MinecraftDisclosureText
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      scale={scale}
      maxWidth={maxWidth}
      align={align}
      className={cn(`mc-sidebar-group-label`, className)}
      {...props}
    >
      {children}
    </MinecraftDisclosureText>
  );
};

const SidebarGroupAction = ({
  className,
  scale: explicit,
  style,
  ...props
}: SidebarControlProps) => {
  const { scale } = useSidebarContext();

  return (
    <SidebarControl
      type="button"
      data-slot="sidebar-group-action"
      data-sidebar="group-action"
      scale={explicit ?? scale}
      className={cn(
        "mc-sidebar-group-action mc-owned-base-sidebar-1 absolute",
        className
      )}
      style={minecraftStyle(style, (__style): OwnedSidebarDimensions1 => ({
        "--mc-z-sidebar-base-1-right": `${4 * (explicit ?? scale)}px`,
        "--mc-z-sidebar-base-1-top": `0px`,
        ...__style,
      }))}
      {...props}
    />
  );
};

const SidebarMenu = ({ className, ...props }: MinecraftProps<"ul">) => (
  <ul
    data-slot="sidebar-menu"
    data-sidebar="menu"
    className={cn(`mc-sidebar-menu`, className)}
    {...props}
  />
);

const SidebarMenuItem = ({ className, ...props }: MinecraftProps<"li">) => (
  <li
    data-slot="sidebar-menu-item"
    data-sidebar="menu-item"
    className={cn(`mc-sidebar-menu-item`, className)}
    {...props}
  />
);

const plainText = function plainText(children: React.ReactNode): string {
  return React.Children.toArray(children)
    .map((child) => {
      if (isMinecraftTextContent(child)) {
        return String(child);
      }

      if (
        React.isValidElement<{
          children?: React.ReactNode;
        }>(child) &&
        child.type !== "svg"
      ) {
        return plainText(child.props.children);
      }

      return "";
    })
    .join("");
};

const collapsedContent = function collapsedContent(
  children: React.ReactNode
): React.ReactNode {
  const values = React.Children.toArray(children);

  const icon = values.find(
    (child) =>
      React.isValidElement<{
        children?: React.ReactNode;
        "data-sidebar-icon"?: boolean;
      }>(child) &&
      ((child.type === "svg" || child.props["data-sidebar-icon"]) ??
        child.props.children === undefined)
  );

  if (icon !== null && icon !== undefined) {
    return icon;
  }

  const firstCodePoint = plainText(children).codePointAt(0);

  return firstCodePoint === undefined
    ? "?"
    : String.fromCodePoint(firstCodePoint);
};

const sidebarMenuButtonVariants = cva("mc-sidebar-menu-button", {
  defaultVariants: { size: "default", variant: "default" },
  variants: { size: { default: "" }, variant: { default: "" } },
});

type SidebarMenuButtonProps = SidebarControlProps & {
  variant?: "default";
  size?: "default";
  isActive?: boolean;
  tooltip?: string | MinecraftProps<typeof TooltipContent>;
};

const sidebarMenuTooltipContent = (
  tooltip: SidebarMenuButtonProps["tooltip"],
  scale: Scale,
  state: SidebarState["state"],
  isMobile: SidebarState["isMobile"]
) => {
  const info = typeof tooltip === "string" ? { children: tooltip } : tooltip;

  return (
    <TooltipContent
      side="right"
      align="center"
      scale={scale}
      hidden={state !== "collapsed" || isMobile}
      {...info}
    />
  );
};

const SidebarMenuButton = ({
  className,
  render,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  children,
  onClick,
  scale: explicit,
  ...props
}: SidebarMenuButtonProps) => {
  const { state, isMobile, scale: inherited } = useSidebarContext();
  const mode = React.useContext(CollapsibleContext);
  const scale = explicit ?? inherited;
  const collapsed = !isMobile && state === "collapsed" && mode === "icon";

  const disabled =
    (props.disabled ?? props["aria-disabled"] === true) ||
    props["aria-disabled"] === "true";

  if (variant !== "default" || size !== "default") {
    throw new Error(
      "Minecraft sidebar menu buttons support the native default visual variant and size only"
    );
  }

  const hasTooltip = Boolean(tooltip);
  const raw = children;
  const label = props["aria-label"] ?? plainText(raw);
  const display = collapsed ? collapsedContent(raw) : raw;

  const content = display;

  const button = (
    <SidebarControl
      render={hasTooltip ? <TooltipTrigger render={render} /> : render}
      type="button"
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-active={isActive || undefined}
      aria-current={isActive ? "page" : undefined}
      data-size={size}
      aria-label={label || undefined}
      scale={scale}
      className={cn(sidebarMenuButtonVariants({ size, variant }), className)}
      {...props}
      aria-disabled={disabled || props["aria-disabled"]}
      tabIndex={disabled ? -1 : props.tabIndex}
      onClick={onClick}
    >
      {content}
    </SidebarControl>
  );

  if (!hasTooltip) {
    return button;
  }

  return (
    <Tooltip>
      {button}
      {sidebarMenuTooltipContent(tooltip, scale, state, isMobile)}
    </Tooltip>
  );
};

const SidebarMenuAction = ({
  className,
  showOnHover = false,
  scale: explicit,
  style,
  ...props
}: SidebarControlProps & {
  showOnHover?: boolean;
}) => {
  const { scale } = useSidebarContext();

  return (
    <SidebarControl
      type="button"
      data-slot="sidebar-menu-action"
      data-sidebar="menu-action"
      data-show-on-hover={showOnHover || undefined}
      scale={explicit ?? scale}
      className={cn(
        "mc-sidebar-menu-action mc-owned-base-sidebar-2 absolute",
        className
      )}
      style={minecraftStyle(style, (__style): OwnedSidebarDimensions2 => ({
        "--mc-z-sidebar-base-2-right": `${2 * (explicit ?? scale)}px`,
        "--mc-z-sidebar-base-2-top": `0px`,
        ...__style,
      }))}
      {...props}
    />
  );
};

const SidebarMenuBadge = ({
  className,
  maxWidth,
  align,
  ...props
}: MinecraftProps<"div"> & {
  maxWidth?: number;
  align?: "left" | "center";
}) => {
  const { scale } = useSidebarContext();

  return (
    <MinecraftDisclosureText
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      scale={scale}
      maxWidth={maxWidth}
      align={align}
      className={cn(`mc-sidebar-menu-badge`, className)}
      {...props}
    />
  );
};

const SidebarMenuSkeleton = ({
  className,
  showIcon = false,
  style,
  ...props
}: MinecraftProps<"div"> & {
  showIcon?: boolean;
}) => {
  const { scale } = useSidebarContext();

  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      aria-busy="true"
      className={cn(`mc-sidebar-menu-skeleton`, className)}
      style={minecraftStyle(style, (__style): SidebarScaleStyle => ({
        "--mc-scale": scale,
        ...__style,
      }))}
      {...props}
    >
      {showIcon ? (
        <Button
          disabled
          scale={scale}
          aria-hidden="true"
          tabIndex={-1}
          className="mc-sidebar-skeleton-icon"
        />
      ) : null}
      <Button
        disabled
        scale={scale}
        aria-hidden="true"
        tabIndex={-1}
        className="mc-sidebar-skeleton-label"
      />
    </div>
  );
};

const SidebarMenuSub = ({ className, ...props }: MinecraftProps<"ul">) => (
  <ul
    data-slot="sidebar-menu-sub"
    data-sidebar="menu-sub"
    className={cn(`mc-sidebar-menu-sub`, className)}
    {...props}
  />
);

const SidebarMenuSubItem = ({ className, ...props }: MinecraftProps<"li">) => (
  <li
    data-slot="sidebar-menu-sub-item"
    data-sidebar="menu-sub-item"
    className={cn(`mc-sidebar-menu-sub-item`, className)}
    {...props}
  />
);

const SidebarMenuSubButton = ({
  render,
  isActive = false,
  className,
  children,
  size = "default",
  ...props
}: MinecraftPolymorphicProps<"a"> & {
  isActive?: boolean;
  size?: "default";
}) => (
  <SidebarMenuButton
    {...(props as SidebarMenuButtonProps)}
    render={render ?? <a />}
    isActive={isActive}
    size={size}
    aria-disabled={props["aria-disabled"]}
    data-slot="sidebar-menu-sub-button"
    data-sidebar="menu-sub-button"
    className={cn(className)}
  >
    {children}
  </SidebarMenuButton>
);

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};
