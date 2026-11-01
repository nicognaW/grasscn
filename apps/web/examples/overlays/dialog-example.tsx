"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export default function Example() {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(0);
  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger>Open world settings</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>World settings</DialogTitle>
            <DialogDescription>A helpful description.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose>Cancel</DialogClose>
            <Button
              onClick={() => {
                setSaved(saved + 1);
                setOpen(false);
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <output aria-label="Saved worlds">{saved} saved</output>
    </div>
  );
}
