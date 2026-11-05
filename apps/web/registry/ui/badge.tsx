"use client";

import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

import { minecraftBadgeAssets } from "./minecraft-badge-assets";
import { MinecraftProse } from "./minecraft-prose";
import {
  isMinecraftTextContent,
  minecraftClasses as cn,
  minecraftStyle,
  MinecraftRender,
} from "./minecraft-render";
import type { MinecraftPolymorphicProps } from "./minecraft-render";
import { minecraftTextWidth } from "./minecraft-tooltip-layout";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";

import "./minecraft-badge.css";

const requiresUnicodeGlyphs = function requiresUnicodeGlyphs(text: string) {
  for (const character of text) {
    if (
      // SAFETY: String iteration supplies a nonempty character, so its first code point exists.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The intrinsic string iterator proves this specific codePointAt(0) result.
      (character.codePointAt(0) as number) > 127
    ) {
      return true;
    }
  }

  return false;
};

interface BadgePaintStyle extends React.CSSProperties {
  "--mc-badge-emblem": string;
  "--mc-badge-natural": string;
  "--mc-badge-panel": string;
  "--mc-scale": number;
}

const badgeVariants = cva("mc-badge", {
  defaultVariants: { variant: "default" },
  variants: { variant: { default: "" } },
});

type BadgeProps = MinecraftPolymorphicProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    scale?: 1 | 2 | 3;
    maxWidth?: number;
    achievement?: "challenge" | "goal" | "task";
    earned?: boolean;
    icon?: React.ReactNode;
  };

const widthOf = (text: string) => {
  let accumulatedGlyphAdvance = 0;

  for (const advanceCharacter of text) {
    accumulatedGlyphAdvance +=
      // SAFETY: String iteration supplies a nonempty character, so its first code point exists.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The intrinsic string iterator proves this specific codePointAt(0) result.
      (advanceCharacter.codePointAt(0) as number) < 128
        ? minecraftTextWidth(advanceCharacter)
        : (getUnihexGlyph(advanceCharacter)?.advance ?? 8);
  }

  return accumulatedGlyphAdvance;
};

const Badge = ({
  children,
  className,
  variant = "default",
  render,
  scale = 2,
  maxWidth = 170,
  achievement = "challenge",
  earned = true,
  icon,
  style,
  ref,
  ...props
}: BadgeProps) => {
  if (variant !== "default") {
    throw new Error(
      "Minecraft advancement badges support the default appearance only"
    );
  }

  const node = React.useRef<HTMLElement>(null);

  const [attached, setAttached] = React.useState<HTMLElement | null>(null);

  const captureNode = React.useCallback((element: HTMLElement | null) => {
    node.current = element;

    setAttached(element);
  }, []);

  const [available, setAvailable] = React.useState<number>();

  React.useImperativeHandle<typeof node.current, typeof node.current>(
    ref,
    () => node.current,
    []
  );
  React.useLayoutEffect(() => {
    const element = attached;
    let observer: ResizeObserver | undefined;

    if (element !== null) {
      const measure = () => {
        setAvailable(Math.max(1, Math.floor(element.clientWidth / scale) - 37));
      };

      measure();
      observer = new ResizeObserver(measure);
      observer.observe(element);
    }

    return () => {
      observer?.disconnect();
    };
  }, [attached, scale]);

  const content = children;

  const plain = isMinecraftTextContent(content) ? String(content) : undefined;

  const [, refreshFont] = React.useState(0);
  React.useEffect((): ReturnType<React.EffectCallback> => {
    if (plain === undefined || !requiresUnicodeGlyphs(plain)) {
      return;
    }

    let live = true;
    const fontLoading = loadUnihex();

    const commitFontReadiness = async () => {
      await fontLoading;

      if (live) {
        refreshFont((v) => v + 1);
      }
    };

    void commitFontReadiness();

    return () => {
      live = false;
    };
  }, [plain]);

  const natural =
    plain === undefined
      ? maxWidth
      : Math.max(1, ...plain.split("\n").map(widthOf));

  const textWidth = Math.max(
    1,
    Math.min(maxWidth, natural, available ?? Infinity)
  );

  const rendered = (
    <>
      <span
        data-slot="badge-surface"
        className="mc-badge-surface"
        aria-hidden="true"
      />
      <span
        data-slot="badge-emblem"
        className="mc-badge-emblem"
        aria-hidden="true"
      >
        {icon === undefined ? (
          <img src={minecraftBadgeAssets.diamond} alt="" draggable={false} />
        ) : (
          icon
        )}
      </span>
      <MinecraftProse
        className="mc-badge-title"
        scale={scale}
        maxWidth={textWidth}
      >
        {content}
      </MinecraftProse>
    </>
  );

  const Component = MinecraftRender;

  return (
    <Component
      render={render}
      as="span"
      ref={captureNode}
      data-slot="badge"
      data-achievement={achievement}
      data-earned={String(earned)}
      className={cn(badgeVariants({ variant }), className)}
      style={minecraftStyle(style, (__style): BadgePaintStyle => ({
        "--mc-badge-emblem": `url("${minecraftBadgeAssets[`${achievement}_${earned ? "obtained" : "unobtained"}`]}")`,
        "--mc-badge-natural": `${Math.min(maxWidth, natural) + 37}px`,
        "--mc-badge-panel": `url("${earned ? minecraftBadgeAssets.obtained : minecraftBadgeAssets.unobtained}")`,
        "--mc-scale": scale,
        ...__style,
      }))}
      {...props}
    >
      {rendered}
    </Component>
  );
};

// oxlint-disable-next-line react-doctor/only-export-components -- Preserve the upstream shadcn component-and-variant export API used by consumer styling composition.
export { Badge, badgeVariants };

export type { BadgeProps };
