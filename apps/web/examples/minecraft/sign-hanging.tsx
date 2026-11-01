"use client";
import { HangingSign } from "@/components/ui/sign";
export default function SignHanging() {
  return (
    <HangingSign
      lines={["Welcome", "to grasscn", "", "Open daily"]}
      wood="oak"
      aria-label="Hanging sign"
    />
  );
}
