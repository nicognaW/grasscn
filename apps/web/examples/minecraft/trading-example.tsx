"use client";
import { useState } from "react";

import { Trading, type TradeOffer } from "@/components/ui/trading";
// Original 16x16 item PNGs included with this example; no demo helper required.
const emerald =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIVBMVEUAAADb/+uv/c2C9q1B84QX3WIAqiwAlSkAexgAUwAALQC5+lfcAAAAAXRSTlMAQObYZgAAAENJREFUeNpjwApmzoTQnCKuE8CMiSpuUWABIRW31AUghmqQWhmUYdaGxgg2a4UyPEpBDIZpFe1WEAPTgTJgsGoVVpsBDRwS6h42ddsAAAAASUVORK5CYII=";
const bread =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAGFBMVEUAAAC8iSeieSSMZh5lSxdXQRRMOBE/Lg5TtFIkAAAAAXRSTlMAQObYZgAAAFRJREFUeNp1yzESwCAMA0GfpOD//zgFA4Qi6tZzrv8lyUVLzrEB5F5GNuBeBmTkPgbh9PyfPfboFcjgHQBouyKA44p0uR5L/rieeHpvJBnT69J9/ALDfwGjVuZpcwAAAABJRU5ErkJggg==";
const iconStyle = {
  width: "100%",
  height: "100%",
  imageRendering: "pixelated" as const,
};
const offers: TradeOffer[] = [
  {
    id: "bread",
    label: "Bread",
    cost: {
      label: "Emerald",
      count: 1,
      icon: <img src={emerald} alt="" style={iconStyle} />,
    },
    result: {
      label: "Bread",
      count: 1,
      icon: <img src={bread} alt="" style={iconStyle} />,
    },
  },
];
export default function TradingExample() {
  const [completed, setCompleted] = useState(0);
  return (
    <div style={{ display: "grid", gap: 16, maxWidth: "100%" }}>
      <div style={{ maxWidth: "100%", overflowX: "auto" }}>
        <Trading
          title="Village market"
          offers={offers}
          onTrade={() => setCompleted((value) => value + 1)}
        />
      </div>
      <output aria-live="polite">{completed} trades completed</output>
    </div>
  );
}
