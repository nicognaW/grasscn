import * as React from "react";

import { minecraftGlyphs } from "./minecraft-font";
import { MenuUnicodeLine } from "./minecraft-menu-unicode";
import { MinecraftText } from "./minecraft-text";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";

export const MenuScaleContext = React.createContext<1 | 2 | 3>(2);
export function MinecraftMenuText({ children }: { children: React.ReactNode }) {
  const scale = React.useContext(MenuScaleContext),
    [, loaded] = React.useReducer((n) => n + 1, 0);
  const scalar = typeof children === "string" || typeof children === "number";
  const text = scalar ? String(children) : "",
    unicode = /[^\x20-\x7e]/.test(text);
  React.useEffect(() => {
    let active = true;
    if (unicode)
      loadUnihex().then(() => {
        if (active) loaded();
      });
    return () => {
      active = false;
    };
  }, [unicode]);
  if (!scalar) return <>{children}</>;
  if (!unicode)
    return (
      <span className="mc-menu-text">
        <MinecraftText>{text}</MinecraftText>
      </span>
    );
  if (
    !Array.from(text).every(
      (char) => /^[\x20-\x7e]$/.test(char) || getUnihexGlyph(char)
    )
  )
    return (
      <span className="mc-menu-text" data-mc-menu-text-ready="false">
        {text}
      </span>
    );
  const width = Math.ceil(
    Array.from(text).reduce(
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
}
export function menuTextNodes(children: React.ReactNode) {
  return React.Children.map(children, (child) =>
    typeof child === "string" || typeof child === "number" ? (
      <MinecraftMenuText>{child}</MinecraftMenuText>
    ) : (
      child
    )
  );
}
