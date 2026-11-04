"use client";

import { useRender } from "@base-ui/react/use-render";
import * as React from "react";

import { minecraftChatAtlas } from "./minecraft-chat-atlas";
import { MinecraftColorUnicodeLabel } from "./minecraft-color-unicode";
import { minecraftClasses as cn } from "./minecraft-render";
import { loadUnihex } from "./minecraft-unifont";

import "./minecraft-unifont-metrics.css";
import "./minecraft-selectable-text.css";

interface NativeTextLayoutStyle extends React.CSSProperties {
  "--mc-selectable-text-left"?: string;
  "--mc-selectable-text-top"?: string;
}

interface Run {
  text: string;
  x: number;
  y: number;
}

const MinecraftSelectableText = ({
  text,
  className,
  ref,
  ...props
}: React.ComponentProps<"span"> & {
  text: string;
}) => {
  const root = React.useRef<HTMLSpanElement>(null);
  const raw = React.useRef<HTMLSpanElement>(null);
  const [runs, setRuns] = React.useState<Run[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useLayoutEffect(() => {
    // SAFETY: React attaches this private, unkeyed <span> before effect setup. The ref has one intrinsic attachment and no other writer; existing cleanup guards or cancels every deferred use.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The owned intrinsic commit and existing effect lifetime prove this exact HTMLSpanElement capture.
    const value = raw.current as HTMLSpanElement;

    // SAFETY: useRender composes this private ref with the public ref on the same unkeyed span. Its node identity stays fixed for this effect; alive guards and RAF/ResizeObserver cleanup bound deferred measurements.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The composed intrinsic commit proves this exact HTMLSpanElement capture.
    const element = root.current as HTMLSpanElement;

    let alive = true;
    let fontReady = false;
    let frame = 0;

    setReady(false);

    const measure = () => {
      if (!fontReady) {
        return;
      }

      const node = value.firstChild;

      if (!node || node.nodeType !== Node.TEXT_NODE) {
        return;
      }

      const bounds = element.getBoundingClientRect();

      const scale =
        Number(getComputedStyle(element).getPropertyValue("--mc-scale")) || 2;

      const range = document.createRange();
      const next: Run[] = [];

      let offset = 0;
      let previousRight = Number.NaN;

      for (const char of text) {
        range.setStart(node, offset);
        offset += char.length;
        range.setEnd(node, offset);

        if (char === "\n" || char === "\t") {
          previousRight = Number.NaN;
          continue;
        }

        const box = range.getBoundingClientRect();
        const x = box.x - bounds.x;
        const y = Math.floor((box.y - bounds.y) / (9 * scale)) * (9 * scale);
        const last = next.at(-1);

        if (
          last &&
          Math.abs(last.y - y) < 0.1 &&
          Math.abs(x - previousRight) < 0.1
        ) {
          last.text += char;
        } else {
          next.push({ text: char, x, y });
        }

        previousRight = box.right - bounds.x;
      }

      setRuns(next);
      setReady(true);
    };

    const glyphResources = Promise.all([document.fonts.ready, loadUnihex()]);

    const paintAfterGlyphResources = async () => {
      await glyphResources;

      if (alive) {
        fontReady = true;
        measure();
        frame = requestAnimationFrame(measure);
      }
    };

    void paintAfterGlyphResources();

    const observer = new ResizeObserver(() => {
      if (alive) {
        measure();
      }
    });

    observer.observe(element);

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [text]);

  return useRender({
    defaultTagName: "span",
    ref: [root, ref ?? null],
    render: (
      <span
        data-mc-selectable-ready={ready ? "true" : "false"}
        className={cn(`mc-selectable-text`, className)}
        {...props}
      >
        <span ref={raw} className="mc-selectable-raw">
          {text}
        </span>
        <span aria-hidden="true" className="mc-selectable-pixels">
          {runs.map((run, index) => {
            const nativeTextLayout1: NativeTextLayoutStyle = {
              "--mc-selectable-text-left": `${run.x}px`,
              "--mc-selectable-text-top": `${run.y}px`,
            };

            return (
              <span
                key={index}
                className="mc-layout-minecraft-selectable-text-1 top-(--mc-selectable-text-top) left-(--mc-selectable-text-left)"
                style={nativeTextLayout1}
              >
                <MinecraftColorUnicodeLabel
                  text={run.text}
                  atlas={minecraftChatAtlas}
                />
              </span>
            );
          })}
        </span>
      </span>
    ),
  });
};

export { MinecraftSelectableText };
