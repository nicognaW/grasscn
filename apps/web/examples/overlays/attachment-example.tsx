"use client";

import { useState } from "react";

import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentTrigger,
  AttachmentActions,
  AttachmentAction,
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";

const Example = () => {
  const [removed, setRemoved] = useState(false);
  const [opened, setOpened] = useState(0);

  return (
    <div>
      {removed ? (
        <Button
          onClick={() => {
            setRemoved(false);
          }}
        >
          Restore archive
        </Button>
      ) : (
        <Attachment /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
          style={{ maxWidth: "100%", width: 500 }}
          /* eslint-enable shadcn/no-inline-styles */
        >
          <AttachmentMedia />
          <AttachmentContent>
            <AttachmentTitle>New World.zip</AttachmentTitle>
            <AttachmentDescription>
              {"Overworld save\n2.4 MB"}
            </AttachmentDescription>
          </AttachmentContent>
          <AttachmentTrigger
            aria-label="Preview archive"
            onClick={() => {
              setOpened(opened + 1);
            }}
          />
          <AttachmentActions>
            <AttachmentAction
              aria-label="Remove archive"
              onClick={() => {
                setRemoved(true);
              }}
            >
              X
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      )}
      <output aria-label="Archive previews">{opened} previews</output>
    </div>
  );
};

export default Example;
