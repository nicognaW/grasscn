import { buttonExamples } from "./button/catalog";
import { chartExamples } from "./charts/catalog";
import type { ExampleDefinition } from "./definition";
import { layoutExamples } from "./layout/catalog";
import { minecraftExamples } from "./minecraft/catalog";

// Family owners register their catalog here; the server renderer needs no family-specific logic.
export const examples: Readonly<Record<string, ExampleDefinition>> = {
  ...buttonExamples,
  ...chartExamples,
  ...layoutExamples,
  ...minecraftExamples,
};
