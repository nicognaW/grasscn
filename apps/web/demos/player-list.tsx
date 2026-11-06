import * as React from "react";

import { Button } from "../registry/ui/button";
import type { PlayerListEntry } from "../registry/ui/player-list";
import { PlayerList, Scoreboard } from "../registry/ui/player-list";
import type { DemoProps } from "../types";

const initial: PlayerListEntry[] = [
  {
    id: "alex",
    latency: 42,
    name: "Alex",
    score: 180,
    skin: "slim/alex",
  },
  {
    id: "steve",
    latency: 84,
    name: "Steve",
    score: 156,
    skin: "wide/steve",
  },
  {
    id: "kai",
    latency: 220,
    name: "Kai",
    score: 128,
    skin: "wide/kai",
  },
];

const largerCrew: PlayerListEntry[] = Array.from({ length: 24 }, (_, i) => ({
  ...initial[i % initial.length],
  id: `member-${i}`,
  name: `Player${String(i + 1).padStart(2, "0")}`,
  score: 90 + i * 3,
}));

const PlayerListDemo = ({ scale }: DemoProps) => {
  const [players, setPlayers] = React.useState(initial);
  const [selected, setSelected] = React.useState("alex");
  const [large, setLarge] = React.useState(false);

  const switchCrew = () => {
    const next = large ? initial : largerCrew;
    setPlayers(next);
    setSelected(next[0].id);
    setLarge(!large);
  };

  return (
    <div
      className="demo-stage demo-stage-display-grid demo-stage-gap-20 max-w-full"
      data-stage="player-list"
    >
      <div className="demo-layout-demos-player-list-1 max-w-full">
        <div className="max-w-full overflow-x-auto">
          <PlayerList
            scale={scale}
            players={players}
            header="Build crew"
            footer={`${players.length} online`}
            onPlayerSelect={setSelected}
          />
        </div>
        <Scoreboard
          scale={scale}
          title="Build points"
          entries={players.map((p) => ({
            id: p.id,
            name: p.name,
            score: p.score ?? 0,
          }))}
        />
      </div>
      <p className="grass-note">
        {players.find((p) => p.id === selected)?.name ?? "Select a player"}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          scale={scale}
          onClick={() => {
            setPlayers((old) =>
              old.map((p) =>
                p.id === selected ? { ...p, score: (p.score ?? 0) + 10 } : p
              )
            );
          }}
          disabled={!players.some((p) => p.id === selected)}
        >
          Award 10 points
        </Button>
        <Button scale={scale} onClick={switchCrew}>
          {large ? "Small crew" : "Larger crew"}
        </Button>
        <Button
          scale={scale}
          onClick={() => {
            setPlayers(initial);
            setLarge(false);
            setSelected("alex");
          }}
        >
          Reset scores
        </Button>
      </div>
    </div>
  );
};

export { PlayerListDemo as default };
