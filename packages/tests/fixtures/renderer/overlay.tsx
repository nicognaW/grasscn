import { Button } from "@grasscn/web/ui/button";
import {
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@grasscn/web/ui/card";
import * as Drawer from "@grasscn/web/ui/drawer";
import { Input } from "@grasscn/web/ui/input";
import * as Sheet from "@grasscn/web/ui/sheet";
import * as React from "react";
export function OverlayFixture() {
  const p = new URLSearchParams(location.search),
    scale = Number(p.get("scale") ?? 2) as 1 | 2 | 3,
    component = p.get("component") ?? "sheet",
    part = p.get("part") ?? "composition",
    native = p.has("native"),
    side = (p.get("side") ?? "right") as "top" | "right" | "bottom" | "left";
  React.useLayoutEffect(() => {
    document.documentElement.style.background =
      p.get("background") ?? "#202020";
    document.body.style.background = p.get("background") ?? "#202020";
  }, []);
  const [open, setOpen] = React.useState(p.has("open") || native),
    [count, setCount] = React.useState(0),
    [tag, setTag] = React.useState("");
  const [snap, setSnap] = React.useState<number | string | null>(0.5),
    [drags, setDrags] = React.useState(0),
    [releases, setReleases] = React.useState(0);
  const ref = React.useRef<HTMLDivElement>(null);
  const width = Number(p.get("width") ?? 250),
    height = Number(p.get("height") ?? 200),
    x = Number(p.get("x") ?? 16) * scale,
    y = Number(p.get("y") ?? 16) * scale;
  const geom = {
    position: "fixed",
    inset: "auto",
    left: x,
    top: y,
    width: width * scale,
    height: height * scale,
    padding: p.has("text") ? undefined : 0,
    transform: "none",
    willChange: "auto",
  } as React.CSSProperties;
  const isDrawer = component === "drawer",
    Root = isDrawer ? Drawer.Drawer : Sheet.Sheet,
    Trigger = isDrawer ? Drawer.DrawerTrigger : Sheet.SheetTrigger,
    Content = isDrawer ? Drawer.DrawerContent : Sheet.SheetContent,
    Close = isDrawer ? Drawer.DrawerClose : Sheet.SheetClose,
    Header = isDrawer ? Drawer.DrawerHeader : Sheet.SheetHeader,
    Footer = isDrawer ? Drawer.DrawerFooter : Sheet.SheetFooter,
    Title = isDrawer ? Drawer.DrawerTitle : Sheet.SheetTitle,
    Description = isDrawer ? Drawer.DrawerDescription : Sheet.SheetDescription;
  const textProps =
    native && part !== "surface"
      ? {
          id: "subject",
          scale,
          style: {
            position: "fixed",
            left: x,
            top: y,
            width: width * scale,
            height: height * scale,
          } as React.CSSProperties,
          ...(p.has("wrapWidth")
            ? { maxWidth: Number(p.get("wrapWidth")) }
            : {}),
          align: p.get("align") ?? "left",
          "data-subject": "true",
        }
      : {};
  return (
    <>
      <Root
        scale={scale}
        {...(isDrawer
          ? {
              swipeDirection:
                side === "bottom"
                  ? ("down" as const)
                  : side === "top"
                    ? ("up" as const)
                    : side,
              ...(p.has("snap")
                ? {
                    snapPoints: [0.25, 0.5, 1],
                    snapPoint: snap,
                    onSnapPointChange: setSnap,
                  }
                : {}),
            }
          : {})}
        {...(p.has("controlled") ? { open } : { defaultOpen: open })}
        onOpenChange={(next, details) => {
          if (details.reason === "swipe") {
            setDrags((v) => v + 1);
            setReleases((v) => v + 1);
          }
          setOpen(next);
        }}
      >
        <Trigger
          render={p.has("asChild") ? <button /> : undefined}
          disabled={p.has("disabled")}
        >
          {"Open panel"}
        </Trigger>
        <Content
          ref={ref}
          side={isDrawer ? undefined : side}
          showCloseButton={!native}
          initialFocus={native ? false : undefined}
          {...(native
            ? { style: geom }
            : p.has("snap")
              ? { style: { height: "100dvh" } }
              : {})}
          {...(native && part === "surface"
            ? {
                id: "subject",
                "aria-label": "Native surface",
                "aria-describedby": undefined,
                "data-subject": "true",
              }
            : {})}
        >
          {native && part === "surface" ? (
            p.has("text") ? (
              <>
                <CardHeader>
                  <Title render={<CardTitle />}>{p.get("label")}</Title>
                  <Description render={<CardDescription />}>
                    {p.get("text")}
                  </Description>
                </CardHeader>
                <CardFooter>
                  <Close>Done</Close>
                </CardFooter>
              </>
            ) : null
          ) : native ? (
            <>
              <Title
                {...(part === "title"
                  ? textProps
                  : { style: { display: "none" } })}
              >
                {p.get("label") ?? "Hello Minecraft"}
              </Title>
              <Description
                {...(part === "description"
                  ? textProps
                  : { style: { display: "none" } })}
              >
                {p.get("label") ?? "Hello Minecraft"}
              </Description>
            </>
          ) : (
            <>
              <Header>
                <Title>World settings 世界</Title>
                <Description>{"Settings\n第二行"}</Description>
              </Header>
              <label>
                Name
                <Input aria-label="World name" defaultValue="Minecraft" />
              </label>
              <div style={{ height: p.has("scroll") ? 2000 : 0 }} />
              <Footer>
                {p.has("snap") && (
                  <Button
                    id="snap-next"
                    scale={scale}
                    onClick={() => setSnap(snap === 0.5 ? 1 : 0.5)}
                  >
                    Change snap
                  </Button>
                )}
                <Button scale={scale} onClick={() => setCount((v) => v + 1)}>
                  Save
                </Button>
                <Close>Cancel</Close>
              </Footer>
            </>
          )}
        </Content>
      </Root>
      <button id="external" onClick={() => setOpen((v) => !v)}>
        External toggle
      </button>
      <button id="read-ref" onClick={() => setTag(ref.current?.tagName ?? "")}>
        Read ref
      </button>
      <output id="ref-tag">{tag}</output>
      <output id="count">{count}</output>
      <output id="snap">{snap}</output>
      <output id="drags">{drags}</output>
      <output id="releases">{releases}</output>
    </>
  );
}
