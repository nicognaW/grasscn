"use client";

import { HangingSign } from "@/components/ui/sign";

const SignHanging = () => (
  <HangingSign
    lines={["Welcome", "to grasscn", "", "Open daily"]}
    wood="oak"
    aria-label="Hanging sign"
  />
);

export default SignHanging;
