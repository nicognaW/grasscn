"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { ComponentProps, ReactNode } from "react";

import { TypographyP } from "../registry/ui/typography";
import { DocumentText } from "./document-text";

const isTextNode = (value: ReactNode): value is string | number =>
  // eslint-disable-next-line anti-slop/no-runtime-typeof -- ReactNode is the rendering boundary; native text and element nodes require distinct handling.
  typeof value === "string" || typeof value === "number";

export const DocumentParagraph = ({
  children,
  ...props
}: ComponentProps<"p">) => {
  const container = useRef<HTMLDivElement>(null);
  const [logicalWidth, setLogicalWidth] = useState<number>();
  // eslint-disable-next-line react-doctor/effect-needs-cleanup -- Observer allocation is paired with the returned disconnect closure, including the missing-node path.
  useLayoutEffect(() => {
    const element = container.current;

    let disconnect: (() => void) | undefined;

    if (element !== null) {
      const measure = () => {
        setLogicalWidth(Math.floor(element.clientWidth / 2));
      };

      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(element);

      disconnect = () => {
        observer.disconnect();
      };
    }

    return disconnect;
  }, []);
  const plain = isTextNode(children);

  return (
    <div
      ref={container}
      className="minecraft-paragraph"
      data-mc-paragraph-ready={logicalWidth !== undefined}
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
};
