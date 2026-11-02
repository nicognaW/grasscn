import * as React from "react";

import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupText,
  InputGroupButton,
  InputGroupTextarea,
} from "../registry/ui/input-group";
import type { DemoProps } from "../types";

export default function InputGroupDemo({ scale }: DemoProps) {
  const [name, setName] = React.useState("Player");
    const [message, setMessage] = React.useState("你好，Minecraft!");
    const [sent, setSent] = React.useState("");

  return (
    <>
      <div
        className="demo-stage demo-stage-display-grid grid-cols-1 demo-stage-gap-16"
        data-stage="input-group"
      >
        <InputGroup
          scale={scale}
          style={{ width: 200 * scale, maxWidth: "100%" }}
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
          style={{ width: 200 * scale, maxWidth: "100%" }}
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
              style={{ width: 60 * scale }}
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
}
