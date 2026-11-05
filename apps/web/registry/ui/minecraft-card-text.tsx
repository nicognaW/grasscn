import * as React from "react";

import { minecraftGlyphs } from "./minecraft-font";
import { isMinecraftTextContent } from "./minecraft-render";
import { MinecraftText } from "./minecraft-text";

interface NativeTextLayoutStyle extends React.CSSProperties {
  "--mc-card-text-padding-left"?: string;
}

interface CardBoldGlyphStyle extends React.CSSProperties {
  "--mc-advance": number;
  "--mc-glyph-x": number;
  "--mc-glyph-y": number;
}

// oxlint-disable-next-line react-doctor/only-export-components -- Preserve the shared Card scale context identity used by Card, Sheet, Drawer and Popover composition; accept mixed-module Fast Refresh state fallback.
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
    const cardLineAdvance = function cardLineAdvance(glyphText: string) {
      let accumulatedGlyphAdvance = 0;

      for (const advanceCharacter of glyphText) {
        accumulatedGlyphAdvance += advance(advanceCharacter);
      }

      return accumulatedGlyphAdvance;
    };

    while (cardLineAdvance(remaining) > width) {
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
  React.useLayoutEffect((): (() => void) | undefined => {
    const element = node.current;

    if (!element) {
      return undefined;
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
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- Children can replace the measured text span; preserve observer rebinding and width measurement for the committed content.
  }, [children, scale]);

  if (
    !isMinecraftTextContent(children) ||
    !/^[\u0020-\u007E\n]*$/u.test(String(children))
  ) {
    // oxlint-disable-next-line react/jsx-no-useless-fragment -- This opaque ReactNode fallback retains the existing ReactElement return and fragment boundary; directly returning arbitrary children changes the public return and reconciliation contract.
    return <>{children}</>;
  }

  const lines = wrap(String(children), width, bold);

  const widths = lines.map((line) => {
    let accumulatedGlyphAdvance2 = 0;

    for (const advanceCharacter2 of line) {
      accumulatedGlyphAdvance2 =
        accumulatedGlyphAdvance2 +
        minecraftGlyphs[
          (advanceCharacter2.codePointAt(0) ?? Number.NaN) - 32
        ][2] +
        Number(bold);
    }

    return accumulatedGlyphAdvance2;
  });

  const widest = Math.max(0, ...widths);

  return (
    <span ref={node} className="mc-card-text" data-mc-card-text="true">
      {lines.map((line, index) => {
        const nativeTextLayout1: NativeTextLayoutStyle = {
          "--mc-card-text-padding-left": `calc(${Math.floor((width - widest) / 2) + Math.floor(widest / 2) - Math.floor(widths[index] / 2)} * var(--mc-pixel))`,
        };

        return (
          <span
            className="mc-card-text-line pl-(--mc-card-text-padding-left)"
            /* eslint-disable react-doctor/no-array-index-as-key -- Private wrapped text rows are identified by their layout position; repeated text is valid and the width observer belongs to the parent span. */
            key={index}
            /* eslint-enable react-doctor/no-array-index-as-key */
            style={nativeTextLayout1}
          >
            {bold ? (
              <span className="mc-bitmap mc-card-bold">
                <span className="mc-card-bold-pixels" aria-hidden="true">
                  {Array.from(line, (char, i) => {
                    const [x, y, advance] =
                      minecraftGlyphs[(char.codePointAt(0) ?? Number.NaN) - 32];

                    const glyphStyle: CardBoldGlyphStyle = {
                      "--mc-advance": advance + 1,
                      "--mc-glyph-x": x,
                      "--mc-glyph-y": y,
                    };

                    return (
                      <span
                        className={
                          char === " "
                            ? "mc-card-bold-glyph invisible"
                            : "mc-card-bold-glyph"
                        }
                        key={i}
                        style={glyphStyle}
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
        );
      })}
    </span>
  );
};
