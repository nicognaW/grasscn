import * as React from "react";

import type { DemoVariables } from "../demo-variables";
import { Button } from "../registry/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "../registry/ui/table";
import type { DemoProps } from "../types";
import { useDemoWidth } from "../use-demo-width";

const worlds = [
  { name: "Grasslands", players: 4 },
  { name: "你好，世界", players: 2 },
  { name: "Deep Dark", players: 1 },
];

const TableDemo = ({ scale }: DemoProps) => {
  const { ref: stageRef, width: stageWidth } = useDemoWidth(scale);
  const textWidth = Math.max(16, Math.floor((stageWidth - 24) / 3));

  const [selected, setSelected] = React.useState("");

  return (
    <>
      <div ref={stageRef} className="demo-stage" data-stage="table">
        <Table scale={scale} aria-label="Saved worlds" className="table-fixed">
          <TableCaption>Select a world to explore.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead maxTextWidth={textWidth}>World</TableHead>
              <TableHead maxTextWidth={textWidth}>Players</TableHead>
              <TableHead maxTextWidth={textWidth}>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {worlds.map((world) => {
              const demoLayout1: DemoVariables = {
                "--demo-owned-table-1-width": `${Math.min(60, textWidth) * scale}px`,
              };

              return (
                <TableRow
                  key={world.name}
                  data-state={selected === world.name ? "selected" : undefined}
                  aria-selected={selected === world.name}
                  tabIndex={0}
                  onClick={() => {
                    setSelected(world.name);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(world.name);
                    }
                  }}
                >
                  <TableCell maxTextWidth={textWidth}>{world.name}</TableCell>
                  <TableCell maxTextWidth={textWidth}>
                    {world.players}
                  </TableCell>
                  <TableCell>
                    <Button
                      scale={scale}
                      type="button"
                      className="demo-owned-table-1"
                      style={demoLayout1}
                      onClick={() => {
                        setSelected(world.name);
                      }}
                    >
                      Join
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3}>3 saved worlds</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="Selected world">
          {selected || "Choose a world"}
        </output>
      </div>
    </>
  );
};

export { TableDemo as default };
