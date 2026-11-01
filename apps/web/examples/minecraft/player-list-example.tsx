"use client";
import { useState } from "react";

import { PlayerList, type PlayerListEntry } from "@/components/ui/player-list";
const players: PlayerListEntry[] = [
  { id: "alex", name: "Alex", skin: "slim/alex", latency: 42, score: 180 },
  { id: "steve", name: "Steve", skin: "wide/steve", latency: 84, score: 156 },
  { id: "kai", name: "Kai", skin: "wide/kai", latency: 220, score: 128 },
];
export default function PlayerListExample() {
  const [selected, setSelected] = useState("Alex");
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <PlayerList
        players={players}
        header="Build crew"
        footer="3 online"
        onPlayerSelect={(id) =>
          setSelected(players.find((player) => player.id === id)?.name ?? id)
        }
      />
      <output aria-live="polite">{selected}</output>
    </div>
  );
}
