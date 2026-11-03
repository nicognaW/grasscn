"use client";

import { useState } from "react";

import {
  BubbleGroup,
  Bubble,
  BubbleContent,
  BubbleReactions,
} from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";

const Example = () => {
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
            className="w-35"

            aria-pressed={liked}
            onClick={() => {
              setLiked(!liked);
            }}
          >
            {liked ? "Liked" : "Like"}
          </Button>
        </BubbleReactions>
      </Bubble>
    </BubbleGroup>
  );
};

export default Example;
