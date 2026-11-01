"use client";

import { useLayoutEffect, useRef, useState, type ComponentProps } from "react";

import { TypographyP } from "../registry/ui/typography";
import { DocumentText } from "./document-text";

export function DocumentParagraph({ children, ...props }: ComponentProps<"p">) {
  const container = useRef<HTMLDivElement>(null);
  const [logicalWidth, setLogicalWidth] = useState<number>();
  useLayoutEffect(() => {
    const element = container.current!;
    const measure = () => setLogicalWidth(Math.floor(element.clientWidth / 2));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const plain = typeof children === "string" || typeof children === "number";
  return (
    <div
      ref={container}
      className="minecraft-paragraph"
      data-mc-paragraph-ready={logicalWidth != null}
    >
      {plain ? (
        <TypographyP maxWidth={logicalWidth} {...props}>
          {children}
        </TypographyP>
      ) : (
        <p {...props}>
          <DocumentText maxWidth={logicalWidth}>{children}</DocumentText>
        </p>
      )}
    </div>
  );
}
