"use client";

import * as React from "react";

import { minecraftChatAtlas } from "./minecraft-chat-atlas";
import { MinecraftColorUnicodeLabel } from "./minecraft-color-unicode";
import { minecraftClasses as cn } from "./minecraft-render";
import { loadUnihex } from "./minecraft-unifont";

import "./minecraft-unifont-metrics.css";
import "./minecraft-selectable-text.css";

interface Run {
  text: string;
  x: number;
  y: number;
}

const MinecraftSelectableText = ({
  text,
  className,
  ...props
}: React.ComponentProps<"span"> & {
  text: string;
}) => {
  const root = React.useRef<HTMLSpanElement>(null);
  const raw = React.useRef<HTMLSpanElement>(null);
  const [runs, setRuns] = React.useState<Run[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useLayoutEffect(() => {
    let alive = true;
    let fontReady = false;
    let frame = 0;

    setReady(false);

    const measure = () => {
      if (!fontReady) {
        return;
      }

      const element = root.current!;
      const value = raw.current!;
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

    void Promise.all([document.fonts.ready, loadUnihex()]).then(() => {
      if (alive) {
        fontReady = true;
        measure();
        frame = requestAnimationFrame(measure);
      }
    });

    const observer = new ResizeObserver(() => {
      if (alive) {
        measure();
      }
    });

    observer.observe(root.current!);

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [text]);

  return (
    <span
      ref={root}
      data-mc-selectable-ready={ready ? "true" : "false"}
      className={cn(`mc-selectable-text`, className)}
      {...props}
    >
      <span ref={raw} className="mc-selectable-raw">
        {text}
      </span>
      <span aria-hidden="true" className="mc-selectable-pixels">
        {runs.map((run, index) => (
          <span
            key={index}
            style={{ left: run.x, position: "absolute", top: run.y }}
          >
            <MinecraftColorUnicodeLabel
              text={run.text}
              atlas={minecraftChatAtlas}
            />
          </span>
        ))}
      </span>
    </span>
  );
};

export { MinecraftSelectableText };
