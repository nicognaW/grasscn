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
const p = new URLSearchParams(location.search),
  scale = Number(p.get("scale") ?? 2) as 1 | 2 | 3,
  part = p.get("part") ?? "app",
  native = p.has("native"),
  state = p.get("state") ?? "normal",
  width = Number(p.get("width") ?? 200),
  height = Number(p.get("height") ?? 20),
  label = p.get("label") ?? "Worlds",
  position: React.CSSProperties = {
    position: "fixed",
    left: Number(p.get("x") ?? 16) * scale,
    top: Number(p.get("y") ?? 16) * scale,
    width: width * scale,
    height: height * scale,
  };
function Inspector() {
  const ctx = useSidebar();
  return (
    <div style={{ position: "absolute", top: 700, left: 32 }}>
      <output id="state">{ctx.state}</output>
      <output id="mobile">{String(ctx.isMobile)}</output>
      <output id="open-mobile">{String(ctx.openMobile)}</output>
      <button id="external" onClick={() => ctx.setOpen((value) => !value)}>
        External toggle
      </button>
      <button
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
}
export function SidebarFixture() {
  React.useLayoutEffect(() => {
    document.documentElement.style.background =
      p.get("background") ?? "#202020";
    document.body.style.background = p.get("background") ?? "#202020";
  }, []);
  const [open, setOpen] = React.useState(!p.has("collapsed")),
    [events, setEvents] = React.useState(0),
    [scrollEvents, setScrollEvents] = React.useState(0),
    [text, setText] = React.useState(p.get("text") ?? "Hello Minecraft"),
    [refValue, setRefValue] = React.useState(""),
    menuRef = React.useRef<HTMLButtonElement>(null),
    subRef = React.useRef<HTMLAnchorElement>(null),
    inputRef = React.useRef<HTMLInputElement>(null),
    contentRef = React.useRef<HTMLDivElement>(null);
  const provider = {
    scale,
    defaultOpen: !p.has("collapsed"),
    ...(p.has("controlled") ? { open } : {}),
    onOpenChange: (value: boolean) => {
      setEvents((v) => v + 1);
      if (!p.has("reject")) setOpen(value);
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
    id: "subject",
    style: position,
    disabled: state === "disabled",
    onClick: click,
    "data-subject": "true",
  };
  if (native)
    return (
      <SidebarProvider {...provider} style={{ minHeight: 0 }}>
        {part === "menu-button" ? (
          <SidebarMenuButton {...buttonProps} isActive={p.has("active")}>
            {label}
          </SidebarMenuButton>
        ) : part === "sub-button" ? (
          <SidebarMenuSubButton
            id="subject"
            href="#destination"
            style={position}
            aria-disabled={state === "disabled" || undefined}
            isActive={p.has("active")}
            onClick={click}
            data-subject="true"
          >
            {label}
          </SidebarMenuSubButton>
        ) : part === "trigger" ? (
          <SidebarTrigger {...buttonProps}>{label}</SidebarTrigger>
        ) : part === "group-action" ? (
          <SidebarGroupAction {...buttonProps}>{label}</SidebarGroupAction>
        ) : part === "menu-action" ? (
          <SidebarMenuAction {...buttonProps}>{label}</SidebarMenuAction>
        ) : part === "input" ? (
          <SidebarInput
            id="subject"
            aria-label="Test input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={p.get("placeholder") ?? ""}
            disabled={state === "disabled"}
            readOnly={state.includes("readonly")}
            maxLength={
              p.has("maxLength") ? Number(p.get("maxLength")) : undefined
            }
            style={position}
            data-subject="true"
          />
        ) : part === "label" ? (
          <SidebarGroupLabel
            id="subject"
            maxWidth={
              p.has("wrapWidth") ? Number(p.get("wrapWidth")) : undefined
            }
            align={p.get("alignment") === "center" ? "center" : "left"}
            style={{ ...position, margin: 0, minHeight: 0 }}
            data-subject="true"
          >
            {label}
          </SidebarGroupLabel>
        ) : part === "badge" ? (
          <SidebarMenuBadge
            id="subject"
            maxWidth={
              p.has("wrapWidth") ? Number(p.get("wrapWidth")) : undefined
            }
            align={p.get("alignment") === "center" ? "center" : "left"}
            style={{ ...position, margin: 0 }}
            data-subject="true"
          >
            {label}
          </SidebarMenuBadge>
        ) : part === "separator" ? (
          <SidebarSeparator
            id="subject"
            edge={state === "footer" ? "footer" : "header"}
            style={{ ...position, margin: 0 }}
            data-subject="true"
          />
        ) : part === "panel" ? (
          <Sidebar
            id="subject"
            collapsible="none"
            style={{
              ...position,
              padding: p.has("text") ? 18 * scale : 0,
              gap: 12 * scale,
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
        ) : part === "scroll" ? (
          <SidebarContent id="subject" style={position} data-subject="true">
            <div
              style={{
                height: Number(p.get("contentHeight") ?? 0) * scale,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {Array.from(
                { length: Math.ceil(Number(p.get("contentHeight") ?? 0) / 24) },
                (_, index) => (
                  <Button
                    key={index}
                    scale={scale}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 24 * index * scale,
                      width: "100%",
                    }}
                  >{`Row ${index + 1}`}</Button>
                )
              )}
            </div>
          </SidebarContent>
        ) : null}
      </SidebarProvider>
    );
  return (
    <SidebarProvider
      {...provider}
      style={{ minHeight: 400, position: "relative" }}
    >
      <Sidebar
        side={p.get("side") === "right" ? "right" : "left"}
        collapsible={
          p.get("mode") === "none"
            ? "none"
            : p.get("mode") === "offcanvas"
              ? "offcanvas"
              : "icon"
        }
        style={{ position: p.get("mode") === "none" ? "relative" : "absolute" }}
      >
        <SidebarHeader>
          <SidebarInput
            ref={inputRef}
            aria-label="Search worlds"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent
          ref={contentRef}
          onScroll={() => setScrollEvents((v) => v + 1)}
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
                      <a id="settings" href="#settings" onClick={click} />
                    }
                    tooltip="Settings"
                  >
                    {"Settings"}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <a
                        href="#disabled"
                        onClick={() => setEvents((v) => v + 100)}
                      />
                    }
                    id="disabled"
                    disabled
                    tooltip="Unavailable"
                  >
                    {"Unavailable"}
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
          id="read-ref"
          onClick={() =>
            setRefValue(
              `${menuRef.current?.tagName}/${subRef.current?.tagName}/${inputRef.current?.tagName}/${contentRef.current?.tagName}`
            )
          }
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
}
