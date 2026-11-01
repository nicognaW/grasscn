import * as React from "react";

import { minecraftGlyphs } from "./minecraft-font";
import {
  isMinecraftTextContent,
  minecraftClasses as cn,
} from "./minecraft-render";

import "./minecraft-text.css";

const MinecraftText = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  if (
    !isMinecraftTextContent(children) ||
    !/^[\u0020-\u007E]*$/u.test(String(children))
  ) {
    return <span className={className}>{children}</span>;
  }

  const text = String(children);

  return (
    <span className={cn(`mc-bitmap`, className)}>
      <span className="mc-text-pixels" aria-hidden="true">
        {Array.from(text, (char, index) => {
          const [x, y, advance] = minecraftGlyphs[char.charCodeAt(0) - 32];

          return (
            <span
              key={index}
              className="mc-glyph"
              style={
                {
                  "--mc-advance": advance,
                  "--mc-glyph-x": x,
                  "--mc-glyph-y": y,
                  visibility: char === " " ? "hidden" : undefined,
                } as React.CSSProperties
              }
            />
          );
        })}
      </span>
      <span className="mc-text-accessible">{text}</span>
    </span>
  );
};

export { MinecraftText };
