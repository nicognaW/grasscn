import * as React from "react";

import { minecraftGlyphs } from "./minecraft-font";
import { MenuUnicodeLine } from "./minecraft-menu-unicode";
import { isMinecraftTextContent } from "./minecraft-render";
import { MinecraftText } from "./minecraft-text";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";

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
        if (active) loaded();
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

  if (
    ![...text].every(
      (char) => /^[\u0020-\u007E]$/u.test(char) || getUnihexGlyph(char)
    )
  ) {
    return (
      <span className="mc-menu-text" data-mc-menu-text-ready="false">
        {text}
      </span>
    );
  }

  const width = Math.ceil(
    [...text].reduce(
      (sum, char) =>
        sum +
        (minecraftGlyphs[char.codePointAt(0)! - 32]?.[2] ??
          getUnihexGlyph(char)?.advance ??
          6),
      0
    )
  );

  return (
    <span className="mc-menu-text" data-mc-menu-text-ready="true">
      <span aria-hidden="true">
        <MenuUnicodeLine text={text} bold={false} scale={scale} width={width} />
      </span>
      <span className="mc-menu-accessible">{text}</span>
    </span>
  );
};

export function menuTextNodes(children: React.ReactNode) {
  return React.Children.map(children, (child) =>
    isMinecraftTextContent(child) ? (
      <MinecraftMenuText>{child}</MinecraftMenuText>
    ) : (
      child
    )
  );
}
