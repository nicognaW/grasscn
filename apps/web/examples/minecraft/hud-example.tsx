"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  HealthMeter,
  ArmorMeter,
  HungerMeter,
  AirMeter,
  ExperienceBar,
} from "@/components/ui/hud";

const HudExample = () => {
  const [health, setHealth] = useState(17);

  return (
    <div className="grid [gap:16px]">
      <HealthMeter value={health} />
      <ArmorMeter value={14} />
      <HungerMeter value={18} />
      <AirMeter value={7} />
      <ExperienceBar value={0.45} />
      <Button
        onClick={() => {
          setHealth((value) => Math.max(0, value - 3));
        }}
      >
        Take damage
      </Button>
      <Button
        onClick={() => {
          setHealth(20);
        }}
      >
        Heal
      </Button>
    </div>
  );
};

export default HudExample;
