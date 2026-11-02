import * as React from 'react'
import {PlayerList,Scoreboard,type PlayerListEntry} from '../registry/ui/player-list'
import {Button} from '../registry/ui/button'
import type {DemoProps} from '../types'

const initial: PlayerListEntry[] = [
  { id: "alex", name: "Alex", skin: "slim/alex", latency: 42, score: 180 },
  { id: "steve", name: "Steve", skin: "wide/steve", latency: 84, score: 156 },
  { id: "kai", name: "Kai", skin: "wide/kai", latency: 220, score: 128 },
];

const largerCrew: PlayerListEntry[] = Array.from({ length: 24 }, (_, i) => ({
  ...initial[i % initial.length],
  id: `member-${i}`,
  name: `Player${String(i + 1).padStart(2, "0")}`,
  score: 90 + i * 3,
}));

export default function PlayerListDemo({ scale }: DemoProps) {
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
      <div
        style={{
          display: "flex",
          gap: 28,
          flexWrap: "wrap",
          alignItems: "start",
          maxWidth: "100%",
        }}
      >
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
      <div className="flex gap-3 flex-wrap">
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
}
