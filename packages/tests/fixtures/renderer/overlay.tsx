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

// Navigation owns this immutable fixture query; state updates keep the same document.
const p = new URLSearchParams(location.search);

export const OverlayFixture = () => {
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

  const resolveOverlayParts = () => {
    const engineRoot = isDrawer ? Drawer.Drawer : Sheet.Sheet;
    const engineTrigger = isDrawer ? Drawer.DrawerTrigger : Sheet.SheetTrigger;
    const engineContent = isDrawer ? Drawer.DrawerContent : Sheet.SheetContent;
    const engineClose = isDrawer ? Drawer.DrawerClose : Sheet.SheetClose;
    const engineHeader = isDrawer ? Drawer.DrawerHeader : Sheet.SheetHeader;
    const engineFooter = isDrawer ? Drawer.DrawerFooter : Sheet.SheetFooter;
    const engineTitle = isDrawer ? Drawer.DrawerTitle : Sheet.SheetTitle;

    const engineDescription = isDrawer
      ? Drawer.DrawerDescription
      : Sheet.SheetDescription;

    return {
      Close: engineClose,
      Content: engineContent,
      Description: engineDescription,
      Footer: engineFooter,
      Header: engineHeader,
      Root: engineRoot,
      Title: engineTitle,
      Trigger: engineTrigger,
    };
  };

  const { Close, Content, Description, Footer, Header, Root, Title, Trigger } =
    resolveOverlayParts();

  interface OverlayTextProbeProps {
    align?: string;
    "data-subject"?: "true";
    id?: string;
    maxWidth?: number;
    scale?: typeof scale;
    style?: React.CSSProperties;
  }

  const readOverlayTextProbeProps = () => {
    const probeProps: OverlayTextProbeProps = {};

    if (native && part !== "surface") {
      probeProps.id = "subject";
      probeProps.scale = scale;
      probeProps.style = {
        height: height * scale,
        left: x,
        position: "fixed",
        top: y,
        width: width * scale,
      } satisfies React.CSSProperties;

      if (p.has("wrapWidth")) {
        probeProps.maxWidth = Number(p.get("wrapWidth"));
      }

      probeProps.align = p.get("align") ?? "left";
      probeProps["data-subject"] = "true";
    }

    return probeProps;
  };

  const textProps = readOverlayTextProbeProps();

  const renderOverlayContents = () => {
    let panelBody: ReactNode;

    if (native && part === "surface") {
      panelBody = p.has("text") ? (
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
      panelBody = native ? (
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

    return panelBody;
  };

  const selectedFixtureBranch1 = renderOverlayContents();

  const readDrawerFixtureOptions = () => {
    const drawerConfiguration: Pick<
      React.ComponentProps<typeof Drawer.Drawer>,
      "swipeDirection" | "snapPoints" | "snapPoint" | "onSnapPointChange"
    > = {};

    if (isDrawer) {
      let swipeDirection: NonNullable<
        React.ComponentProps<typeof Drawer.Drawer>["swipeDirection"]
      >;

      if (side === "bottom") {
        swipeDirection = "down" as const;
      } else {
        swipeDirection = side === "top" ? ("up" as const) : side;
      }

      drawerConfiguration.swipeDirection = swipeDirection;

      if (p.has("snap")) {
        drawerConfiguration.onSnapPointChange = setSnap;
        drawerConfiguration.snapPoint = snap;
        drawerConfiguration.snapPoints = [0.25, 0.5, 1];
      }
    }

    return drawerConfiguration;
  };

  const drawerOptions = readDrawerFixtureOptions();

  const readOverlayContentStyle = () => {
    const panelStyleOptions: Pick<
      React.ComponentProps<typeof Content>,
      "style"
    > = {};

    if (native) {
      panelStyleOptions.style = geom;
    } else if (p.has("snap")) {
      panelStyleOptions.style = { height: "100dvh" };
    }

    return panelStyleOptions;
  };

  const contentStyleOptions = readOverlayContentStyle();

  return (
    <>
      <Root
        scale={scale}
        {...drawerOptions}
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
          {...contentStyleOptions}
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
