"use client";

import { Button } from "@/components/ui/button";
import { Toaster, toast } from "@/components/ui/sonner";

const SonnerExample = () => (
  <>
    <Button
      onClick={() => {
        toast("World saved", { description: "Your progress has been saved." });
      }}
    >
      Show message
    </Button>
    <Toaster />
  </>
);

export default SonnerExample;
