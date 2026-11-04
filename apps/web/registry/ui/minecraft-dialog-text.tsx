import * as React from "react";

import { DialogUnicodeLine } from "./minecraft-dialog-unicode";
import { minecraftGlyphs } from "./minecraft-font";
import { isMinecraftTextContent } from "./minecraft-render";
import { MinecraftText } from "./minecraft-text";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";

interface NativeTextLayoutStyle extends React.CSSProperties {
  "--mc-dialog-text-padding-left"?: string;
  "--mc-dialog-text-width"?: string;
}

const hasSupportedParagraphGlyphs = function hasSupportedParagraphGlyphs(
  text: string
) {
  for (const character of text) {
    if (
      !(
        /^[\u0020-\u007E\n]$/u.test(character) ||
        getUnihexGlyph(character) !== undefined
      )
    ) {
      return false;
    }
  }

  return true;
};

const asciiGlyphs: readonly ((typeof minecraftGlyphs)[number] | undefined)[] =
  minecraftGlyphs;

interface DialogBoldGlyphStyle extends React.CSSProperties {
  "--mc-advance": number;
  "--mc-glyph-x": number;
  "--mc-glyph-y": number;
}

export const DialogLayoutContext = React.createContext({
  contentWidth: 214,
  scale: 2,
});

const widthOf = function widthOf(text: string, bold: boolean) {
  let accumulatedGlyphAdvance = 0;

  for (const advanceCharacter of text) {
    const ascii =
      asciiGlyphs[
        // SAFETY: String iteration supplies a nonempty character, so its first code point exists.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The intrinsic string iterator proves this specific codePointAt(0) result.
        (advanceCharacter.codePointAt(0) as number) - 32
      ];

    accumulatedGlyphAdvance =
      accumulatedGlyphAdvance +
      (ascii?.[2] ?? getUnihexGlyph(advanceCharacter)?.advance ?? 0) +
      (bold ? (ascii ? 1 : 0.5) : 0);
  }

  return Math.ceil(accumulatedGlyphAdvance);
};

const wrap = function wrap(text: string, maximum: number, bold: boolean) {
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
};

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
    typeof children === "string" && /[^\u0020-\u007E\n]/u.test(children);

  React.useEffect(() => {
    let active = true;

    if (unicode) {
      void loadUnihex().then(() => {
        if (active) {
          loaded();
        }
      });
    }

    return () => {
      active = false;
    };
  }, [unicode]);

  if (
    !isMinecraftTextContent(children) ||
    !hasSupportedParagraphGlyphs(String(children))
  ) {
    return <span data-mc-dialog-item={item || undefined}>{children}</span>;
  }

  const text = String(children);
  const lines = text === "" ? [] : wrap(text, contentWidth, bold);
  const widths = lines.map((line) => widthOf(line, bold));
  const widest = Math.max(0, ...widths);

  const nativeTextLayout1: NativeTextLayoutStyle = {
    "--mc-dialog-text-width": `${widest * scale}px`,
  };

  return (
    <span
      className="mc-dialog-text w-(--mc-dialog-text-width)"
      data-mc-dialog-item={item || undefined}
      style={nativeTextLayout1}
    >
      <span aria-hidden="true">
        {lines.map((line, index) => {
          const _precedingkey = index;

          const _precedingstyle: NativeTextLayoutStyle = {
            "--mc-dialog-text-padding-left": `${
              (Math.floor(widest / 2) - Math.floor(widths[index] / 2)) * scale
            }px`,
          };

          let _selectedContent: React.ReactNode;

          if (unicode) {
            _selectedContent = (
              <DialogUnicodeLine
                text={line}
                bold={bold}
                scale={scale}
                width={widths[index]}
              />
            );
          } else if (bold) {
            _selectedContent = (
              <span className="mc-bitmap mc-card-bold">
                <span className="mc-card-bold-pixels">
                  {Array.from(line, (char, i) => {
                    const [x, y, advance] =
                      minecraftGlyphs[(char.codePointAt(0) ?? Number.NaN) - 32];

                    const glyphStyle: DialogBoldGlyphStyle = {
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
              </span>
            );
          } else {
            _selectedContent = <MinecraftText>{line}</MinecraftText>;
          }

          return (
            <span
              className="mc-card-text-line pl-(--mc-dialog-text-padding-left)"
              key={_precedingkey}
              style={_precedingstyle}
            >
              {_selectedContent}
            </span>
          );
        })}
      </span>
      <span className="mc-dialog-accessible">{text}</span>
    </span>
  );
};
