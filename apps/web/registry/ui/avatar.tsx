"use client";

import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import * as React from "react";

import { Label } from "./label";
import type { MinecraftAvatarSkin } from "./minecraft-avatar-assets";
import { minecraftAvatarSkins } from "./minecraft-avatar-assets";
import { paintMinecraftAvatar } from "./minecraft-avatar-paint";
import type { MinecraftProps } from "./minecraft-render";
import {
  isMinecraftTextContent,
  minecraftClasses as cn,
  minecraftStyle,
} from "./minecraft-render";

import "./minecraft-avatar.css";

export type { MinecraftAvatarSkin } from "./minecraft-avatar-assets";

interface AvatarPaintStyle extends React.CSSProperties {
  "--mc-avatar-size": number;
  "--mc-scale": number;
}

interface AvatarScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

const AvatarContext = React.createContext<1 | 2 | 3>(2);

type AvatarProps = MinecraftProps<typeof AvatarPrimitive.Root> & {
  size?: "default" | "sm" | "lg";
  scale?: 1 | 2 | 3;
};

const Avatar = ({
  size = "default",
  scale: providedScale,
  className,
  style,
  ...props
}: AvatarProps) => {
  const inherited = React.useContext(AvatarContext);
  const scale = providedScale ?? inherited;

  if (!["default", "sm", "lg"].includes(size)) {
    throw new Error("Unsupported native avatar size");
  }

  return (
    <AvatarContext.Provider value={scale}>
      <AvatarPrimitive.Root
        data-slot="avatar"
        data-size={size}
        className={cn(`mc-avatar`, className)}
        style={minecraftStyle(style, (__style): AvatarPaintStyle => ({
          "--mc-avatar-size": { default: 16, lg: 20, sm: 12 }[size],
          "--mc-scale": scale,
          ...__style,
        }))}
        {...props}
      />
    </AvatarContext.Provider>
  );
};

const MinecraftAvatarFace = ({
  skin,
  hat,
  upsideDown,
}: {
  skin: MinecraftAvatarSkin;
  hat: boolean;
  upsideDown: boolean;
}) => {
  const scale = React.useContext(AvatarContext);
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useLayoutEffect(() => {
    const canvas =
      // SAFETY: React attaches this always-rendered <canvas> before its synchronous layout effect setup reads the owned ref.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- React commit ordering and this intrinsic ref attachment prove the exact HTMLCanvasElement result.
      ref.current as HTMLCanvasElement;

    let frame = 0;
    let signature = "";

    const paint = () => {
      const b = canvas.getBoundingClientRect();

      const key = [b.x, b.y, b.width, b.height, innerWidth, innerHeight].join(
        ","
      );

      if (signature !== key) {
        signature = key;
        canvas.dataset.ready = String(
          paintMinecraftAvatar(canvas, skin, hat, upsideDown, scale)
        );
      }
    };

    const tick = () => {
      paint();
      frame = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [skin, hat, upsideDown, scale]);

  return <canvas ref={ref} data-mc-avatar-face="" aria-hidden="true" />;
};

type AvatarImageProps = MinecraftProps<typeof AvatarPrimitive.Image> & {
  skin?: MinecraftAvatarSkin;
  hat?: boolean;
  upsideDown?: boolean;
};

const AvatarImage = ({
  skin,
  hat = true,
  upsideDown = false,
  className,
  style,
  onLoadingStatusChange,
  src,
  ...props
}: AvatarImageProps) => {
  const [loaded, setLoaded] = React.useState(false);

  return (
    <>
      <AvatarPrimitive.Image
        data-slot="avatar-image"
        className={cn(
          `mc-avatar-image ${skin ? "mc-avatar-skin" : ""} `,
          className
        )}
        style={style}
        {...props}
        src={skin ? minecraftAvatarSkins[skin].png : src}
        onLoadingStatusChange={(status) => {
          setLoaded(status === "loaded");
          onLoadingStatusChange?.(status);
        }}
      />
      {skin && loaded && (
        <MinecraftAvatarFace skin={skin} hat={hat} upsideDown={upsideDown} />
      )}
    </>
  );
};

const AvatarFallback = ({
  children,
  className,
  maxWidth,
  align = "left",
  ...props
}: MinecraftProps<typeof AvatarPrimitive.Fallback> & {
  maxWidth?: number;
  align?: "left" | "center";
}) => {
  const scale = React.useContext(AvatarContext);
  let fallback = children;

  if (children === undefined || children === null) {
    fallback = <MinecraftAvatarFace skin="wide/steve" hat upsideDown={false} />;
  } else if (isMinecraftTextContent(children)) {
    fallback = (
      <Label scale={scale} maxWidth={maxWidth} align={align}>
        {children}
      </Label>
    );
  }

  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(`mc-avatar-fallback`, className)}
      {...props}
    >
      {fallback}
    </AvatarPrimitive.Fallback>
  );
};

const AvatarBadge = ({ className, ...props }: MinecraftProps<"span">) => (
  <span
    data-slot="avatar-badge"
    className={cn(`mc-avatar-badge`, className)}
    {...props}
  />
);

const groupScale = function groupScale(
  children: React.ReactNode
): 1 | 2 | 3 | undefined {
  for (const child of React.Children.toArray(children)) {
    if (
      !React.isValidElement<{
        scale?: 1 | 2 | 3;
        children?: React.ReactNode;
      }>(child)
    ) {
      continue;
    }

    if (child.type === Avatar && child.props.scale != null) {
      return child.props.scale;
    }

    if (child.type === React.Fragment) {
      const scale = groupScale(child.props.children);

      if (scale !== null && scale !== undefined) {
        return scale;
      }
    }
  }
};

const AvatarGroup = ({
  className,
  scale: providedScale,
  style,
  children,
  ...props
}: MinecraftProps<"div"> & {
  scale?: 1 | 2 | 3;
}) => {
  const inherited = React.useContext(AvatarContext);
  const scale = providedScale ?? groupScale(children) ?? inherited;

  return (
    <AvatarContext.Provider value={scale}>
      <div
        data-slot="avatar-group"
        className={cn(`mc-avatar-group`, className)}
        style={minecraftStyle(style, (__style): AvatarScaleStyle => ({
          "--mc-scale": scale,
          ...__style,
        }))}
        {...props}
      >
        {children}
      </div>
    </AvatarContext.Provider>
  );
};

const AvatarGroupCount = ({
  children,
  className,
  ...props
}: MinecraftProps<"div">) => {
  const scale = React.useContext(AvatarContext);

  return (
    <div
      data-slot="avatar-group-count"
      className={cn(`mc-avatar-group-count`, className)}
      {...props}
    >
      {isMinecraftTextContent(children) ? (
        <Label scale={scale}>{children}</Label>
      ) : (
        children
      )}
    </div>
  );
};

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
};

export type { AvatarProps, AvatarImageProps };
