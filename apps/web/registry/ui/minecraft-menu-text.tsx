import * as React from "react";

import { minecraftGlyphs } from "./minecraft-font";
import { MenuUnicodeLine } from "./minecraft-menu-unicode";
import { isMinecraftTextContent } from "./minecraft-render";
import { MinecraftText } from "./minecraft-text";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";

const hasSupportedLineGlyphs = function hasSupportedLineGlyphs(text: string) {
  for (const character of text) {
    if (
      !(
        /^[\u0020-\u007E]$/u.test(character) ||
        getUnihexGlyph(character) !== undefined
      )
    ) {
      return false;
    }
  }

  return true;
};

export const MenuScaleContext = React.createContext<1 | 2 | 3>(2);

export const MinecraftMenuText = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const scale = React.useContext(MenuScaleContext);
  const [, loaded] = React.useReducer((n) => n + 1, 0);

  const scalar = isMinecraftTextContent(children);

  const text = scalar ? String(children) : "";
  const unicode = /[^\u0020-\u007E]/u.test(text);

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

  if (!unicode) {
    return (
      <span className="mc-menu-text">
        <MinecraftText>{text}</MinecraftText>
      </span>
    );
  }

  if (!hasSupportedLineGlyphs(text)) {
    return (
      <span className="mc-menu-text" data-mc-menu-text-ready="false">
        {text}
      </span>
    );
  }

  let accumulatedGlyphAdvance = 0;

  for (const advanceCharacter of text) {
    accumulatedGlyphAdvance +=
      (minecraftGlyphs[advanceCharacter.codePointAt(0)! - 32]?.[2] ??
        getUnihexGlyph(advanceCharacter)?.advance ??
        6);
  }

  const width = Math.ceil(accumulatedGlyphAdvance);

  return (
    <span className="mc-menu-text" data-mc-menu-text-ready="true">
      <span aria-hidden="true">
        <MenuUnicodeLine text={text} bold={false} scale={scale} width={width} />
      </span>
      <span className="mc-menu-accessible">{text}</span>
    </span>
  );
};

export const menuTextNodes = function menuTextNodes(children: React.ReactNode) {
  return React.Children.map(children, (child): React.ReactNode =>
    isMinecraftTextContent(child) ? (
      <MinecraftMenuText>{child}</MinecraftMenuText>
    ) : (
      child
    )
  );
};
