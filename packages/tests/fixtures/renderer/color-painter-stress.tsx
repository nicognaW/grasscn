import { BubbleContent } from "@grasscn/web/ui/bubble";
import { MessageScale } from "@grasscn/web/ui/message";
import { minecraftChatAtlas } from "@grasscn/web/ui/minecraft-chat-atlas";
import { MinecraftColorUnicodeLabel } from "@grasscn/web/ui/minecraft-color-unicode";
import { minecraftItemAtlas } from "@grasscn/web/ui/minecraft-item-atlas";
import * as React from "react";

export const ColorPainterStressFixture = () => {
  const [scale, setScale] = React.useState<1 | 2 | 3>(3);
  const [noise, setNoise] = React.useState(true);
  const [mounted, setMounted] = React.useState(true);

  React.useLayoutEffect(() => {
    document.body.style.background = document.documentElement.style.background =
      "#202020";
  }, []);

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
              } as React.CSSProperties
            }
          >
            <BubbleContent
              id="subject"
              style={{
                color: "#ff5555",
                height: 9 * scale,
                left: 16 * scale,
                position: "fixed",
                top: 16 * scale,
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
                    style={{
                      color: ["#55ff55", "#ff55ff", "#ffaa00", "#55ffff"][
                        index % 4
                      ],
                      left: 700 + index,
                      opacity: 0,
                      position: "fixed",
                      top: 300 + index,
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
