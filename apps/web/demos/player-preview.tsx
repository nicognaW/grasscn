import type { DemoVariables } from "../demo-variables";
import * as React from 'react';
import { PlayerPreview } from '../registry/ui/player-preview';
import { Button } from '../registry/ui/button';
import { Input } from '../registry/ui/input';
import type { DemoProps } from '../types';

export default function PlayerDemo({ scale }: DemoProps) {
  const [name, setName] = React.useState("Nyanki"),
    [username, setUsername] = React.useState<string>(),
    [skin, setSkin] = React.useState<"wide/steve" | "slim/alex">("wide/steve"),
    [reset, setReset] = React.useState(0);

  return (
    <div
      className="demo-stage demo-stage-display-grid demo-stage-gap-20"
      data-stage="player-preview"
    >
      <div className="flex justify-center">
        <PlayerPreview
          key={reset}
          scale={scale}
          skin={skin}
          username={username}
          aria-label="Player preview"
        />
      </div>
      <div className="flex gap-3 flex-wrap">
        <Button
          scale={scale}
          className="w-(--demo-width)"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${70 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
          onClick={() => {
            setSkin("wide/steve");
            setUsername(undefined);
          }}
        >
          Steve
        </Button>
        <Button
          scale={scale}
          className="w-(--demo-width)"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${70 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
          onClick={() => {
            setSkin("slim/alex");
            setUsername(undefined);
          }}
        >
          Alex
        </Button>
        <Button
          scale={scale}
          className="w-(--demo-width)"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${90 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
          onClick={() => { setReset((v) => v + 1); }}
        >
          Reset view
        </Button>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();

          if (/^[A-Za-z0-9_]{1,16}$/u.test(name.trim()))
            setUsername(name.trim());
        }}
        className="flex gap-3 flex-wrap"
      >
        <Input
          value={name}
          onChange={(event) => { setName(event.target.value); }}
          aria-label="Player name"
          scale={scale}
          maxLength={16}
          className="w-(--demo-width)"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${150 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
        />
        <Button
          type="submit"
          scale={scale}
          disabled={!/^[A-Za-z0-9_]{1,16}$/u.test(name.trim())}
          className="w-(--demo-width)"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${100 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
        >
          Load skin
        </Button>
      </form>
      <p className="grass-note">
        Drag to rotate. Arrow keys turn the player; Home resets the view.
      </p>
    </div>
  );
}
