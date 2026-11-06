import * as React from "react";

import { Textarea } from "../registry/ui/textarea";
import {
  TypographyH1,
  TypographyH2,
  TypographyP,
  TypographyBlockquote,
  TypographyInlineCode,
  TypographySmall,
} from "../registry/ui/typography";
import type { DemoProps } from "../types";
import { useDemoWidth } from "../use-demo-width";

const TypographyDemo = ({ scale }: DemoProps) => {
  const { ref: stageRef, width: stageWidth } = useDemoWidth(scale);
  const [text, setText] = React.useState("Hello 世界\nWelcome to your world");

  return (
    <>
      <div className="demo-options">
        <label>
          Text
          <Textarea
            aria-label="Typography text"
            value={text}
            scale={scale}
            onChange={(event) => {
              setText(event.target.value);
            }}
            className="h-25 w-80"
          />
        </label>
      </div>
      <div ref={stageRef} className="demo-stage" data-stage="typography">
        <div className="demo-pair">
          <span>HEADING</span>
          <TypographyH1 scale={scale} maxWidth={Math.min(200, stageWidth)}>
            A new adventure
          </TypographyH1>
          <TypographyH2 scale={scale} maxWidth={Math.min(200, stageWidth)}>
            Craft your story
          </TypographyH2>
        </div>
        <div className="demo-pair">
          <span>MULTILINE</span>
          <TypographyP scale={scale} maxWidth={Math.min(200, stageWidth)}>
            {text}
          </TypographyP>
        </div>
        <div className="demo-pair">
          <span>PROSE / CODE</span>
          <TypographyBlockquote
            scale={scale}
            maxWidth={Math.min(200, stageWidth)}
          >
            The world is yours.
          </TypographyBlockquote>
          <TypographyInlineCode
            scale={scale}
            maxWidth={Math.min(200, stageWidth)}
          >
            /gamemode creative
          </TypographyInlineCode>
          <TypographySmall scale={scale} maxWidth={Math.min(200, stageWidth)}>
            Small text and captions
          </TypographySmall>
        </div>
      </div>
    </>
  );
};

export { TypographyDemo as default };
