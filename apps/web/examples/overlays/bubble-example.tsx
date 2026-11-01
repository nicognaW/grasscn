"use client";

import { useState } from "react";

import {
  BubbleGroup,
  Bubble,
  BubbleContent,
  BubbleReactions,
} from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";

export default function Example() {
  const [liked, setLiked] = useState(false);
  return (
    <BubbleGroup>
      <Bubble from="user" author="Alex">
        <BubbleContent>Ready to explore?</BubbleContent>
      </Bubble>
      <Bubble from="assistant" align="end">
        <BubbleContent>Bring your pickaxe.</BubbleContent>
        <BubbleReactions>
          <Button
            style={{ width: 140 }}
            aria-pressed={liked}
            onClick={() => setLiked(!liked)}
          >
            {liked ? "Liked" : "Like"}
          </Button>
        </BubbleReactions>
      </Bubble>
    </BubbleGroup>
  );
}
