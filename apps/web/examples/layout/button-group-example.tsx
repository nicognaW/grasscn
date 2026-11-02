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
        /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
        style={{ width: 160 }}
        /* eslint-enable shadcn/no-inline-styles */
        onClick={() => {
          setSaved(true);
        }}
      >
        Save
      </Button>
      <ButtonGroupSeparator />
      <Button
        /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
        style={{ width: 160 }}
        /* eslint-enable shadcn/no-inline-styles */
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
