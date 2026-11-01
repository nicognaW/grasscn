import * as React from "react";

import { DialogUnicodeLine } from "./minecraft-dialog-unicode";
import { minecraftGlyphs } from "./minecraft-font";
import { MinecraftText } from "./minecraft-text";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";

export const DialogLayoutContext = React.createContext({
  contentWidth: 214,
  scale: 2,
});

function widthOf(text: string, bold: boolean) {
  return Math.ceil(
    [...text].reduce((sum, char) => {
      const ascii = minecraftGlyphs[char.codePointAt(0)! - 32];

      return (
        sum +
        (ascii?.[2] ?? getUnihexGlyph(char)?.advance ?? 0) +
        (bold ? (ascii ? 1 : 0.5) : 0)
      );
    }, 0)
  );
}

function wrap(text: string, maximum: number, bold: boolean) {
  const lines: string[] = [];

  for (let remaining of text.split("\n")) {
    while (widthOf(remaining, bold) > maximum) {
      let count = 0;
      let used = 0;
      let space = -1;

      while (count < remaining.length) {
        if (remaining[count] === " ") {
          space = count;
        }

        const next = widthOf(remaining[count], bold);

        if (used + next > maximum && count > 0) {
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
}

export const MinecraftDialogText = ({
  children,
  bold = false,
  item = false,
}: {
  children: React.ReactNode;
  bold?: boolean;
  item?: boolean;
}) => {
  const { scale, contentWidth } = React.useContext(DialogLayoutContext);
  const [, loaded] = React.useReducer((n) => n + 1, 0);

  const unicode =
    typeof children === "string" && /[^\x20-\x7E\n]/.test(children);

  React.useEffect(() => {
    let active = true;

    if (unicode) {
      void loadUnihex().then(() => {
        if (active) loaded();
      });
    }

    return () => {
      active = false;
    };
  }, [unicode]);

  if (
    (typeof children !== "string" && typeof children !== "number") ||
    ![...String(children)].every(
      (char) => /^[\x20-\x7E\n]$/.test(char) || getUnihexGlyph(char)
    )
  ) {
    return <span data-mc-dialog-item={item || undefined}>{children}</span>;
  }

  const text = String(children);
  const lines = text === "" ? [] : wrap(text, contentWidth, bold);
  const widths = lines.map((line) => widthOf(line, bold));
  const widest = Math.max(0, ...widths);

  return (
    <span
      className="mc-dialog-text"
      data-mc-dialog-item={item || undefined}
      style={{ width: widest * scale }}
    >
      <span aria-hidden="true">
        {lines.map((line, index) => (
          <span
            className="mc-card-text-line"
            key={index}
            style={{
              paddingLeft:
                (Math.floor(widest / 2) - Math.floor(widths[index] / 2)) *
                scale,
            }}
          >
            {unicode ? (
              <DialogUnicodeLine
                text={line}
                bold={bold}
                scale={scale}
                width={widths[index]}
              />
            ) : bold ? (
              <span className="mc-bitmap mc-card-bold">
                <span className="mc-card-bold-pixels">
                  {Array.from(line, (char, i) => {
                    const [x, y, advance] =
                      minecraftGlyphs[char.charCodeAt(0) - 32];

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
              </span>
            ) : (
              <MinecraftText>{line}</MinecraftText>
            )}
          </span>
        ))}
      </span>
      <span className="mc-dialog-accessible">{text}</span>
    </span>
  );
};
