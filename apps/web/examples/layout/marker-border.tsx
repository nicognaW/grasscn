"use client";

import { Marker, MarkerIcon, MarkerContent } from "@/components/ui/marker";

const MarkerBorder = () => (
  <Marker variant="border">
    <MarkerIcon>*</MarkerIcon>
    <MarkerContent maxWidth={200}>Checkpoint saved</MarkerContent>
  </Marker>
);

export default MarkerBorder;
