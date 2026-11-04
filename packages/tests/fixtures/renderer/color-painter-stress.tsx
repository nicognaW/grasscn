import { BubbleContent } from "@grasscn/web/ui/bubble";
import { MessageScale } from "@grasscn/web/ui/message";
import { minecraftChatAtlas } from "@grasscn/web/ui/minecraft-chat-atlas";
import { MinecraftColorUnicodeLabel } from "@grasscn/web/ui/minecraft-color-unicode";
import { minecraftItemAtlas } from "@grasscn/web/ui/minecraft-item-atlas";
import * as React from "react";

interface ColorPainterReferenceStyle extends React.CSSProperties {
  "--mc-pixel": string;
  "--mc-scale": 1 | 2 | 3;
}

const painterInkClasses = [
  "fixture-painter-ink-lime",
  "fixture-painter-ink-magenta",
  "fixture-painter-ink-gold",
  "fixture-painter-ink-cyan",
] as const;

export const ColorPainterStressFixture = () => {
  const [scale, setScale] = React.useState<1 | 2 | 3>(3);
  const [noise, setNoise] = React.useState(true);
  const [mounted, setMounted] = React.useState(true);

  React.useLayoutEffect(() => {
    const chainedBackgroundOuter = document.body.style;
    const chainedBackgroundInner = document.documentElement.style;
    const chainedBackgroundValue = "#202020";
    chainedBackgroundInner.background = chainedBackgroundValue;
    chainedBackgroundOuter.background = chainedBackgroundValue;
  }, []);

  // SAFETY: Minecraft component styles consume this exact pixel/scale map from the fixture's 1/2/3 state; satisfies checks it before the CSSProperties view is passed to React.
  return (
    <>
      <div className="fixture-painter-stress-controls">
        {([1, 2, 3] as const).map((value) => (
          <button
            type="button"
            key={value}
            onClick={() => {
              setScale(value);
            }}
          >
            Scale {value}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setNoise((value) => !value);
          }}
        >
          Toggle siblings
        </button>
        <button
          type="button"
          onClick={() => {
            setMounted((value) => !value);
          }}
        >
          Toggle all
        </button>
      </div>
      {mounted ? (
        <MessageScale value={scale}>
          <div
            style={
              {
                "--mc-pixel": `${scale}px`,
                "--mc-scale": scale,
              } satisfies ColorPainterReferenceStyle as ColorPainterReferenceStyle
            }
          >
            <BubbleContent
              id="subject"
              className="fixture-geometry-height fixture-geometry-x fixture-placement-fixed fixture-geometry-y fixture-painter-ink-red"
              style={{
                "--fixture-height": `${9 * scale}px`,
                "--fixture-x": `${16 * scale}px`,
                "--fixture-y": `${16 * scale}px`,
                // oxlint-disable-next-line shadcn/no-inline-styles -- Approved painter stress input: BubbleContent reads inline width before the existing scale-transition pixel assertions.
                width: 252 * scale,
              }}
              data-subject="true"
            >
              Status 世界 Ready
            </BubbleContent>
            {noise
              ? Array.from({ length: 64 }, (_, index) => (
                  <span
                    data-stress-label
                    key={index}
                    className={`fixture-geometry-x fixture-placement-fixed fixture-geometry-y fixture-owner-layout-43 ${painterInkClasses[index % 4]}`}
                    style={{
                      "--fixture-x": `${700 + index}px`,
                      "--fixture-y": `${300 + index}px`,
                    }}
                  >
                    <MinecraftColorUnicodeLabel
                      text="世界"
                      atlas={
                        index % 2 ? minecraftItemAtlas : minecraftChatAtlas
                      }
                    />
                  </span>
                ))
              : null}
          </div>
        </MessageScale>
      ) : null}
    </>
  );
};
