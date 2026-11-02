import type { CSSProperties } from "react";

export interface DemoVariables extends CSSProperties {
  "--demo-gap"?: `${number}px`;
  "--demo-height"?: `${number}px`;
  "--demo-margin-bottom"?: `${number}px`;
  "--demo-min-height"?: `${number}px`;
  "--demo-padding"?: `${number}px`;
  "--demo-padding-top"?: `${number}px`;
  "--demo-stage-gap"?: `${number}px`;
  "--demo-stage-padding"?: `${number}px`;
  "--demo-width"?: `${number}px`;
  "--mc-scale"?: number;
}
