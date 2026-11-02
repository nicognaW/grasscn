import * as React from "react"
import {createPortal} from "react-dom"
import {Button} from "../registry/ui/button"
import {Input} from "../registry/ui/input"
import {Textarea} from "../registry/ui/textarea"
import {Toaster,toast} from "../registry/ui/sonner"
import type {DemoProps} from "../types"

export default function SonnerDemo({ scale }: DemoProps) {
  const [title, setTitle] = React.useState("World saved");

  const [message, setMessage] = React.useState(
    "Your progress has been saved.\n世界已保存"
  );

  const [shown, setShown] = React.useState(0);

  return (
    <>
      <div className="demo-options">
        <label>
          Title
          <Input
            aria-label="Sonner title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
            className="w-70"
          />
        </label>
        <label>
          Message
          <Textarea
            aria-label="Sonner message"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
            }}
            style={{ width: 320, height: 100 }}
          />
        </label>
      </div>
      <div className="demo-stage" data-stage="sonner">
        <Button
          scale={scale}
          onClick={() => {
            toast(title, { description: message });
            setShown((v) => v + 1);
          }}
        >
          Show message
        </Button>
      </div>
      <div className="demo-result" aria-live="polite">
        <span />
        <output aria-label="Sonner messages">
          Shown {shown} time{shown === 1 ? "" : "s"}
        </output>
      </div>
      {createPortal(<Toaster scale={scale} />, document.body)}
    </>
  );
}
