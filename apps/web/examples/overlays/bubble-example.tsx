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
            /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
            style={{ width: 140 }}
            /* eslint-enable shadcn/no-inline-styles */
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
