"use client";

import { Button } from "@/components/ui/button";
import { useFireworks } from "@/components/ui/fireworks";

const FireworksExample = () => {
  const launch = useFireworks();

  return (
    <Button
      onClick={(event) => {
        launch(event.currentTarget);
      }}
    >
      Launch fireworks
    </Button>
  );
};

export default FireworksExample;
