import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
} from "@grasscn/web/ui/avatar";
import type { MinecraftAvatarSkin } from "@grasscn/web/ui/avatar";
import * as React from "react";

declare global {
  interface Window {
    avatarImageRef?: HTMLImageElement | null;
  }
}

export const AvatarFixture = () => {
  const q = new URLSearchParams(location.search);

  // SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
  const scale =
    // SAFETY: owned fixture callers serialize the public GUI scales 1, 2, or 3; the existing Number conversion, default and component validation remain unchanged.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
    Number(q.get("scale") ?? 2) as 1 | 2 | 3;

  const [status, setStatus] = React.useState("");
  const ref = React.useRef<HTMLImageElement>(null);

  React.useLayoutEffect(() => {
    const chainedBackgroundOuter = document.documentElement.style;
    const chainedBackgroundInner = document.body.style;
    const chainedBackgroundValue = q.get("background") ?? "#202020";
    chainedBackgroundInner.background = chainedBackgroundValue;
    chainedBackgroundOuter.background = chainedBackgroundValue;
  }, []);
  React.useEffect(() => {
    window.avatarImageRef = ref.current;
  });

  if (q.get("native") === "1") {
    const part = q.get("part");

    return (
      <Avatar
        id="subject"
        scale={scale}
        size={
          Number(q.get("width")) === 12
            ? "sm"
            : Number(q.get("width")) === 20
              ? "lg"
              : "default"
        }
        className="fixture-geometry-height fixture-geometry-x fixture-placement-absolute fixture-geometry-y fixture-geometry-width"
        style={{
          "--fixture-height": `${Number(q.get("height") ?? 16) * scale}px`,
          "--fixture-width": `${Number(q.get("width") ?? 16) * scale}px`,
          "--fixture-x": `${Number(q.get("x") ?? 8) * scale}px`,
          "--fixture-y": `${Number(q.get("y") ?? 8) * scale}px`,
        }}
        data-subject="true"
      >
        {part === "label" ? (
          <AvatarFallback
            className="fixture-avatar-reference-fallback"
            maxWidth={
              q.has("wrapWidth") ? Number(q.get("wrapWidth")) : undefined
            }
            align={q.get("align") === "center" ? "center" : "left"}
          >
            {q.get("text") ?? q.get("label") ?? ""}
          </AvatarFallback>
        ) : (
          <AvatarImage
            skin={
              // SAFETY: owned fixture callers serialize the label option from the actual component protocol (MinecraftAvatarSkin); preserve this URL read, original default and component handling.
              // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
              (q.get("label") ?? "wide/steve") as MinecraftAvatarSkin
            }
            alt="Native player"
            hat={q.get("checked") !== "false"}
            upsideDown={q.get("selected") === "true"}
          />
        )}
      </Avatar>
    );
  }

  return (
    <>
      <Avatar id="loaded">
        <AvatarImage
          ref={ref}
          skin="wide/steve"
          alt="Steve"
          onLoadingStatusChange={setStatus}
        />
        <AvatarFallback>玩家</AvatarFallback>
        <AvatarBadge aria-label="online">!</AvatarBadge>
      </Avatar>
      <output id="status">{status}</output>
      <Avatar id="failed">
        <AvatarImage src="/not-an-image.png" alt="Unavailable" />
        <AvatarFallback>玩家中文</AvatarFallback>
      </Avatar>
      <Avatar id="delayed">
        <AvatarFallback delay={300}>Later</AvatarFallback>
      </Avatar>
      <Avatar id="default">
        <AvatarFallback />
      </Avatar>
      <AvatarGroup aria-label="Players">
        <Avatar size="sm">
          <AvatarImage skin="slim/alex" alt="Alex" />
        </Avatar>
        <AvatarGroupCount>+2</AvatarGroupCount>
      </AvatarGroup>
      <Avatar render={<a href="#player" id="linked" />}>
        <AvatarFallback>
          <strong>Player</strong>
        </AvatarFallback>
      </Avatar>
    </>
  );
};
