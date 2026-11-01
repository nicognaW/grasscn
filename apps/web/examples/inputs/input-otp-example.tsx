"use client";

import { useState } from "react";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";

const InputOTPExample = () => {
  const [value, setValue] = useState("");
  const [complete, setComplete] = useState("");

  return (
    <div /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
      style={{ display: "grid", gap: 12 }}
      /* eslint-enable shadcn/no-inline-styles */
    >
      <InputOTP
        aria-label="One-time code"
        maxLength={6}
        value={value}
        onChange={setValue}
        onComplete={setComplete}
        inputMode="text"
        pushPasswordManagerStrategy="none"
      >
        <InputOTPGroup>
          {[0, 1, 2].map((index) => (
            <InputOTPSlot key={index} index={index} />
          ))}
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          {[3, 4, 5].map((index) => (
            <InputOTPSlot key={index} index={index} />
          ))}
        </InputOTPGroup>
      </InputOTP>
      <output aria-label="Completed code">
        <Label>
          {complete ? `Complete: ${complete}` : "Enter six characters"}
        </Label>
      </output>
    </div>
  );
};

export default InputOTPExample;
