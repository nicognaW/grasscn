"use client";

import { useEffect } from "react";

/** Recolour the existing game pixels; selected browser-font text stays transparent. */
export const DocumentSelection = () => {
  useEffect(() => {
    const marked = new Set<HTMLElement>();

    const canvases = new Map<
      HTMLCanvasElement,
      { mask: string; overlay: HTMLCanvasElement }
    >();

    let frame = 0;

    const clear = () => {
      for (const element of marked) {
        delete element.dataset.documentSelected;
      }

      marked.clear();

      for (const [canvas, saved] of canvases) {
        canvas.style.maskImage = saved.mask;
        saved.overlay.remove();
      }

      canvases.clear();
    };

    const mark = (element: HTMLElement) => {
      element.dataset.documentSelected = "";
      marked.add(element);
    };

    const paintCanvas = (raw: HTMLElement, start: number, end: number) => {
      const canvas =
        raw.parentElement?.querySelector<HTMLCanvasElement>(":scope > canvas");

      if (!canvas || raw.parentElement?.dataset.mcLabelReady !== "true") {
        return;
      }

      const context = canvas.getContext("2d");
      const node = raw.firstChild;
      const bounds = canvas.getBoundingClientRect();

      if (!context || !node || !bounds.width) {
        return;
      }

      const selected = document.createRange();
      selected.setStart(node, start);
      selected.setEnd(node, end);
      const rect = selected.getBoundingClientRect();
      const left = Math.max(0, rect.left - bounds.left);
      const right = Math.min(bounds.width, rect.right - bounds.left);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      // Label canvases contain grayscale ink and its darker shadow; select only the ink.
      let ink = 0;

      for (let index = 0; index < pixels.data.length; index += 4) {
        if (pixels.data[index + 3]) {
          ink = Math.max(ink, pixels.data[index]);
        }
      }

      const from = Math.round((left * canvas.width) / bounds.width);
      const to = Math.round((right * canvas.width) / bounds.width);

      for (let index = 0; index < pixels.data.length; index += 4) {
        const x = (index / 4) % canvas.width;

        if (x >= from && x < to && pixels.data[index] === ink) {
          pixels.data[index] = 0;
          pixels.data[index + 1] = 0;
          pixels.data[index + 2] = 255;
        } else {
          pixels.data[index + 3] = 0;
        }
      }

      const overlay = document.createElement("canvas");
      overlay.width = canvas.width;
      overlay.height = canvas.height;
      overlay.style.cssText = canvas.style.cssText;
      overlay.setAttribute("aria-hidden", "true");
      overlay.dataset.documentSelection = "";
      overlay.getContext("2d")?.putImageData(pixels, 0, 0);
      canvases.set(canvas, { mask: canvas.style.maskImage, overlay });
      canvas.style.maskImage = `linear-gradient(to right, #000 ${left}px, transparent ${left}px, transparent ${right}px, #000 ${right}px)`;
      canvas.after(overlay);
    };

    const update = () => {
      clear();
      const selection = window.getSelection();

      if (!selection || selection.isCollapsed || !selection.rangeCount) {
        return;
      }

      const range = selection.getRangeAt(0);

      for (const raw of document.querySelectorAll<HTMLElement>(
        ".document-text .mc-text-accessible"
      )) {
        const node = raw.firstChild;

        if (
          !node ||
          node.nodeType !== Node.TEXT_NODE ||
          !range.intersectsNode(node)
        ) {
          continue;
        }

        if (getComputedStyle(raw).userSelect === "none") {
          continue;
        }

        const start = range.startContainer === node ? range.startOffset : 0;

        const end =
          range.endContainer === node
            ? range.endOffset
            : (node.textContent?.length ?? 0);

        if (start === end) {
          continue;
        }

        const layer = raw.parentElement?.querySelector<HTMLElement>(
          ":scope > .mc-text-pixels"
        );

        if (layer) {
          mark(layer);
          const glyphs = layer.querySelectorAll<HTMLElement>(".mc-glyph");

          for (
            let index = start;
            index < Math.min(end, glyphs.length);
            index += 1
          ) {
            mark(glyphs[index]);
          }
        } else {
          paintCanvas(raw, start, end);
        }
      }
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      attributeFilter: ["data-mc-label-ready"],
      attributes: true,
      subtree: true,
    });
    document.addEventListener("selectionchange", update);
    document.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    update();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("selectionchange", update);
      document.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      clear();
    };
  }, []);

  return null;
};
