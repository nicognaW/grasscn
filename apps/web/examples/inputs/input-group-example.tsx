"use client";
import { useState } from "react";

import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
export default function InputGroupExample() {
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSent(message);
        setMessage("");
      }}
      style={{ display: "grid", gap: 12 }}
    >
      <InputGroup>
        <InputGroupInput
          aria-label="Chat message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Message"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton type="submit" style={{ width: 120 }}>
            Send
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <output aria-label="Sent message">
        <Label>{sent || "No message sent"}</Label>
      </output>
    </form>
  );
}
