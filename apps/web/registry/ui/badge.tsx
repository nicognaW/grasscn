"use client";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { minecraftBadgeAssets } from "./minecraft-badge-assets";
import { MinecraftProse } from "./minecraft-prose";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import {
  MinecraftRender,
  type MinecraftProps,
  type MinecraftPolymorphicProps,
} from "./minecraft-render";
import { minecraftTextWidth } from "./minecraft-tooltip-layout";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";

import "./minecraft-badge.css";
const badgeVariants = cva("mc-badge", {
  variants: { variant: { default: "" } },
  defaultVariants: { variant: "default" },
});
type BadgeProps = MinecraftPolymorphicProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    scale?: 1 | 2 | 3;
    maxWidth?: number;
    achievement?: "challenge" | "goal" | "task";
    earned?: boolean;
    icon?: React.ReactNode;
  };
function Badge({
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
}: BadgeProps) {
  if (variant !== "default")
    throw new Error(
      "Minecraft advancement badges support the default appearance only"
    );
  const node = React.useRef<HTMLElement>(null),
    [available, setAvailable] = React.useState<number>();
  React.useImperativeHandle(ref, () => node.current! as HTMLSpanElement, []);
  React.useLayoutEffect(() => {
    const element = node.current!,
      measure = () =>
        setAvailable(Math.max(1, Math.floor(element.clientWidth / scale) - 37));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [scale]);
  const child = null,
    content = children;
  const plain =
    typeof content === "string" || typeof content === "number"
      ? String(content)
      : undefined;
  const [, refreshFont] = React.useState(0);
  React.useEffect(() => {
    if (
      plain == null ||
      !Array.from(plain).some((char) => char.codePointAt(0)! > 127)
    )
      return;
    let live = true;
    loadUnihex().then(() => {
      if (live) refreshFont((v) => v + 1);
    });
    return () => {
      live = false;
    };
  }, [plain]);
  const widthOf = (text: string) =>
    Array.from(text).reduce(
      (sum, char) =>
        sum +
        (char.codePointAt(0)! < 128
          ? minecraftTextWidth(char)
          : (getUnihexGlyph(char)?.advance ?? 8)),
      0
    );
  const natural =
    plain == null ? maxWidth : Math.max(1, ...plain.split("\n").map(widthOf));
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
      ref={node as React.Ref<HTMLSpanElement>}
      data-slot="badge"
      data-achievement={achievement}
      data-earned={String(earned)}
      className={cn(badgeVariants({ variant }), className)}
      style={minecraftStyle(
        style,
        (__style) =>
          ({
            "--mc-scale": scale,
            "--mc-badge-natural": `${Math.min(maxWidth, natural) + 37}px`,
            "--mc-badge-panel": `url("${earned ? minecraftBadgeAssets.obtained : minecraftBadgeAssets.unobtained}")`,
            "--mc-badge-emblem": `url("${minecraftBadgeAssets[`${achievement}_${earned ? "obtained" : "unobtained"}`]}")`,
            ...__style,
          }) as React.CSSProperties
      )}
      {...props}
    >
      {rendered}
    </Component>
  );
}
export { Badge, badgeVariants };
export type { BadgeProps };
