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

// oxlint-disable-next-line react-doctor/only-export-components -- Preserve the shared menu-scale context identity used by menu, command and combobox providers and text receivers; accept mixed-module Fast Refresh state fallback.
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
      minecraftGlyphs[
        // SAFETY: String iteration supplies a nonempty character, so its first code point exists.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The intrinsic string iterator proves this specific codePointAt(0) result.
        (advanceCharacter.codePointAt(0) as number) - 32
      ]?.[2] ??
      getUnihexGlyph(advanceCharacter)?.advance ??
      6;
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

// oxlint-disable-next-line react-doctor/only-export-components -- Preserve the existing menu child-normalization API used by its composed menu and combobox consumers; accept mixed-module Fast Refresh state fallback.
export const menuTextNodes = function menuTextNodes(children: React.ReactNode) {
  // oxlint-disable-next-line react/no-react-children -- This existing public ReactNode normalizer retains React-owned nested-array keys, iterable/thenable traversal and scalar adaptation; a plain array map changes the accepted children contract.
  return React.Children.map(children, (child): React.ReactNode =>
    isMinecraftTextContent(child) ? (
      <MinecraftMenuText>{child}</MinecraftMenuText>
    ) : (
      child
    )
  );
};
