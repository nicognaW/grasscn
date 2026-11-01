"use client";

import { Marker, MarkerIcon, MarkerContent } from "@/components/ui/marker";

export default function MarkerBorder() {
  return (
    <Marker variant="border">
      <MarkerIcon>*</MarkerIcon>
      <MarkerContent maxWidth={200}>Checkpoint saved</MarkerContent>
    </Marker>
  );
}
