"use client";
import { useState } from "react";

import { Slider } from "@/components/ui/slider";
export default function SliderExample() {
  const [volume, setVolume] = useState<number[]>([50]);
  return (
    <Slider
      aria-label="Volume"
      label={`Volume: ${volume[0]}%`}
      value={volume}
      onValueChange={(next) => setVolume(Array.isArray(next) ? next : [next])}
    />
  );
}
