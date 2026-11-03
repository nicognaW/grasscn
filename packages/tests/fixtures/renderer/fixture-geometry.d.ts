import "react";

declare module "react" {
  interface CSSProperties {
    "--fixture-height"?: string;
    "--fixture-width"?: string;
    "--fixture-x"?: string;
    "--fixture-y"?: string;
  }
}
