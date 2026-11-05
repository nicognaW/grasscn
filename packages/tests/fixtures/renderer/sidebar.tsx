import { Button } from "@grasscn/web/ui/button";
import {
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@grasscn/web/ui/card";
import {
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
} from "@grasscn/web/ui/sidebar";
import * as React from "react";

const p = new URLSearchParams(location.search);

// SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
const scale =
  // SAFETY: owned fixture callers serialize the public GUI scales 1, 2, or 3; the existing Number conversion, default and component validation remain unchanged.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
  Number(p.get("scale") ?? 2) as 1 | 2 | 3;

const part = p.get("part") ?? "app";
const native = p.has("native");
const state = p.get("state") ?? "normal";
const width = Number(p.get("width") ?? 200);
const height = Number(p.get("height") ?? 20);
const label = p.get("label") ?? "Worlds";

const nativeSidebarGeometry = {
  height: height * scale,
  left: Number(p.get("x") ?? 16) * scale,
  position: "fixed",
  top: Number(p.get("y") ?? 16) * scale,
  width: width * scale,
} satisfies React.CSSProperties;

const position: React.CSSProperties = nativeSidebarGeometry;

const nativeSidebarLayout = {
  "--fixture-sidebar-native-height": `${nativeSidebarGeometry.height}px`,
  "--fixture-sidebar-native-left": `${nativeSidebarGeometry.left}px`,
  "--fixture-sidebar-native-top": `${nativeSidebarGeometry.top}px`,
  "--fixture-sidebar-native-width": `${nativeSidebarGeometry.width}px`,
};

const Inspector = () => {
  const ctx = useSidebar();

  return (
    <div className="fixture-sidebar-inspector">
      <output id="state">{ctx.state}</output>
      <output id="mobile">{String(ctx.isMobile)}</output>
      <output id="open-mobile">{String(ctx.openMobile)}</output>
      <button
        type="button"
        id="external"
        onClick={() => {
          ctx.setOpen((value) => !value);
        }}
      >
        External toggle
      </button>
      <button
        type="button"
        id="double"
        onClick={() => {
          ctx.setOpen((v) => !v);
          ctx.setOpen((v) => !v);
        }}
      >
        Double toggle
      </button>
    </div>
  );
};

const renderNativeScrollContent = () => (
  <SidebarContent
    id="subject"
    className="fixture-sidebar-native-geometry"
    style={{
      "--fixture-sidebar-native-height":
        nativeSidebarLayout["--fixture-sidebar-native-height"],
      "--fixture-sidebar-native-left":
        nativeSidebarLayout["--fixture-sidebar-native-left"],
      "--fixture-sidebar-native-top":
        nativeSidebarLayout["--fixture-sidebar-native-top"],
      "--fixture-sidebar-native-width":
        nativeSidebarLayout["--fixture-sidebar-native-width"],
    }}
    data-subject="true"
  >
    <div
      style={{
        "--fixture-layout-22": `${Number(p.get("contentHeight") ?? 0) * scale}px`,
      }}
      className="fixture-owner-layout-38 fixture-owner-layout-39 fixture-owner-layout-47"
    >
      {Array.from(
        { length: Math.ceil(Number(p.get("contentHeight") ?? 0) / 24) },
        (_, index) => (
          <Button
            key={index}
            scale={scale}
            className="fixture-sidebar-native-row"
            style={{
              "--fixture-sidebar-row-top": `${24 * index * scale}px`,
            }}
          >{`Row ${index + 1}`}</Button>
        )
      )}
    </div>
  </SidebarContent>
);

export const SidebarFixture = () => {
  React.useLayoutEffect(() => {
    document.documentElement.style.background =
      p.get("background") ?? "#202020";
    document.body.style.background = p.get("background") ?? "#202020";
  }, []);

  const [open, setOpen] = React.useState(!p.has("collapsed"));
  const [events, setEvents] = React.useState(0);
  const [scrollEvents, setScrollEvents] = React.useState(0);
  const [text, setText] = React.useState(p.get("text") ?? "Hello Minecraft");
  const [refValue, setRefValue] = React.useState("");
  const menuRef = React.useRef<HTMLButtonElement>(null);
  const subRef = React.useRef<HTMLAnchorElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  const providerVisibility: Pick<
    React.ComponentProps<typeof SidebarProvider>,
    "scale" | "defaultOpen" | "open"
  > = {
    defaultOpen: !p.has("collapsed"),
    scale,
  };

  if (p.has("controlled")) {
    providerVisibility.open = open;
  }

  const provider = {
    ...providerVisibility,
    onOpenChange: (value: boolean) => {
      setEvents((v) => v + 1);

      if (!p.has("reject")) {
        setOpen(value);
      }
    },
  };

  const click = (event: React.MouseEvent) => {
    if (p.has("cancel")) {
      event.preventDefault();

      return;
    }

    setEvents((v) => v + 1);
  };

  const buttonProps = {
    "data-subject": "true",
    disabled: state === "disabled",
    id: "subject",
    onClick: click,
    style: position,
  };

  const nativeSidebarButtonProps = {
    ...buttonProps,
    className: "fixture-sidebar-native-geometry",
    style: {
      "--fixture-sidebar-native-height":
        nativeSidebarLayout["--fixture-sidebar-native-height"],
      "--fixture-sidebar-native-left":
        nativeSidebarLayout["--fixture-sidebar-native-left"],
      "--fixture-sidebar-native-top":
        nativeSidebarLayout["--fixture-sidebar-native-top"],
      "--fixture-sidebar-native-width":
        nativeSidebarLayout["--fixture-sidebar-native-width"],
    },
  };

  const renderNativeInput = () => (
    <SidebarInput
      id="subject"
      aria-label="Test input"
      value={text}
      onChange={(event) => {
        setText(event.target.value);
      }}
      placeholder={p.get("placeholder") ?? ""}
      disabled={state === "disabled"}
      readOnly={state.includes("readonly")}
      maxLength={p.has("maxLength") ? Number(p.get("maxLength")) : undefined}
      className="fixture-sidebar-native-geometry"
      style={{
        "--fixture-sidebar-native-height":
          nativeSidebarLayout["--fixture-sidebar-native-height"],
        "--fixture-sidebar-native-left":
          nativeSidebarLayout["--fixture-sidebar-native-left"],
        "--fixture-sidebar-native-top":
          nativeSidebarLayout["--fixture-sidebar-native-top"],
        "--fixture-sidebar-native-width":
          nativeSidebarLayout["--fixture-sidebar-native-width"],
      }}
      data-subject="true"
    />
  );

  if (native) {
    const renderNativeSidebar = () => {
      let selectedNativeSidebarSubject: React.JSX.Element | null;

      if (part === "menu-button") {
        selectedNativeSidebarSubject = (
          <SidebarMenuButton
            {...nativeSidebarButtonProps}
            isActive={p.has("active")}
          >
            {label}
          </SidebarMenuButton>
        );
      } else if (part === "sub-button") {
        selectedNativeSidebarSubject = (
          <SidebarMenuSubButton
            id="subject"
            href="#destination"
            className="fixture-sidebar-native-geometry"
            style={{
              "--fixture-sidebar-native-height":
                nativeSidebarLayout["--fixture-sidebar-native-height"],
              "--fixture-sidebar-native-left":
                nativeSidebarLayout["--fixture-sidebar-native-left"],
              "--fixture-sidebar-native-top":
                nativeSidebarLayout["--fixture-sidebar-native-top"],
              "--fixture-sidebar-native-width":
                nativeSidebarLayout["--fixture-sidebar-native-width"],
            }}
            aria-disabled={state === "disabled" || undefined}
            isActive={p.has("active")}
            onClick={click}
            data-subject="true"
          >
            {label}
          </SidebarMenuSubButton>
        );
      } else if (part === "trigger") {
        selectedNativeSidebarSubject = (
          <SidebarTrigger {...nativeSidebarButtonProps}>{label}</SidebarTrigger>
        );
      } else if (part === "group-action") {
        selectedNativeSidebarSubject = (
          <SidebarGroupAction {...nativeSidebarButtonProps}>
            {label}
          </SidebarGroupAction>
        );
      } else if (part === "menu-action") {
        selectedNativeSidebarSubject = (
          <SidebarMenuAction {...nativeSidebarButtonProps}>
            {label}
          </SidebarMenuAction>
        );
      } else if (part === "input") {
        selectedNativeSidebarSubject = renderNativeInput();
      } else if (part === "label") {
        selectedNativeSidebarSubject = (
          <SidebarGroupLabel
            id="subject"
            maxWidth={
              p.has("wrapWidth") ? Number(p.get("wrapWidth")) : undefined
            }
            align={p.get("alignment") === "center" ? "center" : "left"}
            className="fixture-sidebar-native-geometry fixture-sidebar-margin-zero fixture-sidebar-min-height-zero"
            style={{
              "--fixture-sidebar-native-height":
                nativeSidebarLayout["--fixture-sidebar-native-height"],
              "--fixture-sidebar-native-left":
                nativeSidebarLayout["--fixture-sidebar-native-left"],
              "--fixture-sidebar-native-top":
                nativeSidebarLayout["--fixture-sidebar-native-top"],
              "--fixture-sidebar-native-width":
                nativeSidebarLayout["--fixture-sidebar-native-width"],
            }}
            data-subject="true"
          >
            {label}
          </SidebarGroupLabel>
        );
      } else if (part === "badge") {
        selectedNativeSidebarSubject = (
          <SidebarMenuBadge
            id="subject"
            maxWidth={
              p.has("wrapWidth") ? Number(p.get("wrapWidth")) : undefined
            }
            align={p.get("alignment") === "center" ? "center" : "left"}
            className="fixture-sidebar-native-geometry fixture-sidebar-margin-zero"
            style={{
              "--fixture-sidebar-native-height":
                nativeSidebarLayout["--fixture-sidebar-native-height"],
              "--fixture-sidebar-native-left":
                nativeSidebarLayout["--fixture-sidebar-native-left"],
              "--fixture-sidebar-native-top":
                nativeSidebarLayout["--fixture-sidebar-native-top"],
              "--fixture-sidebar-native-width":
                nativeSidebarLayout["--fixture-sidebar-native-width"],
            }}
            data-subject="true"
          >
            {label}
          </SidebarMenuBadge>
        );
      } else if (part === "separator") {
        selectedNativeSidebarSubject = (
          <SidebarSeparator
            id="subject"
            edge={state === "footer" ? "footer" : "header"}
            className="fixture-sidebar-native-geometry fixture-sidebar-margin-zero"
            style={{
              "--fixture-sidebar-native-height":
                nativeSidebarLayout["--fixture-sidebar-native-height"],
              "--fixture-sidebar-native-left":
                nativeSidebarLayout["--fixture-sidebar-native-left"],
              "--fixture-sidebar-native-top":
                nativeSidebarLayout["--fixture-sidebar-native-top"],
              "--fixture-sidebar-native-width":
                nativeSidebarLayout["--fixture-sidebar-native-width"],
            }}
            data-subject="true"
          />
        );
      } else if (part === "panel") {
        selectedNativeSidebarSubject = (
          <Sidebar
            id="subject"
            collapsible="none"
            className="fixture-sidebar-native-geometry fixture-sidebar-padding fixture-sidebar-gap"
            style={{
              "--fixture-sidebar-native-gap": `${12 * scale}px`,
              "--fixture-sidebar-native-height":
                nativeSidebarLayout["--fixture-sidebar-native-height"],
              "--fixture-sidebar-native-left":
                nativeSidebarLayout["--fixture-sidebar-native-left"],
              "--fixture-sidebar-native-padding": `${p.has("text") ? 18 * scale : 0}px`,
              "--fixture-sidebar-native-top":
                nativeSidebarLayout["--fixture-sidebar-native-top"],
              "--fixture-sidebar-native-width":
                nativeSidebarLayout["--fixture-sidebar-native-width"],
            }}
            data-subject="true"
          >
            {p.has("text") ? (
              <>
                <CardHeader>
                  <CardTitle>{label}</CardTitle>
                  <CardDescription>{p.get("text")}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button scale={scale}>Done</Button>
                </CardFooter>
              </>
            ) : null}
          </Sidebar>
        );
      } else if (part === "scroll") {
        selectedNativeSidebarSubject = renderNativeScrollContent();
      } else {
        selectedNativeSidebarSubject = null;
      }

      const nativeSidebarSubject = selectedNativeSidebarSubject;

      return (
        <SidebarProvider
          {...provider}
          className="fixture-sidebar-native-provider"
        >
          {nativeSidebarSubject}
        </SidebarProvider>
      );
    };

    return renderNativeSidebar();
  }

  let selectedFixtureBranch1: "none" | "offcanvas" | "icon";

  if (p.get("mode") === "none") {
    selectedFixtureBranch1 = "none";
  } else {
    selectedFixtureBranch1 =
      p.get("mode") === "offcanvas" ? "offcanvas" : "icon";
  }

  return (
    <SidebarProvider {...provider} className="fixture-sidebar-app-provider">
      <Sidebar
        side={p.get("side") === "right" ? "right" : "left"}
        collapsible={selectedFixtureBranch1}
        className="fixture-sidebar-mode-position"
        style={{
          "--fixture-sidebar-position":
            p.get("mode") === "none" ? "relative" : "absolute",
        }}
      >
        <SidebarHeader>
          <SidebarInput
            ref={inputRef}
            aria-label="Search worlds"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
            }}
          />
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent
          ref={contentRef}
          onScroll={() => {
            setScrollEvents((v) => v + 1);
          }}
        >
          <SidebarGroup>
            <SidebarGroupLabel>Game worlds</SidebarGroupLabel>
            <SidebarGroupAction aria-label="Create world" onClick={click}>
              +
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    id="menu-worlds"
                    ref={menuRef}
                    isActive
                    tooltip="Worlds"
                    onClick={click}
                  >
                    Worlds
                  </SidebarMenuButton>
                  <SidebarMenuAction
                    aria-label="World actions"
                    showOnHover
                    onClick={click}
                  >
                    +
                  </SidebarMenuAction>
                  <SidebarMenuBadge>3</SidebarMenuBadge>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        ref={subRef}
                        href="#survival"
                        onClick={click}
                      >
                        Survival
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- SidebarMenuButton supplies the existing accessible name through its real children or labeling props; retain this empty render receiver to test that forwarding contract.
                      <a id="settings" href="#settings" onClick={click} />
                    }
                    tooltip="Settings"
                  >
                    Settings
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- SidebarMenuButton supplies the existing accessible name through its real children or labeling props; retain this empty render receiver to test that forwarding contract.
                      <a
                        href="#disabled"
                        onClick={() => {
                          setEvents((v) => v + 100);
                        }}
                      />
                    }
                    id="disabled"
                    disabled
                    tooltip="Unavailable"
                  >
                    Unavailable
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {p.has("long")
                  ? Array.from({ length: 30 }, (_, i) => (
                      <SidebarMenuItem key={i}>
                        <SidebarMenuButton
                          onClick={click}
                        >{`World ${i + 1}`}</SidebarMenuButton>
                      </SidebarMenuItem>
                    ))
                  : null}
                <SidebarMenuItem>
                  <SidebarMenuSkeleton showIcon />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={click}>Quit game</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <SidebarTrigger id="toggle" />
        <button
          type="button"
          id="read-ref"
          onClick={() => {
            setRefValue(
              `${menuRef.current?.tagName}/${subRef.current?.tagName}/${inputRef.current?.tagName}/${contentRef.current?.tagName}`
            );
          }}
        >
          Read refs
        </button>
        <output id="refs">{refValue}</output>
        <output id="events">{events}</output>
        <output id="scroll-events">{scrollEvents}</output>
        <output id="value">{text}</output>
      </SidebarInset>
      <Inspector />
    </SidebarProvider>
  );
};
