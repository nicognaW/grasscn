"use client";

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";

export default function Example() {
  return (
    <AvatarGroup scale={2} aria-label="World members">
      <Avatar>
        <AvatarImage skin="wide/steve" alt="Steve" />
        <AvatarFallback>S</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarImage skin="slim/alex" alt="Alex" />
      </Avatar>
      <AvatarGroupCount aria-label="Two more players">+2</AvatarGroupCount>
    </AvatarGroup>
  );
}
