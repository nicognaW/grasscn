import ButtonExample from "../button-example";
import type { ExampleDefinition } from "../definition";

export const buttonExamples = {
  "button-example": {
    Component: ButtonExample,
    filename: "button-example.tsx",
    title: "Button example",
  },
} satisfies Record<string, ExampleDefinition>;
