import * as React from "react";
import type { CSSProperties as IntrinsicLayoutCSSProperties } from "react";

import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupText,
  InputGroupButton,
  InputGroupTextarea,
} from "../registry/ui/input-group";
import type { DemoProps } from "../types";

interface PresentationLayoutStyle1 extends IntrinsicLayoutCSSProperties {
  "--mc-presentation-demos-input-group-1-width": `${number}px`;
}

interface PresentationLayoutStyle2 extends IntrinsicLayoutCSSProperties {
  "--mc-presentation-demos-input-group-2-width": `${number}px`;
}

interface SendButtonStyle extends IntrinsicLayoutCSSProperties {
  "--input-group-send-width": `${number}px`;
}

const InputGroupDemo = ({ scale }: DemoProps) => {
  const [name, setName] = React.useState("Player");
  const [message, setMessage] = React.useState("你好，Minecraft!");
  const [sent, setSent] = React.useState("");

  const sendButtonStyle: SendButtonStyle = {
    "--input-group-send-width": `${60 * scale}px`,
  };

  return (
    <>
      <div
        className="demo-stage demo-stage-display-grid demo-stage-gap-16 grid-cols-1"
        data-stage="input-group"
      >
        <InputGroup
          scale={scale}
          className="w-(--mc-presentation-demos-input-group-1-width) max-w-full"
          style={
            // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
            {
              "--mc-presentation-demos-input-group-1-width": `${200 * scale}px`,
            } satisfies PresentationLayoutStyle1 as PresentationLayoutStyle1
          }
        >
          <InputGroupAddon>
            <InputGroupText>Name</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Player name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
        </InputGroup>
        <InputGroup
          scale={scale}
          className="w-(--mc-presentation-demos-input-group-2-width) max-w-full"
          style={
            // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
            {
              "--mc-presentation-demos-input-group-2-width": `${200 * scale}px`,
            } satisfies PresentationLayoutStyle2 as PresentationLayoutStyle2
          }
        >
          <InputGroupTextarea
            aria-label="Chat message"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
            }}
          />
          <InputGroupAddon align="block-end">
            <InputGroupText>Chat</InputGroupText>
            <InputGroupButton
              onClick={() => {
                setSent(name + ": " + message);
              }}
              className="w-(--input-group-send-width)"
              style={sendButtonStyle}
            >
              Send
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
      <div className="demo-result">
        {sent || "Edit your message and send it."}
      </div>
    </>
  );
};

export { InputGroupDemo as default };
