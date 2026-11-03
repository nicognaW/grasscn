import * as React from "react";

import { MinecraftCardText } from "./minecraft-card-text";
import { minecraftGlyphs } from "./minecraft-font";
import { PopoverUnicodeLine } from "./minecraft-popover-unicode";
import { isMinecraftTextContent } from "./minecraft-render";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";

const asciiGlyphs: readonly ((typeof minecraftGlyphs)[number] | undefined)[] =
  minecraftGlyphs;

export const PopoverTextContext = React.createContext({ scale: 2, width: 214 });

const advance = (char: string, bold: boolean) => {
  const ascii = asciiGlyphs[char.codePointAt(0)! - 32];

  return (
    (ascii?.[2] ?? getUnihexGlyph(char)?.advance ?? 0) +
    (bold ? (ascii ? 1 : 0.5) : 0)
  );
};

const textWidth = (text: string, bold: boolean) =>
  Math.ceil([...text].reduce((sum, char) => sum + advance(char, bold), 0));

const wrap = function wrap(text: string, maximum: number, bold: boolean) {
  const lines: string[] = [];

  for (const paragraph of text.split("\n")) {
    let remaining = [...paragraph];

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

  if (!scalar) {
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

  if (
    ![...text].every(
      (char) => /^[\u0020-\u007E\n]$/u.test(char) || getUnihexGlyph(char)
    )
  ) {
    return <span data-mc-popover-text-ready="false">{text}</span>;
  }

  const lines = wrap(text, width, bold);
  const widths = lines.map((line) => textWidth(line, bold));
  const widest = Math.max(0, ...widths);

  return (
    <span className="mc-popover-text" data-mc-popover-text-ready="true">
      <span aria-hidden="true">
        {lines.map((line, index) => (
          <span
            key={index}
            className="mc-card-text-line"
            style={{
              paddingLeft:
                (Math.floor((width - widest) / 2) +
                  Math.floor(widest / 2) -
                  Math.floor(widths[index] / 2)) *
                scale,
            }}
          >
            <PopoverUnicodeLine
              text={line}
              bold={bold}
              scale={scale as 1 | 2 | 3}
              width={widths[index]}
            />
          </span>
        ))}
      </span>
      <span className="mc-card-accessible">{text}</span>
    </span>
  );
};
