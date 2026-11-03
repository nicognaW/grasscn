"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from "@/components/ui/item";

const Example = () => {
  const [opened, setOpened] = useState(0);

  return (
    <div>
      <Item>
        <ItemMedia />
        <ItemContent>
          <ItemTitle>New World</ItemTitle>
          <ItemDescription>{"world-1\nSurvival Mode"}</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button
            className="w-30"

            onClick={() => {
              setOpened(opened + 1);
            }}
          >
            Open
          </Button>
        </ItemActions>
      </Item>
      <output aria-label="Opened worlds">{opened} opened</output>
    </div>
  );
};

export default Example;
