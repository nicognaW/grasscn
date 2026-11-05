"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Toaster as Sonner } from "sonner";
import type { ToasterProps as SonnerProps } from "sonner";

import { Button, buttonVariants } from "./button";
import { minecraftGlyphs } from "./minecraft-font";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { playMinecraftClick } from "./minecraft-sound";
import { MinecraftToastBackdrop } from "./minecraft-toast-backdrop";
import { MinecraftToastGraphic } from "./minecraft-toast-graphic";
import type { ToastMotion } from "./minecraft-toast-graphic";
import { playMinecraftToastSound } from "./minecraft-toast-sound";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";

import "./minecraft-sonner.css";

const actionRender = <span aria-hidden="true" />;

interface OwnedSonnerStyle extends React.CSSProperties {
  "--mc-z-sonner-paint-1-height"?: string;
  "--mc-z-sonner-paint-1-position"?: string;
  "--mc-z-sonner-paint-1-z-index"?: number;
  "--mc-z-sonner-paint-2-height"?: string;
  "--mc-z-sonner-paint-2-left"?: string;
  "--mc-z-sonner-paint-2-top"?: string;
  "--mc-z-sonner-paint-2-width"?: string;
}

export { toast } from "sonner";

interface SonnerScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

interface ActionModel {
  node: HTMLButtonElement;
  label: string;
  index: number;
  count: number;
}

interface Model {
  applyMeasurements: (
    width: number,
    graphicHeight: number,
    scale: 1 | 2 | 3,
    commitHeight: (height: number) => void
  ) => void;
  readDimensions: () => { height: number; width: number };
  key: number;
  node: HTMLElement;
  title: string;
  message: string | null;
  rich: boolean;
  motion: React.RefObject<ToastMotion>;
  removedAt?: number;
  bounds: DOMRect;
  ghost: boolean;
  timer?: ReturnType<typeof setTimeout>;
  width: number;
  height: number;
  buttons: ActionModel[];
  geometryChanged?: () => void;
}

interface ToastPresentation extends Readonly<
  Pick<
    Model,
    | "applyMeasurements"
    | "bounds"
    | "buttons"
    | "ghost"
    | "key"
    | "message"
    | "motion"
    | "node"
    | "readDimensions"
    | "rich"
    | "title"
  >
> {
  readonly initialHeight: number;
}

/** Mutable toast geometry belongs to this imperative adapter, not React props. */
const createToastModel = function createToastModel(
  initial: Omit<Model, "applyMeasurements" | "readDimensions">
): Model {
  const model: Model = {
    ...initial,
    applyMeasurements(width, graphicHeight, scale, commitHeight) {
      model.width = width;
      model.height = graphicHeight;
      commitHeight(graphicHeight);

      if (model.node.isConnected) {
        const actions = model.node.querySelector(
          "[data-button],[data-close-button]"
        );

        const total = graphicHeight + (actions ? 26 : 0);

        model.node.style.setProperty("width", `${width * scale}px`);
        model.node.style.setProperty("height", `${total * scale}px`);
        model.node.style.setProperty(
          "--mc-toast-height",
          String(graphicHeight)
        );
        model.bounds = model.node.getBoundingClientRect();
        model.geometryChanged?.();
      }
    },
    readDimensions() {
      return { height: model.height, width: model.width };
    },
  };

  return model;
};

/** Snapshot presentation fields while retaining stable imperative capabilities. */
const presentToastModel = function presentToastModel(
  model: Model
): ToastPresentation {
  return {
    applyMeasurements: model.applyMeasurements,
    bounds: model.bounds,
    buttons: model.buttons,
    ghost: model.ghost,
    initialHeight: model.height,
    key: model.key,
    message: model.message,
    motion: model.motion,
    node: model.node,
    readDimensions: model.readDimensions,
    rich: model.rich,
    title: model.title,
  };
};

type ToasterProps = Omit<SonnerProps, "richColors" | "expand"> & {
  richColors?: false;
  expand?: true;
  scale?: 1 | 2 | 3;
  ref?: React.Ref<HTMLElement>;
};

const ActionGraphic = ({
  action,
  model,
  scale,
}: {
  action: ActionModel;
  model: ToastPresentation;
  scale: 1 | 2 | 3;
}) => {
  const [fontReady, setFontReady] = React.useState(false);
  React.useLayoutEffect(() => {
    let live = true;
    const fontLoading = loadUnihex();

    const commitFontReadiness = async () => {
      await fontLoading;

      if (live) {
        setFontReady(true);
      }
    };

    void commitFontReadiness();

    return () => {
      live = false;
    };
  }, []);
  React.useLayoutEffect(() => {
    const dimensions = model.readDimensions();

    const available = Math.max(
      20,
      (dimensions.width - 30 - 6 * (action.count - 1)) / action.count
    );

    const natural = Math.max(
      20,
      Array.from(
        action.label,
        (char) =>
          minecraftGlyphs[
            // SAFETY: String Array.from iteration supplies a nonempty character. Its first code point therefore exists.
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The verified glyph-character producer proves this specific codePointAt(0) result.
            (char.codePointAt(0) as number) - 32
          ]?.[2] ??
          getUnihexGlyph(char)?.advance ??
          6
      ).reduce((width, advance) => width + advance, 0) + 12
    );

    const width = Math.min(available, natural);

    Object.assign(action.node.style, {
      fontSize: "0",
      height: `${20 * scale}px`,
      left: `${(18 + action.index * (available + 6)) * scale}px`,
      padding: "0",
      position: "absolute",
      right: "auto",
      top: `${(dimensions.height + 6) * scale}px`,
      width: `${width * scale}px`,
    });
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- Font readiness changes glyph advances outside the model; rerun action geometry when that resource becomes ready.
  }, [action, model, scale, fontReady]);

  const actionDisabled = action.node.disabled;

  return (
    <Button
      render={actionRender}
      scale={scale}
      disabled={actionDisabled}
      data-mc-sonner-button-art=""
      className="mc-sonner-action-paint"
    >
      {action.label}
    </Button>
  );
};

const ModelGraphic = ({
  model,
  scale,
}: {
  model: ToastPresentation;
  scale: 1 | 2 | 3;
}) => {
  const { applyMeasurements } = model;
  const [height, setHeight] = React.useState(model.initialHeight);

  const update = React.useCallback(
    (width: number, graphicHeight: number) => {
      applyMeasurements(width, graphicHeight, scale, setHeight);
    },
    [applyMeasurements, scale]
  );

  const ownedStyle1: OwnedSonnerStyle = {
    "--mc-z-sonner-paint-1-height": model.rich ? "100%" : `${height * scale}px`,
    "--mc-z-sonner-paint-1-position": model.rich ? "absolute" : "relative",
    "--mc-z-sonner-paint-1-z-index": -1,
  };

  return (
    <span
      data-mc-sonner-art=""
      className="mc-owned-paint-sonner-1"
      style={ownedStyle1}
    >
      {model.rich ? (
        <MinecraftToastBackdrop scale={scale} motion={model.motion} />
      ) : (
        <MinecraftToastGraphic
          title={model.title}
          message={model.message}
          scale={scale}
          motion={model.motion}
          onLayout={update}
        />
      )}
    </span>
  );
};

const layoutToastStack = function layoutToastStack(
  host: HTMLElement,
  entries: Map<HTMLElement, Model>,
  scale: number,
  gap: number
) {
  for (const list of host.querySelectorAll<HTMLElement>(
    "[data-sonner-toaster]"
  )) {
    let stackOffset = 0;

    const nodes = [
      ...list.querySelectorAll<HTMLElement>("[data-sonner-toast]"),
    ];

    nodes.sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index));

    for (const node of nodes) {
      const model = entries.get(node);

      if (!model) {
        continue;
      }

      node.style.setProperty("--mc-native-offset", `${stackOffset}px`);

      const actions = node.querySelector("[data-button],[data-close-button]");

      stackOffset +=
        (model.rich
          ? node.offsetHeight
          : (model.height + (actions ? 26 : 0)) * scale) + gap;
      model.bounds = node.getBoundingClientRect();
    }
  }
};

const Toaster = ({
  scale = 2,
  richColors = false,
  expand = true,
  position = "top-right",
  offset = 0,
  gap = 0,
  visibleToasts = 5,
  className,
  style,
  toastOptions,
  ref,
  ...props
}: ToasterProps) => {
  if (richColors || !expand) {
    throw new Error(
      "Minecraft notifications support the native palette and expanded stack only"
    );
  }

  const [host, setHost] = React.useState<HTMLElement | null>(null);
  const [models, setModels] = React.useState<ToastPresentation[]>([]);
  const sequence = React.useRef(0);
  const entriesRef = React.useRef(new Map<HTMLElement, Model>());

  React.useImperativeHandle<typeof host, typeof host>(ref, () => host, [host]);
  React.useLayoutEffect(
    () => () => {
      for (const model of entriesRef.current.values()) {
        if (model.timer) {
          clearTimeout(model.timer);
        }
      }

      entriesRef.current.clear();
    },
    []
  );
  React.useLayoutEffect((): (() => void) | undefined => {
    if (!host) {
      return undefined;
    }

    const entries = entriesRef.current;

    const relayout = () => {
      layoutToastStack(host, entries, scale, gap);
    };

    const remove = (model: Model) => {
      entries.delete(model.node);
      setModels([...entries.values()].map(presentToastModel));
    };

    const beginExit = (model: Model) => {
      if (model.removedAt !== undefined) {
        return;
      }

      model.removedAt = Date.now();
      model.motion.current = { phase: "exiting", start: model.removedAt };
      model.node.inert = true;
      const rect = model.node.getBoundingClientRect();

      if (rect.width) {
        model.bounds = rect;
      }

      playMinecraftToastSound("out");
      model.timer = setTimeout(() => {
        remove(model);
      }, 600);
    };

    const scan = () => {
      for (const node of host.querySelectorAll<HTMLElement>(
        "[data-sonner-toast]"
      )) {
        const title = node.querySelector<HTMLElement>("[data-title]");

        const description =
          node.querySelector<HTMLElement>("[data-description]");

        const rich = !!(
          title?.childElementCount ??
          description?.childElementCount ??
          0
        );

        let model = entries.get(node);

        if (!model) {
          const toastBounds = node.getBoundingClientRect();
          const toastKey = sequence.current;
          sequence.current = toastKey + 1;

          model = createToastModel({
            bounds: toastBounds,
            buttons: [],
            ghost: false,
            height: 32,
            key: toastKey,
            message: description?.textContent ?? null,
            motion: { current: { phase: "entering", start: Date.now() } },
            node,
            rich,
            title: title?.textContent ?? "",
            width: 190,
          });
          entries.set(node, model);
          playMinecraftToastSound("in");
        }

        model.title = title?.textContent ?? "";
        model.message = description?.textContent ?? null;
        model.rich = rich;
        model.geometryChanged = relayout;
        node.dataset.mcScale = String(scale);
        node.style.setProperty("--mc-scale", String(scale));
        node.dataset.mcToastRich = String(rich);

        const buttons = [
          ...node.querySelectorAll<HTMLButtonElement>(
            "button[data-button],button[data-close-button]"
          ),
        ];

        model.buttons = buttons.map((button, index) => {
          button.classList.add(...buttonVariants().split(" "));

          const text = [...button.childNodes]
            .flatMap((child) =>
              child instanceof HTMLElement &&
              Object.hasOwn(child.dataset, "mcSonnerButtonArt")
                ? []
                : (child.textContent ?? "")
            )
            .join("");

          return {
            count: buttons.length,
            index,
            label: text || "Done",
            node: button,
          };
        });

        if (node.dataset.removed === "true") {
          beginExit(model);
        }
      }

      for (const model of entries.values()) {
        if (!model.node.isConnected) {
          beginExit(model);
          model.ghost = true;
        }
      }

      relayout();
      setModels([...entries.values()].map(presentToastModel));
    };

    const observer = new MutationObserver((records) => {
      const relevant = records.some((record) => {
        // SAFETY: MutationObserver supplies genuine DOM Nodes; the existing ELEMENT_NODE check proves Element (including SVG), and this branch uses only closest().
        /* oxlint-disable typescript/no-unsafe-type-assertion -- The browser-owned MutationRecord and existing nodeType discriminator prove this exact Element projection. */
        const target =
          record.target.nodeType === Node.ELEMENT_NODE
            ? (record.target as Element)
            : record.target.parentElement;
        /* oxlint-enable typescript/no-unsafe-type-assertion */

        if (
          target?.closest("[data-mc-sonner-art],[data-mc-sonner-button-art]")
        ) {
          return false;
        }

        if (record.type === "attributes") {
          return record.attributeName === "data-removed";
        }

        if (record.type === "characterData") {
          return true;
        }

        return [...record.addedNodes, ...record.removedNodes].some(
          (node) =>
            !(
              node instanceof HTMLElement &&
              (Object.hasOwn(node.dataset, "mcSonnerArt") ||
                Object.hasOwn(node.dataset, "mcSonnerButtonArt"))
            )
        );
      });

      if (relevant) {
        scan();
      }
    });

    observer.observe(host, {
      attributeFilter: ["data-removed"],
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
    scan();

    const click = (event: MouseEvent) => {
      const button = (event.target as Element)?.closest<HTMLButtonElement>(
        "button[data-button],button[data-close-button]"
      );

      if (button && !button.disabled) {
        queueMicrotask(() => {
          if (!event.defaultPrevented) {
            playMinecraftClick();
          }
        });
      }
    };

    host.addEventListener("click", click);

    return () => {
      observer.disconnect();
      host.removeEventListener("click", click);
    };
  }, [host, scale, gap]);

  return (
    <>
      <Sonner
        ref={setHost}
        className={cn(`mc-sonner`, className)}
        position={position}
        offset={offset}
        gap={gap}
        visibleToasts={visibleToasts}
        expand={expand}
        richColors={false}
        style={minecraftStyle(style, (__style): SonnerScaleStyle => ({
          "--mc-scale": scale,
          ...__style,
        }))}
        toastOptions={{ ...toastOptions, unstyled: true }}
        {...props}
      />
      {models.map((model) => {
        if (model.ghost) {
          const ownedStyle2: OwnedSonnerStyle = {
            "--mc-z-sonner-paint-2-height": `${model.bounds.height}px`,
            "--mc-z-sonner-paint-2-left": `${model.bounds.x}px`,
            "--mc-z-sonner-paint-2-top": `${model.bounds.y}px`,
            "--mc-z-sonner-paint-2-width": `${model.bounds.width}px`,
          };

          return (
            <div
              key={model.key}
              aria-hidden="true"
              data-mc-sonner-ghost=""
              className="mc-owned-paint-sonner-2 pointer-events-none fixed [isolation:isolate] z-999999999"
              style={ownedStyle2}
            >
              <ModelGraphic model={model} scale={scale} />
            </div>
          );
        }

        return (
          <React.Fragment key={model.key}>
            {createPortal(
              <ModelGraphic model={model} scale={scale} />,
              model.node,
              String(model.key)
            )}
            {model.buttons.flatMap((action) =>
              action.node.isConnected
                ? createPortal(
                    <ActionGraphic
                      action={action}
                      model={model}
                      scale={scale}
                    />,
                    action.node,
                    `${model.key}-action-${action.index}`
                  )
                : []
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

export type { ToasterProps };

export { Toaster };
