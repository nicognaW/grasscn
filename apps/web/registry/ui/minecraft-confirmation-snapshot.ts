import * as React from "react";

import { createConfirmationPainter } from "./minecraft-confirmation-gpu";

export function useConfirmationSnapshot(
  canvas: React.RefObject<HTMLCanvasElement | null>,
  identity: string,
  radius: number
) {
  const [ready, setReady] = React.useState(false);
  React.useLayoutEffect((): ReturnType<React.EffectCallback> => {
    const node = canvas.current!;
    const host = node.parentElement!;

    let busy = false;
    let disposed = false;
    let frames = 0;
    let queued = false;
    let timer = 0;
    let version = 0;

    setReady(false);
    host.dataset.mcConfirmationGpuReady = "false";

    if (radius <= 0) {
      host.dataset.mcConfirmationGpuReady = "true";

      return;
    }

    const painter = createConfirmationPainter(node);

    if (!painter) {
      return;
    }

    const belongs = (target: Node) => {
      const element = target instanceof Element ? target : target.parentElement;

      return (
        element?.closest<HTMLElement>("[data-mc-confirmation-id]")?.dataset
          .mcConfirmationId === identity
      );
    };

    const sandbox = (target: Node) =>
      target instanceof HTMLIFrameElement &&
      target.id.startsWith("__SANDBOX__") &&
      target.width === "0" &&
      target.height === "0" &&
      target.style.visibility === "hidden";

    const capture = async () => {
      if (disposed || !Object.hasOwn(host.dataset, "open")) {
        return;
      }

      if (busy) {
        queued = true;

        return;
      }

      busy = true;
      queued = false;
      const capturedVersion = version;

      const fixed: {
        element: HTMLElement;
        previous: string | null;
        key: string;
        insets: Record<"top" | "right" | "bottom" | "left", string>;
        transform: string;
        layoutLeft: number;
        layoutTop: number;
      }[] = [];

      try {
        const { domToCanvas } = await import("modern-screenshot");
        await document.fonts.ready;

        if (disposed || !Object.hasOwn(host.dataset, "open")) {
          return;
        }

        const rootColor = getComputedStyle(
          document.documentElement
        ).backgroundColor;

        const bodyColor = getComputedStyle(document.body).backgroundColor;

        const opaque = (value: string) =>
          value !== "transparent" && !/rgba\([^)]*,\s*0\s*\)/u.test(value);

        const offsetX = scrollX;
        const offsetY = scrollY;
        const ratio = devicePixelRatio;
        const bodyStyle = getComputedStyle(document.body);

        if (offsetX || offsetY) {
          for (const element of document.body.querySelectorAll<HTMLElement>(
            "*"
          )) {
            if (
              !(element instanceof HTMLElement) ||
              belongs(element) ||
              getComputedStyle(element).position !== "fixed"
            ) {
              continue;
            }

            let viewport = true;

            for (
              let parent = element.parentElement;
              parent;
              parent = parent.parentElement
            ) {
              const style = getComputedStyle(parent);

              if (
                style.transform !== "none" ||
                style.perspective !== "none" ||
                style.filter !== "none" ||
                style.backdropFilter !== "none" ||
                /paint|layout|strict|content/u.test(style.contain)
              ) {
                viewport = false;
                break;
              }
            }

            if (viewport) {
              const previous = element.dataset.mcSnapshotFixed ?? null;
              const key = `${identity}-${fixed.length}`;
              const style = getComputedStyle(element);

              fixed.push({
                element,
                insets: {
                  bottom: style.bottom,
                  left: style.left,
                  right: style.right,
                  top: style.top,
                },
                key,
                layoutLeft:
                  element.offsetLeft - (parseFloat(style.marginLeft) || 0),
                layoutTop:
                  element.offsetTop - (parseFloat(style.marginTop) || 0),
                previous,
                transform: style.transform,
              });
              element.dataset.mcSnapshotFixed = key;
            }
          }
        }

        const fixedRecords = new Map(fixed.map((item) => [item.key, item]));

        // Computed standard properties already resolve var() references, including
        // SVG, pseudo-element, mask, geometry and font styles. Copying inherited
        // texture variables into every clone duplicates megabytes of unused data.
        const includeStyleProperties = [
          ...getComputedStyle(document.documentElement),
        ].filter((property) => !property.startsWith("--"));

        // Preserve the used size/style of offscreen boxes, but avoid serializing
        // their descendants and bitmap/font resources. Ancestors of visible
        // fixed/overflow content stay intact; the guard retains blur/shadow edges.
        const visibleAncestors = new WeakSet<Node>();
        const pruned = new WeakSet<Node>();
        const guard = Math.max(64, radius * 6);

        const elements = [...document.body.querySelectorAll<HTMLElement>("*")];

        for (const element of elements) {
          if (belongs(element)) {
            continue;
          }

          const bounds = element.getBoundingClientRect();

          const generated = ["::before", "::after"].some((pseudo) => {
            const style = getComputedStyle(element, pseudo);

            return (
              style.content !== "none" &&
              style.content !== "normal" &&
              style.display !== "none"
            );
          });

          if (
            generated ||
            (bounds.width > 0 &&
              bounds.height > 0 &&
              bounds.right >= -guard &&
              bounds.left <= innerWidth + guard &&
              bounds.bottom >= -guard &&
              bounds.top <= innerHeight + guard)
          ) {
            for (
              let ancestor: Node | null = element;
              ancestor && !visibleAncestors.has(ancestor);
              ancestor = ancestor.parentNode
            ) {
              visibleAncestors.add(ancestor);
            }
          }
        }

        for (const element of elements) {
          if (
            visibleAncestors.has(element) ||
            belongs(element) ||
            !(element instanceof HTMLElement)
          ) {
            continue;
          }

          const bounds = element.getBoundingClientRect();
          const style = getComputedStyle(element);

          if (
            bounds.width > 0 &&
            bounds.height > 0 &&
            style.width.endsWith("px") &&
            style.height.endsWith("px")
          ) {
            pruned.add(element);
          }
        }

        const source = await domToCanvas(document.body, {
          backgroundColor: opaque(rootColor)
            ? rootColor
            : opaque(bodyColor)
              ? bodyColor
              : "#fff",
          features: { restoreScrollPosition: true },
          filter: (target) =>
            !belongs(target) &&
            !sandbox(target) &&
            !pruned.has(target.parentNode!),
          height: innerHeight,
          includeStyleProperties,
          onCloneEachNode: (cloned) => {
            if (!(cloned instanceof HTMLElement)) {
              return;
            }

            if (
              cloned instanceof HTMLTextAreaElement &&
              cloned.classList.contains("mc-textarea")
            ) {
              cloned.style.resize = "none";
            }
          },
          onCloneNode: (root) => {
            if (!(root instanceof HTMLElement)) {
              return;
            }

            for (const cloned of root.querySelectorAll<HTMLElement>(
              "[data-mc-snapshot-fixed]"
            )) {
              const fixedRecord = fixedRecords.get(
                cloned.dataset.mcSnapshotFixed ?? ""
              );

              if (fixedRecord) {
                // Inset offsets preserve viewport-fixed descendants. Adding a
                // transform here would instead create a new containing block.
                const { insets, layoutLeft, layoutTop } = fixedRecord;
                // The library may add scroll transforms after cloning a child.
                // Restore the original only after the entire tree is assembled.
                cloned.style.transform = fixedRecord.transform;

                for (const [near, far, delta, fallback] of [
                  ["left", "right", offsetX, layoutLeft],
                  ["top", "bottom", offsetY, layoutTop],
                ] as const) {
                  if (insets[near] !== "auto") {
                    cloned.style[near] = `calc(${insets[near]} + ${delta}px)`;
                  }

                  if (insets[far] !== "auto") {
                    cloned.style[far] = `calc(${insets[far]} - ${delta}px)`;
                  }

                  if (insets[near] === "auto" && insets[far] === "auto") {
                    cloned.style[near] = `${fallback + delta}px`;
                  }
                }

                delete cloned.dataset.mcSnapshotFixed;
              }
            }
          },
          onCreateForeignObjectSvg: (svg) => {
            const viewport = svg.querySelector("foreignObject");
            viewport?.setAttribute("x", String(-offsetX));
            viewport?.setAttribute("y", String(-offsetY));
            viewport?.setAttribute(
              "height",
              String(
                Math.max(
                  innerHeight,
                  document.documentElement.scrollHeight,
                  document.body.scrollHeight
                )
              )
            );
          },
          scale: ratio,
          style: {
            height: bodyStyle.height,
            margin: bodyStyle.margin,
            padding: bodyStyle.padding,
            width: bodyStyle.width,
          },
          width: innerWidth,
        });

        if (disposed || !Object.hasOwn(host.dataset, "open")) {
          return;
        }

        painter.paint(source, radius);
        host.dataset.mcConfirmationFrame = String((frames += 1));
        host.dataset.mcConfirmationGpuReady = String(
          capturedVersion === version
        );
        delete host.dataset.mcConfirmationGpuError;
        setReady(true);
      } catch (error) {
        if (!disposed) {
          host.dataset.mcConfirmationGpuError =
            error instanceof Error ? error.message : String(error);
        }
      } finally {
        for (const item of fixed) {
          if (item.element.dataset.mcSnapshotFixed !== item.key) {
            continue;
          }

          if (item.previous === null) {
            delete item.element.dataset.mcSnapshotFixed;
          } else {
            item.element.dataset.mcSnapshotFixed = item.previous;
          }
        }

        busy = false;

        if (queued && !disposed) {
          schedule();
        }
      }
    };

    const schedule = () => {
      clearTimeout(timer);

      if (!Object.hasOwn(host.dataset, "open")) {
        return;
      }

      version += 1;
      host.dataset.mcConfirmationGpuReady = "false";
      timer = window.setTimeout(() => {
        void capture();
      }, 100);
    };

    const mutations = new MutationObserver((records) => {
      if (
        records.some((record) => {
          if (belongs(record.target) || sandbox(record.target)) {
            return false;
          }

          const nodes = [...record.addedNodes, ...record.removedNodes];

          return (
            record.type !== "childList" ||
            !nodes.length ||
            !nodes.every(sandbox)
          );
        })
      ) {
        schedule();
      }
    });

    mutations.observe(document.body, {
      attributeFilter: [
        "class",
        "style",
        "src",
        "width",
        "height",
        "value",
        "checked",
        "disabled",
      ],
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
    mutations.observe(document.head, {
      characterData: true,
      childList: true,
      subtree: true,
    });
    mutations.observe(document.documentElement, {
      attributeFilter: ["class", "style"],
      attributes: true,
    });

    const visibility = new MutationObserver(() => {
      if (Object.hasOwn(host.dataset, "open")) {
        schedule();
      } else {
        version += 1;
        queued = false;
        clearTimeout(timer);
        setReady(false);
        host.dataset.mcConfirmationGpuReady = "false";
      }
    });

    visibility.observe(host, {
      attributeFilter: ["data-open"],
      attributes: true,
    });
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    document.fonts.addEventListener("loadingdone", schedule);
    // Let modal autofocus and hover leave the underlying controls first.
    timer = window.setTimeout(() => {
      void capture();
    }, 0);

    return () => {
      disposed = true;
      clearTimeout(timer);
      mutations.disconnect();
      visibility.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      document.fonts.removeEventListener("loadingdone", schedule);
      painter.dispose();
      delete host.dataset.mcConfirmationGpuReady;
      delete host.dataset.mcConfirmationGpuError;
      delete host.dataset.mcConfirmationFrame;
    };
  }, [canvas, identity, radius]);

  return ready;
}
