import type { ComponentType } from "react";

/** Each entry binds a runnable consumer example to the exact file shown beside it. */
export interface ExampleDefinition {
  Component: ComponentType;
  /** Relative to examples/. Never a separately authored snippet. */
  filename: string;
  title: string;
  description?: string;
}
