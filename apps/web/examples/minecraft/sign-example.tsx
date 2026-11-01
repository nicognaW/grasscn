"use client";

import { Sign } from "@/components/ui/sign";

const SignExample = () => (
  <Sign
    lines={["Welcome", "to grasscn", "", "Open daily"]}
    aria-label="Standing sign"
  />
);

export default SignExample;
