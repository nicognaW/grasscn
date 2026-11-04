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
import type { ReactNode } from "react";
import * as React from "react";

export const OverlayFixture = () => {
  const p = new URLSearchParams(location.search);

  // SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
  const scale =
    // SAFETY: owned fixture callers serialize the public GUI scales 1, 2, or 3; the existing Number conversion, default and component validation remain unchanged.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
    Number(p.get("scale") ?? 2) as 1 | 2 | 3;

  const component = p.get("component") ?? "sheet";
  const part = p.get("part") ?? "composition";
  const native = p.has("native");

  const side =
    // SAFETY: owned fixture callers serialize the side option from the actual component protocol (| "top" | "right" | "bottom" | "left"); preserve this URL read, original default and component handling.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
    (p.get("side") ?? "right") as "top" | "right" | "bottom" | "left";

  React.useLayoutEffect(() => {
    document.documentElement.style.background =
      p.get("background") ?? "#202020";
    document.body.style.background = p.get("background") ?? "#202020";
  }, []);

  const [open, setOpen] = React.useState(p.has("open") || native);
  const [count, setCount] = React.useState(0);
  const [tag, setTag] = React.useState("");

  const [snap, setSnap] = React.useState<number | string | null>(0.5);
  const [drags, setDrags] = React.useState(0);
  const [releases, setReleases] = React.useState(0);

  const ref = React.useRef<HTMLDivElement>(null);

  const width = Number(p.get("width") ?? 250);
  const height = Number(p.get("height") ?? 200);
  const x = Number(p.get("x") ?? 16) * scale;
  const y = Number(p.get("y") ?? 16) * scale;

  const geom = {
    height: height * scale,
    inset: "auto",
    left: x,
    padding: p.has("text") ? undefined : 0,
    position: "fixed",
    top: y,
    transform: "none",
    width: width * scale,
    willChange: "auto",
  } satisfies React.CSSProperties;

  const isDrawer = component === "drawer";
  const Root = isDrawer ? Drawer.Drawer : Sheet.Sheet;
  const Trigger = isDrawer ? Drawer.DrawerTrigger : Sheet.SheetTrigger;
  const Content = isDrawer ? Drawer.DrawerContent : Sheet.SheetContent;
  const Close = isDrawer ? Drawer.DrawerClose : Sheet.SheetClose;
  const Header = isDrawer ? Drawer.DrawerHeader : Sheet.SheetHeader;
  const Footer = isDrawer ? Drawer.DrawerFooter : Sheet.SheetFooter;
  const Title = isDrawer ? Drawer.DrawerTitle : Sheet.SheetTitle;

  const Description = isDrawer
    ? Drawer.DrawerDescription
    : Sheet.SheetDescription;

  const textProps =
    native && part !== "surface"
      ? {
          id: "subject",
          scale,
          style: {
            height: height * scale,
            left: x,
            position: "fixed",
            top: y,
            width: width * scale,
          } satisfies React.CSSProperties,
          ...(p.has("wrapWidth")
            ? { maxWidth: Number(p.get("wrapWidth")) }
            : {}),
          align: p.get("align") ?? "left",
          "data-subject": "true",
        }
      : {};

  let selectedFixtureBranch1: ReactNode;

  if (native && part === "surface") {
    selectedFixtureBranch1 = p.has("text") ? (
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
    ) : null;
  } else {
    selectedFixtureBranch1 = native ? (
      <>
        <Title
          {...(part === "title" ? textProps : { style: { display: "none" } })}
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
        <div
          className={
            p.has("scroll")
              ? "fixture-overlay-scroll-spacer"
              : "fixture-overlay-empty-spacer"
          }
        />
        <Footer>
          {p.has("snap") && (
            <Button
              id="snap-next"
              scale={scale}
              onClick={() => {
                setSnap(snap === 0.5 ? 1 : 0.5);
              }}
            >
              Change snap
            </Button>
          )}
          <Button
            scale={scale}
            onClick={() => {
              setCount((v) => v + 1);
            }}
          >
            Save
          </Button>
          <Close>Cancel</Close>
        </Footer>
      </>
    );
  }

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
                    onSnapPointChange: setSnap,
                    snapPoint: snap,
                    snapPoints: [0.25, 0.5, 1],
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
          render={
            p.has("asChild") ? (
              // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- Trigger supplies the existing accessible name through its real children or labeling props; retain this empty render receiver to test that forwarding contract.
              <button type="button" />
            ) : undefined
          }
          disabled={p.has("disabled")}
        >
          Open panel
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
                "aria-describedby": undefined,
                "aria-label": "Native surface",
                "data-subject": "true",
                id: "subject",
              }
            : {})}
        >
          {selectedFixtureBranch1}
        </Content>
      </Root>
      <button
        type="button"
        id="external"
        onClick={() => {
          setOpen((v) => !v);
        }}
      >
        External toggle
      </button>
      <button
        type="button"
        id="read-ref"
        onClick={() => {
          setTag(ref.current?.tagName ?? "");
        }}
      >
        Read ref
      </button>
      <output id="ref-tag">{tag}</output>
      <output id="count">{count}</output>
      <output id="snap">{snap}</output>
      <output id="drags">{drags}</output>
      <output id="releases">{releases}</output>
    </>
  );
};
