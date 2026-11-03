"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ButtonGroup,
  ButtonGroupText,
  ButtonGroupSeparator,
} from "@/components/ui/button-group";

const ButtonGroupExample = () => {
  const [saved, setSaved] = useState(false);

  return (
    <ButtonGroup aria-label="World actions">
      <Button
        className="w-40"

        onClick={() => {
          setSaved(true);
        }}
      >
        Save
      </Button>
      <ButtonGroupSeparator />
      <Button
        className="w-40"

        onClick={() => {
          setSaved(false);
        }}
      >
        Reset
      </Button>
      <ButtonGroupText aria-live="polite">
        {saved ? "Saved" : "Unsaved"}
      </ButtonGroupText>
    </ButtonGroup>
  );
};

export default ButtonGroupExample;
