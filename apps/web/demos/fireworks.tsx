import type * as React from "react";

import { Button } from "../registry/ui/button";
import { useFireworks } from "../registry/ui/fireworks";
import type { DemoProps } from "../types";

// Launching from this button is the fireworks' website default path (Base
// mapping): the rocket sequence at the fixed seeds.
const FireworksDemo = ({ scale }: DemoProps) => {
  const launch = useFireworks();

  const fire = (event: React.MouseEvent<HTMLButtonElement>) => {
    launch(event.currentTarget);
  };

  return (
    <div className="demo-stage" data-stage="fireworks">
      <Button scale={scale} onClick={fire}>
        Launch fireworks
      </Button>
      <p className="grass-note">
        Each click launches one rocket from the button. Clicks overlap; with
        reduced motion only the sounds play.
      </p>
    </div>
  );
};

export default FireworksDemo;
