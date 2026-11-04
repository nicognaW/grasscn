import * as React from "react";

import type { DemoVariables } from "../demo-variables";
import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentTrigger,
  AttachmentAction,
  AttachmentActions,
} from "../registry/ui/attachment";
import { Button } from "../registry/ui/button";
import { Input } from "../registry/ui/input";
import type { DemoProps } from "../types";

const AttachmentDemo = ({ scale }: DemoProps) => {
  const [name, setName] = React.useState("New World.zip");
  const [opened, setOpened] = React.useState(0);
  const [removed, setRemoved] = React.useState(false);

  return (
    <>
      <div className="demo-options">
        <label>
          Archive
          <Input
            aria-label="Attachment name"
            scale={scale}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            className="w-70 max-w-full"
          />
        </label>
        <Button
          scale={scale}
          className="w-(--demo-width)"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${90 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
          disabled={!removed}
          onClick={() => {
            setRemoved(false);
          }}
        >
          Restore file
        </Button>
      </div>
      <div className="demo-stage min-h-25" data-stage="attachment">
        {!removed ? (
          <Attachment
            scale={scale}
            selected={opened > 0}
            className="max-w-full"
          >
            <AttachmentMedia />
            <AttachmentContent>
              <AttachmentTitle>{name}</AttachmentTitle>
              <AttachmentDescription>
                {"Overworld save\n2.4 MB"}
              </AttachmentDescription>
            </AttachmentContent>
            <AttachmentTrigger
              aria-label="Preview world archive"
              onClick={() => {
                setOpened((value) => value + 1);
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
        ) : (
          <span>NO ARCHIVE SELECTED</span>
        )}
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="Attachment status">
          {removed ? "Attachment removed" : `Previewed ${opened} times`}
        </output>
      </div>
    </>
  );
};

export { AttachmentDemo as default };
