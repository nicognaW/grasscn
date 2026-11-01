"use client";
import { Sign } from "@/components/ui/sign";
export default function SignExample() {
  return (
    <Sign
      lines={["Welcome", "to grasscn", "", "Open daily"]}
      aria-label="Standing sign"
    />
  );
}
