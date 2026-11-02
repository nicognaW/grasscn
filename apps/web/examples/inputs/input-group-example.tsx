"use client";

import { useState } from "react";

import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";

const InputGroupExample = () => {
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSent(message);
        setMessage("");
      }}
      /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
      style={{ display: "grid", gap: 12 }}
      /* eslint-enable shadcn/no-inline-styles */
    >
      <InputGroup>
        <InputGroupInput
          aria-label="Chat message"
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
          }}
          placeholder="Message"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            type="submit" /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
            style={{ width: 120 }}
            /* eslint-enable shadcn/no-inline-styles */
          >
            Send
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <output aria-label="Sent message">
        <Label>{sent || "No message sent"}</Label>
      </output>
    </form>
  );
};

export default InputGroupExample;
