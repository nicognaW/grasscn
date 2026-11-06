import * as React from "react";

import { MinecraftCardText } from "./minecraft-card-text";
import { minecraftGlyphs } from "./minecraft-font";
import { PopoverUnicodeLine } from "./minecraft-popover-unicode";
import { isMinecraftTextContent } from "./minecraft-render";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";

interface NativeTextLayoutStyle extends React.CSSProperties {
  "--mc-popover-text-padding-left"?: string;
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

// oxlint-disable-next-line react-doctor/only-export-components -- Preserve the shared Popover text-layout context identity used by its provider and native text receiver; accept mixed-module Fast Refresh state fallback.
export const PopoverTextContext = React.createContext({ scale: 2, width: 214 });

const advance = (char: string, bold: boolean) => {
  const ascii =
    asciiGlyphs[
      // SAFETY: Private glyph callers supply nonempty iteration characters or guarded in-bounds code units. Its first code point therefore exists.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The verified glyph-character producer proves this specific codePointAt(0) result.
      (char.codePointAt(0) as number) - 32
    ];

  let boldAdvance = 0;

  if (bold) {
    boldAdvance = ascii ? 1 : 0.5;
  }

  return (ascii?.[2] ?? getUnihexGlyph(char)?.advance ?? 0) + boldAdvance;
};

const textWidth = (text: string, bold: boolean) => {
  let measuredGlyphWidth = 0;

  for (const glyphCharacter of text) {
    measuredGlyphWidth += advance(glyphCharacter, bold);
  }

  return Math.ceil(measuredGlyphWidth);
};

const wrap = function wrap(text: string, maximum: number, bold: boolean) {
  const lines: string[] = [];

  for (const paragraph of text.split("\n")) {
    let remaining: string[] = [];

    for (const bufferCharacter of paragraph) {
      remaining.push(bufferCharacter);
    }

    while (textWidth(remaining.join(""), bold) > maximum) {
      let count = 0;
      let used = 0;
      let space = -1;

      while (count < remaining.length) {
        if (remaining[count] === " ") {
          space = count;
        }

        const next = advance(remaining[count], bold);

        if (used + next > maximum && count > 0) {
          break;
        }

        used += next;
        count += 1;
      }

      const end = space >= 0 ? space : Math.max(1, count);
      lines.push(remaining.slice(0, end).join(""));
      remaining = remaining.slice(end + Number(space >= 0));
    }

    lines.push(remaining.join(""));
  }

  return lines;
};

export const MinecraftPopoverText = ({
  children,
  bold = false,
}: {
  children: React.ReactNode;
  bold?: boolean;
}) => {
  const { scale, width } = React.useContext(PopoverTextContext);
  const [, loaded] = React.useReducer((n) => n + 1, 0);

  const scalar = isMinecraftTextContent(children);
  const text = scalar ? String(children) : "";
  const unicode = /[^\u0020-\u007E\n]/u.test(text);

  React.useEffect(() => {
    let active = true;

    if (unicode) {
      const fontLoading = loadUnihex();

      const commitFontReadiness = async () => {
        await fontLoading;

        if (active) {
          loaded();
        }
      };

      void commitFontReadiness();
    }

    return () => {
      active = false;
    };
  }, [unicode]);

  if (!scalar) {
    // oxlint-disable-next-line react/jsx-no-useless-fragment -- This opaque ReactNode fallback retains the existing ReactElement return and fragment boundary; directly returning arbitrary children changes the public return and reconciliation contract.
    return <>{children}</>;
  }

  if (!text) {
    return <span data-mc-popover-text-ready="true" />;
  }

  if (!unicode) {
    return (
      <span className="mc-popover-text" data-mc-popover-text-ready="true">
        <span aria-hidden="true" className="block">
          <MinecraftCardText bold={bold}>{text}</MinecraftCardText>
        </span>
        <span className="mc-card-accessible">{text}</span>
      </span>
    );
  }

  if (!hasSupportedParagraphGlyphs(text)) {
    return <span data-mc-popover-text-ready="false">{text}</span>;
  }

  const lines = wrap(text, width, bold);
  const widths = lines.map((line) => textWidth(line, bold));
  const widest = Math.max(0, ...widths);

  return (
    <span className="mc-popover-text" data-mc-popover-text-ready="true">
      <span aria-hidden="true">
        {lines.map((line, index) => {
          const nativeTextLayout1: NativeTextLayoutStyle = {
            "--mc-popover-text-padding-left": `${
              (Math.floor((width - widest) / 2) +
                Math.floor(widest / 2) -
                Math.floor(widths[index] / 2)) *
              scale
            }px`,
          };

          return (
            <span
              key={index}
              className="mc-card-text-line pl-(--mc-popover-text-padding-left)"
              style={nativeTextLayout1}
            >
              <PopoverUnicodeLine
                text={line}
                bold={bold}
                scale={scale}
                width={widths[index]}
              />
            </span>
          );
        })}
      </span>
      <span className="mc-card-accessible">{text}</span>
    </span>
  );
};
