import * as React from "react";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "../registry/ui/alert-dialog";
import { Input } from "../registry/ui/input";
import { Textarea } from "../registry/ui/textarea";
import type { DemoProps } from "../types";

export default function AlertDialogDemo({ scale }: DemoProps) {
  const [open, setOpen] = React.useState(false);

  const [title, setTitle] = React.useState("Are you sure?"),
    [message, setMessage] = React.useState("This action cannot be undone."),
    [confirmed, setConfirmed] = React.useState(0);

  return (
    <>
      <div className="demo-options">
        <label>
          Title
          <Input
            aria-label="Alert dialog title"
            value={title}
            onChange={(event) => { setTitle(event.target.value); }}
            className="w-60" 
          />
        </label>
        <label>
          Message
          <Textarea
            aria-label="Alert dialog message"
            value={message}
            onChange={(event) => { setMessage(event.target.value); }}
            style={{ width: 320, height: 100 }}
          />
        </label>
      </div>
      <div className="demo-stage" data-stage="alert-dialog">
        <AlertDialog scale={scale} open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger>Open confirmation</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{title || " "}</AlertDialogTitle>
              <AlertDialogDescription>{message}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={() => {
                  setConfirmed((n) => n + 1);
                  setOpen(false);
                }}
              >
                Yes
              </AlertDialogAction>
              <AlertDialogCancel>No</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="Alert dialog confirmations">{`Confirmed ${confirmed} ${confirmed === 1 ? "time" : "times"}`}</output>
        <span>Confirm or cancel an action</span>
      </div>
    </>
  );
}
