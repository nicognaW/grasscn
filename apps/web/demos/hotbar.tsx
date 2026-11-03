import * as React from "react";

import { Hotbar } from "../registry/ui/hotbar";
import { minecraftBadgeAssets } from "../registry/ui/minecraft-badge-assets";
import type { DemoProps } from "../types";

const tools = [
  "Draw",
  "Select",
  "Move",
  "Measure",
  "Connect",
  "Comment",
  "Inspect",
  "Preview",
  "Publish",
];

const HotbarDemo = ({ scale }: DemoProps) => {
  const [value, setValue] = React.useState(0);

  return (
    <div
      className="demo-stage demo-layout-demos-hotbar-1"
      data-stage="hotbar"
      style={{ display: "grid", gap: 20, padding: 20 }}
    >
      <Hotbar
        value={value}
        onValueChange={setValue}
        scale={scale}
        background="#202020"
        items={tools.map((label, i) => ({
          id: label,
          label,
          icon:
            i === 0 ? (
              <img src={minecraftBadgeAssets.diamond} alt="" />
            ) : (
              <span aria-hidden="true">{i + 1}</span>
            ),
        }))}
      />
      <p>{tools[value]}</p>
      <p className="grass-note">
        Choose a tool. Use 1–9, arrow keys or the scroll wheel.
      </p>
    </div>
  );
};

export { HotbarDemo as default };
