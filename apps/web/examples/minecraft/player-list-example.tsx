"use client";

import { useState } from "react";

import { PlayerList } from "@/components/ui/player-list";
import type { PlayerListEntry } from "@/components/ui/player-list";

const players: PlayerListEntry[] = [
  { id: "alex", latency: 42, name: "Alex", score: 180, skin: "slim/alex" },
  { id: "steve", latency: 84, name: "Steve", score: 156, skin: "wide/steve" },
  { id: "kai", latency: 220, name: "Kai", score: 128, skin: "wide/kai" },
];

const PlayerListExample = () => {
  const [selected, setSelected] = useState("Alex");

  return (
    <div className="grid [gap:16px]">
      <PlayerList
        players={players}
        header="Build crew"
        footer="3 online"
        onPlayerSelect={(id) => {
          setSelected(players.find((player) => player.id === id)?.name ?? id);
        }}
      />
      <output aria-live="polite">{selected}</output>
    </div>
  );
};

export default PlayerListExample;
