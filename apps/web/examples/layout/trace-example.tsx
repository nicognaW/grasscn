"use client";

import { useState } from "react";

import {
  Trace,
  TraceLine,
  TraceTitle,
  TraceDescription,
  TraceCollapsible,
  TraceCollapsibleTrigger,
  TraceCollapsibleContent,
} from "@/components/ui/trace";

export default function TraceExample() {
  const [open, setOpen] = useState(false);
  return (
    <Trace>
      <TraceLine status="running">
        <TraceTitle>Building terrain</TraceTitle>
        <TraceDescription>1.2s</TraceDescription>
      </TraceLine>
      <TraceLine status="pending">
        <TraceTitle>Waiting for chunks</TraceTitle>
      </TraceLine>
      <TraceCollapsible open={open} onOpenChange={setOpen}>
        <TraceCollapsibleTrigger>Details</TraceCollapsibleTrigger>
        <TraceCollapsibleContent>Placed 64 blocks.</TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}
