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

export default function Example() {
  const [removed, setRemoved] = useState(false);
  const [opened, setOpened] = useState(0);
  return (
    <div>
      {removed ? (
        <Button onClick={() => setRemoved(false)}>Restore archive</Button>
      ) : (
        <Attachment style={{ width: 500, maxWidth: "100%" }}>
          <AttachmentMedia />
          <AttachmentContent>
            <AttachmentTitle>New World.zip</AttachmentTitle>
            <AttachmentDescription>
              {"Overworld save\n2.4 MB"}
            </AttachmentDescription>
          </AttachmentContent>
          <AttachmentTrigger
            aria-label="Preview archive"
            onClick={() => setOpened(opened + 1)}
          />
          <AttachmentActions>
            <AttachmentAction
              aria-label="Remove archive"
              onClick={() => setRemoved(true)}
            >
              X
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      )}
      <output aria-label="Archive previews">{opened} previews</output>
    </div>
  );
}
