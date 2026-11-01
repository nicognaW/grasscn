"use client";

import { useState } from "react";

import { Button } from "../registry/ui/button";
import { Input } from "../registry/ui/input";
import { toast } from "../registry/ui/sonner";
import { Textarea } from "../registry/ui/textarea";

/** Adapted from the retained playground; the primary example owns this page's one Toaster. */
export function SonnerPlayground({ scale }: { scale: 1 | 2 | 3 }) {
  const [title, setTitle] = useState("World saved");
  const [message, setMessage] = useState(
    "Your progress has been saved.\n世界已保存"
  );
  const [shown, setShown] = useState(0);
  return (
    <>
      <div className="demo-options">
        <label>
          Title
          <Input
            aria-label="Sonner title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          Message
          <Textarea
            aria-label="Sonner message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>
      </div>
      <Button
        scale={scale}
        onClick={() => {
          toast(title, { description: message });
          setShown((value) => value + 1);
        }}
      >
        Show message
      </Button>
      <output aria-live="polite">Shown {shown} times</output>
    </>
  );
}
