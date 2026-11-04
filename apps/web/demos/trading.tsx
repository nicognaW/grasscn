import * as React from "react";

import type { TradeOffer } from "../registry/ui/trading";
import { Trading } from "../registry/ui/trading";
import type { DemoProps } from "../types";
import { tradingIcons } from "./trading-icons";

const goods = [
  ["book", "Field guide", 4],
  ["bread", "Bread", 1],
  ["compass", "Compass", 5],
  ["name_tag", "Name tag", 8],
  ["glass_bottle", "Glass bottle", 2],
  ["redstone", "Redstone", 3],
  ["paper", "Paper", 1],
  ["diamond", "Diamond", 12],
  ["book", "Enchanted guide", 16],
] as const;

const TradingDemo = ({ scale }: DemoProps) => {
  const [completed, setCompleted] = React.useState(0);
  const [selected, setSelected] = React.useState("0");

  const offers: TradeOffer[] = goods.map(([name, label, count], i) => ({
    cost: {
      count,
      icon: <img src={tradingIcons.emerald} alt="" />,
      label: "Emeralds",
    },
    id: String(i),
    inStock: i !== 8,
    label,
    result: { count: 1, icon: <img src={tradingIcons[name]} alt="" />, label },
  }));

  return (
    <div
      className="demo-stage demo-stage-display-grid demo-stage-gap-16 max-w-full"
      data-stage="trading"
    >
      <div className="max-w-full overflow-x-auto">
        <Trading
          scale={scale}
          title="Village market"
          offers={offers}
          selectedId={selected}
          onSelectedIdChange={setSelected}
          onTrade={() => {
            setCompleted((n) => n + 1);
          }}
        />
      </div>
      <output aria-live="polite">
        {completed
          ? `${completed} trade${completed === 1 ? "" : "s"} completed.`
          : "Choose an offer, then take the result."}
      </output>
      <p className="grass-note">
        Scroll through offers. The final offer is out of stock.
      </p>
    </div>
  );
};

export { TradingDemo as default };
