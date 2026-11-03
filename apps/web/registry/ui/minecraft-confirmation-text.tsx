import * as React from "react";

import { confirmationUnihexAtlas } from "./minecraft-confirmation-atlas";
import { minecraftGlyphs } from "./minecraft-font";
import { isMinecraftTextContent } from "./minecraft-render";
import { MinecraftText } from "./minecraft-text";
import { MinecraftUnicodeLabel } from "./minecraft-unicode-label";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";

export const ConfirmationTextContext = React.createContext<{
  scale: number;
  contentWidth: number;
  compact?: boolean;
  nativeContentWidth?: number;
}>({ contentWidth: 462, scale: 2 });

const advance = (char: string) =>
  minecraftGlyphs[char.codePointAt(0)! - 32]?.[2] ??
  getUnihexGlyph(char)?.advance ??
  0;

const widthOf = (text: string) =>
  Math.ceil([...text].reduce((sum, char) => sum + advance(char), 0));

const wrap = function wrap(text: string, maximum: number) {
  const lines: string[] = [];

  for (let remaining of text.split("\n")) {
    while (widthOf(remaining) > maximum) {
      let count = 0;
      let used = 0;
      let space = -1;

      while (count < remaining.length) {
        if (remaining[count] === " ") {
          space = count;
        }

        const next = advance(remaining[count]);

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

export const confirmationButtonText = function confirmationButtonText(
  children: React.ReactNode
): React.ReactNode {
  return isMinecraftTextContent(children) &&
    /[^\u0020-\u007E]/u.test(String(children)) ? (
    <MinecraftUnicodeLabel
      text={String(children)}
      atlas={confirmationUnihexAtlas}
    />
  ) : (
    children
  );
};

export const MinecraftConfirmationText = ({
  children,
  title = false,
}: {
  children: React.ReactNode;
  title?: boolean;
}) => {
  const {
    scale,
    contentWidth,
    compact = false,
    nativeContentWidth = contentWidth,
  } = React.useContext(ConfirmationTextContext);

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
    ![...String(children)].every(
      (char) => /^[\u0020-\u007E\n]$/u.test(char) || getUnihexGlyph(char)
    )
  ) {
    return <span>{children}</span>;
  }

  const text = String(children);

  let selectedAllLines: string[];

  if (text === "") {
    selectedAllLines = [];
  } else if (title && !compact) {
    selectedAllLines = [text];
  } else {
    selectedAllLines = wrap(text, contentWidth);
  }

  const allLines = selectedAllLines;

  const lines = compact ? allLines : allLines.slice(0, title ? 1 : 15);

  if (!compact && !title && allLines.length > 15) {
    let last = lines[14];
    const limit = widthOf(last) - widthOf("...");

    while (last.length && widthOf(last) > limit) {
      last = last.slice(0, -1);
    }

    lines[14] = `${last}...`;
  }

  const widths = lines.map(widthOf);
  const widest = Math.max(0, ...widths);

  let selectedNativeLines: string[];

  if (text === "") {
    selectedNativeLines = [];
  } else if (title) {
    selectedNativeLines = [text];
  } else if (compact) {
    selectedNativeLines = wrap(text, nativeContentWidth);
  } else {
    selectedNativeLines = allLines;
  }

  const nativeLines = selectedNativeLines;

  return (
    <span
      className="mc-confirmation-text"
      data-mc-confirmation-native-height={
        Math.min(title ? 1 : 15, nativeLines.length) * 9 * scale
      }
      data-mc-confirmation-natural-width={
        title
          ? Math.max(0, ...text.split("\n").map(widthOf)) * scale
          : undefined
      }
      style={{ display: "block", width: widest * scale }}
    >
      <span aria-hidden="true">
        {lines.map((line, index) => (
          <span
            key={index}
            className="mc-card-text-line"
            style={{
              paddingLeft:
                (Math.floor(widest / 2) - Math.floor(widths[index] / 2)) *
                scale,
            }}
          >
            {/[^\u0020-\u007E]/u.test(line) ? (
              <MinecraftUnicodeLabel
                text={line}
                atlas={confirmationUnihexAtlas}
              />
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
