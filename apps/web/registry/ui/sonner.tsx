"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Toaster as Sonner } from "sonner";

export { toast } from "sonner";

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

interface ActionModel {
  node: HTMLButtonElement;
  label: string;
  index: number;
  count: number;
}

interface Model {
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

type ToasterProps = Omit<SonnerProps, "richColors" | "expand"> & {
  richColors?: false;
  expand?: true;
  scale?: 1 | 2 | 3;
  ref?: React.Ref<HTMLElement>;
};

const ActionGraphic = function ActionGraphic({
  action,
  model,
  scale,
}: {
  action: ActionModel;
  model: Model;
  scale: 1 | 2 | 3;
}) {
  const [fontReady, setFontReady] = React.useState(false);
  React.useLayoutEffect(() => {
    let live = true;
    void loadUnihex().then(() => {
      if (live) {
        setFontReady(true);
      }
    });

    return () => {
      live = false;
    };
  }, []);
  React.useLayoutEffect(() => {
    const available = Math.max(
      20,
      (model.width - 30 - 6 * (action.count - 1)) / action.count
    );

    const natural = Math.max(
      20,
      Array.from(action.label).reduce(
        (n, char) =>
          n +
          (minecraftGlyphs[char.codePointAt(0)! - 32]?.[2] ??
            getUnihexGlyph(char)?.advance ??
            6),
        0
      ) + 12
    );

    const width = Math.min(available, natural);

    Object.assign(action.node.style, {
      fontSize: "0",
      height: `${20 * scale}px`,
      left: `${(18 + action.index * (available + 6)) * scale}px`,
      padding: "0",
      position: "absolute",
      right: "auto",
      top: `${(model.height + 6) * scale}px`,
      width: `${width * scale}px`,
    });
  }, [action, model, scale, fontReady]);

  const inherited = Object.fromEntries(
    Array.from({ length: 9 }, (_, i) => [`--mc-piece-${i}`, "inherit"])
  );

  return (
    <Button
      render={<span aria-hidden="true" />}
      scale={scale}
      disabled={action.node.disabled}
      data-mc-sonner-button-art=""
      style={
        {
          ...inherited,
          "--mc-ink": "inherit",
          "--mc-shadow": "inherit",
          height: "100%",
          inset: 0,
          pointerEvents: "none",
          position: "absolute",
          width: "100%",
        } as React.CSSProperties
      }
    >
      {action.label}
    </Button>
  );
};

const ModelGraphic = function ModelGraphic({
  model,
  scale,
}: {
  model: Model;
  scale: 1 | 2 | 3;
}) {
  const [height, setHeight] = React.useState(model.height);

  const update = React.useCallback(
    (width: number, graphicHeight: number) => {
      model.width = width;
      model.height = graphicHeight;
      setHeight(graphicHeight);

      if (model.node.isConnected) {
        const actions = model.node.querySelector(
          "[data-button],[data-close-button]"
        );

        const total = graphicHeight + (actions ? 26 : 0);

        model.node.style.width = `${width * scale}px`;
        model.node.style.height = `${total * scale}px`;
        model.node.style.setProperty(
          "--mc-toast-height",
          String(graphicHeight)
        );
        model.bounds = model.node.getBoundingClientRect();
        model.geometryChanged?.();
      }
    },
    [model, scale]
  );

  return (
    <span
      data-mc-sonner-art=""
      style={{
        display: "block",
        height: model.rich ? "100%" : height * scale,
        left: 0,
        pointerEvents: "none",
        position: model.rich ? "absolute" : "relative",
        top: 0,
        width: "100%",
        zIndex: -1,
      }}
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

const Toaster = function Toaster({
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
}: ToasterProps) {
  if (richColors || !expand) {
    throw Error(
      "Minecraft notifications support the native palette and expanded stack only"
    );
  }

  const [host, setHost] = React.useState<HTMLElement | null>(null);
  const [models, setModels] = React.useState<Model[]>([]);
  const sequence = React.useRef(0);
  const entriesRef = React.useRef(new Map<HTMLElement, Model>());

  React.useImperativeHandle(ref, () => host!, [host]);
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
  React.useLayoutEffect(() => {
    if (!host) {
      return;
    }

    const entries = entriesRef.current;

    const relayout = () => {
      for (const list of host.querySelectorAll<HTMLElement>(
        "[data-sonner-toaster]"
      )) {
        let stackOffset = 0;

        const nodes = [
          ...list.querySelectorAll<HTMLElement>("[data-sonner-toast]"),
        ].sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index));

        for (const node of nodes) {
          const model = entries.get(node);

          if (!model) {
            continue;
          }

          node.style.setProperty("--mc-native-offset", `${stackOffset}px`);

          const actions = node.querySelector(
            "[data-button],[data-close-button]"
          );

          stackOffset +=
            (model.rich
              ? node.offsetHeight
              : (model.height + (actions ? 26 : 0)) * scale) + gap;
          model.bounds = node.getBoundingClientRect();
        }
      }
    };

    const remove = (model: Model) => {
      entries.delete(model.node);
      setModels([...entries.values()]);
    };

    const beginExit = (model: Model) => {
      if (model.removedAt != null) {
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

          model = {
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
          };
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
            .filter(
              (n) =>
                !(
                  n instanceof HTMLElement &&
                  Object.hasOwn(n.dataset, "mcSonnerButtonArt")
                )
            )
            .map((n) => n.textContent ?? "")
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
      setModels([...entries.values()]);
    };

    const observer = new MutationObserver((records) => {
      const relevant = records.some((record) => {
        const target =
          record.target.nodeType === Node.ELEMENT_NODE
            ? (record.target as HTMLElement)
            : record.target.parentElement;

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
        style={minecraftStyle(
          style,
          (__style) =>
            ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
        )}
        toastOptions={{ ...toastOptions, unstyled: true }}
        {...props}
      />
      {models.map((model) =>
        model.ghost ? (
          <div
            key={model.key}
            aria-hidden="true"
            data-mc-sonner-ghost=""
            style={{
              height: model.bounds.height,
              isolation: "isolate",
              left: model.bounds.x,
              pointerEvents: "none",
              position: "fixed",
              top: model.bounds.y,
              width: model.bounds.width,
              zIndex: 999999999,
            }}
          >
            <ModelGraphic model={model} scale={scale} />
          </div>
        ) : (
          <React.Fragment key={model.key}>
            {createPortal(
              <ModelGraphic model={model} scale={scale} />,
              model.node,
              String(model.key)
            )}
            {model.buttons
              .filter((a) => a.node.isConnected)
              .map((action) =>
                createPortal(
                  <ActionGraphic action={action} model={model} scale={scale} />,
                  action.node,
                  `${model.key}-action-${action.index}`
                )
              )}
          </React.Fragment>
        )
      )}
    </>
  );
};

export type { ToasterProps };

export { Toaster };
