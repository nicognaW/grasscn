"use client";

import { Scoreboard } from "@/components/ui/player-list";

const PlayerListScoreboard = () => (
  <Scoreboard
    title="Build points"
    entries={[
      { id: "alex", name: "Alex", score: 180 },
      { id: "steve", name: "Steve", score: 156 },
      { id: "kai", name: "Kai", score: 128 },
    ]}
  />
);

export default PlayerListScoreboard;
