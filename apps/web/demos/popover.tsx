import type { DemoVariables } from "../demo-variables";
import * as React from "react"
import { Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverTitle, PopoverDescription } from "../registry/ui/popover"
import { Button } from "../registry/ui/button"
import { Input } from "../registry/ui/input"
import { Textarea } from "../registry/ui/textarea"
import type { DemoProps } from "../types"

export default function PopoverDemo({ scale }: DemoProps) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("World Settings");
  const [message, setMessage] = React.useState("Configure your world.");
  const [name, setName] = React.useState("Minecraft");
  const [saved, setSaved] = React.useState(false);

  return (
    <>
      <div className="demo-options">
        <label>
          Title
          <Input
            aria-label="Popover title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-60"
          />
        </label>
        <label>
          Message
          <Textarea
            aria-label="Popover message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            style={{ width: 320, height: 100 }}
          />
        </label>
      </div>
      <div className="demo-stage" data-stage="popover">
        <Popover scale={scale} open={open} onOpenChange={setOpen}>
          <PopoverTrigger>Open world options</PopoverTrigger>
          <PopoverContent collisionPadding={8}>
            <PopoverHeader>
              <PopoverTitle>{title || " "}</PopoverTitle>
              <PopoverDescription>{message}</PopoverDescription>
            </PopoverHeader>
            <form
              className="grid gap-(--demo-gap)"
              style={
                /* SAFETY: satisfies checks --demo-gap against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
                {
                  "--demo-gap": `${6 * scale}px`,
                } satisfies DemoVariables as DemoVariables
              }
              onSubmit={(event) => {
                event.preventDefault();
                setSaved(true);
                setOpen(false);
              }}
            >
              <label htmlFor="preview-popover-world">World name</label>
              <Input
                id="preview-popover-world"
                scale={scale}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setSaved(false);
                }}
                className="w-full"
              />
              <Button type="submit" scale={scale} className="w-full">
                Done
              </Button>
            </form>
          </PopoverContent>
        </Popover>
      </div>
      <div className="demo-result" aria-live="polite">
        <span />
        <output aria-label="Popover status">
          {saved ? "World settings saved" : "Open your world options"}
        </output>
        <span>Popup panel</span>
      </div>
    </>
  );
}
