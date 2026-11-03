import * as React from "react"
import {Empty,EmptyHeader,EmptyTitle,EmptyDescription,EmptyContent} from "../registry/ui/empty"
import {Input} from "../registry/ui/input"
import {Textarea} from "../registry/ui/textarea"
import {Button} from "../registry/ui/button"
import type {DemoProps} from "../types"
import {useDemoWidth} from "../use-demo-width"

const EmptyDemo = ({ scale }: DemoProps) => {
  const stage = useDemoWidth(scale);

  const [title, setTitle] = React.useState("No worlds found");

  const [description, setDescription] = React.useState(
    "Create your first world.\nYour adventure starts here."
  );

  const [worlds, setWorlds] = React.useState(0);

  return (
    <>
      <div className="demo-options">
        <label>
          Title
          <Input
            aria-label="Empty state title"
            scale={scale}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            className="w-70"
          />
        </label>
        <label>
          Description
          <Textarea
            aria-label="Empty state description"
            scale={scale}
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
            }}
            style={{ height: 100, width: 320 }}
          />
        </label>
      </div>
      <div ref={stage.ref} className="demo-stage" data-stage="empty">
        <div className="demo-pair">
          <span>EMPTY WORLD LIST</span>
          <Empty scale={scale}>{title}</Empty>
        </div>
        <div className="demo-pair">
          <span>WITH ACTION</span>
          <Empty scale={scale}>
            <EmptyHeader>
              <EmptyTitle maxWidth={Math.min(180, stage.width)} align="center">
                {title}
              </EmptyTitle>
              <EmptyDescription
                maxWidth={Math.min(180, stage.width)}
                align="center"
              >
                {description}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                scale={scale}
                onClick={() => {
                  setWorlds((v) => v + 1);
                }}
              >
                Create world
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="Created demo worlds">
          Created {worlds} worlds
        </output>
      </div>
    </>
  );
};

export { EmptyDemo as default };
