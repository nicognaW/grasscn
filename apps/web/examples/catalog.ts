import { buttonExamples } from "./button/catalog";
import { chartExamples } from "./charts/catalog";
import type { ExampleDefinition } from "./definition";
import { inputExamples } from "./inputs/catalog";
import { layoutExamples } from "./layout/catalog";
import { minecraftExamples } from "./minecraft/catalog";
import { overlayExamples } from "./overlays/catalog";

// Family owners register their catalog here; the server renderer needs no family-specific logic.
interface ExampleCatalog {
  readonly [name: string]: ExampleDefinition;
}

export const examples: ExampleCatalog = {
  ...buttonExamples,
  ...inputExamples,
  ...chartExamples,
  ...layoutExamples,
  ...overlayExamples,
  ...minecraftExamples,
};
