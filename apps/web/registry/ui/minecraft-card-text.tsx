import * as React from "react";

import { minecraftGlyphs } from "./minecraft-font";
import { isMinecraftTextContent } from "./minecraft-render";
import { MinecraftText } from "./minecraft-text";

export const CardScaleContext = React.createContext(2);

const wrap = function wrap(text: string, width: number, bold: boolean) {
  const lines: string[] = [];

  const advance = (char: string) => {
    const codePoint = char.codePointAt(0);

    if (codePoint === undefined) {
      throw new Error("Expected a non-empty card glyph character");
    }

    return minecraftGlyphs[codePoint - 32][2] + Number(bold);
  };

  for (let remaining of text.split("\n")) {
    while (
      [...remaining].reduce((sum, char) => sum + advance(char), 0) > width
    ) {
      let count = 0;
      let used = 0;
      let space = -1;

      while (count < remaining.length) {
        if (remaining[count] === " ") {
          space = count;
        }

        const next = advance(remaining[count]);

        if (used + next > width && count > 0) {
          break;
        }

        used += next;
        count += 1;
      }

      const end = space >= 0 ? space : Math.max(1, count);
      lines.push(remaining.slice(0, end));
      remaining = remaining.slice(end + Number(space >= 0));
    }

    lines.push(remaining);
  }

  return lines;
};

export const MinecraftCardText = ({
  children,
  bold = false,
}: {
  children: React.ReactNode;
  bold?: boolean;
}) => {
  const scale = React.useContext(CardScaleContext);
  const node = React.useRef<HTMLSpanElement>(null);
  const [width, setWidth] = React.useState(200);
  React.useLayoutEffect(() => {
    const element = node.current;

    if (!element) {
      return;
    }

    const measure = () => {
      setWidth(Math.max(1, Math.floor(element.clientWidth / scale)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [children, scale]);

  if (
    !isMinecraftTextContent(children) ||
    !/^[\u0020-\u007E\n]*$/u.test(String(children))
  ) {
    return <>{children}</>;
  }

  const lines = wrap(String(children), width, bold);

  const widths = lines.map((line) =>
    [...line].reduce(
      (sum, char) =>
        sum + minecraftGlyphs[(char.codePointAt(0) ?? Number.NaN) - 32][2] + Number(bold),
      0
    )
  );

  const widest = Math.max(0, ...widths);

  return (
    <span ref={node} className="mc-card-text" data-mc-card-text="true">
      {lines.map((line, index) => (
        <span
          className="mc-card-text-line"
          key={index}
          style={{
            paddingLeft: `calc(${Math.floor((width - widest) / 2) + Math.floor(widest / 2) - Math.floor(widths[index] / 2)} * var(--mc-pixel))`,
          }}
        >
          {bold ? (
            <span className="mc-bitmap mc-card-bold">
              <span className="mc-card-bold-pixels" aria-hidden="true">
                {Array.from(line, (char, i) => {
                  const [x, y, advance] =
                    minecraftGlyphs[(char.codePointAt(0) ?? Number.NaN) - 32];

                  return (
                    <span
                      className="mc-card-bold-glyph"
                      key={i}
                      style={
                        {
                          "--mc-advance": advance + 1,
                          "--mc-glyph-x": x,
                          "--mc-glyph-y": y,
                          visibility: char === " " ? "hidden" : undefined,
                        } as React.CSSProperties
                      }
                    >
                      <i />
                      <i />
                    </span>
                  );
                })}
              </span>
              <span className="mc-card-accessible">{line}</span>
            </span>
          ) : (
            <MinecraftText>{line}</MinecraftText>
          )}
        </span>
      ))}
    </span>
  );
};
