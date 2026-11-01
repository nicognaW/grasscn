"use client";

import { Button } from "@/components/ui/button";
import { Toaster, toast } from "@/components/ui/sonner";

export default function SonnerExample() {
  return (
    <>
      <Button
        onClick={() =>
          toast("World saved", { description: "Your progress has been saved." })
        }
      >
        Show message
      </Button>
      <Toaster />
    </>
  );
}
