"use client";

import { useState } from "react";

import { Trading } from "@/components/ui/trading";
import type { TradeOffer } from "@/components/ui/trading";

// Original 16x16 item PNGs included with this example; no demo helper required.
const emerald =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIVBMVEUAAADb/+uv/c2C9q1B84QX3WIAqiwAlSkAexgAUwAALQC5+lfcAAAAAXRSTlMAQObYZgAAAENJREFUeNpjwApmzoTQnCKuE8CMiSpuUWABIRW31AUghmqQWhmUYdaGxgg2a4UyPEpBDIZpFe1WEAPTgTJgsGoVVpsBDRwS6h42ddsAAAAASUVORK5CYII=";

const bread =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAGFBMVEUAAAC8iSeieSSMZh5lSxdXQRRMOBE/Lg5TtFIkAAAAAXRSTlMAQObYZgAAAFRJREFUeNp1yzESwCAMA0GfpOD//zgFA4Qi6tZzrv8lyUVLzrEB5F5GNuBeBmTkPgbh9PyfPfboFcjgHQBouyKA44p0uR5L/rieeHpvJBnT69J9/ALDfwGjVuZpcwAAAABJRU5ErkJggg==";

/* eslint-disable shadcn/no-inline-styles -- Native item icons require exact pixelated texture sizing in both independent consumer frameworks. */
const iconStyle = {
  height: "100%",
  imageRendering: "pixelated" as const,
  width: "100%",
};
/* eslint-enable shadcn/no-inline-styles */

const offers: TradeOffer[] = [
  {
    cost: {
      count: 1,
      icon: <img src={emerald} alt="" style={iconStyle} />,
      label: "Emerald",
    },
    id: "bread",
    label: "Bread",
    result: {
      count: 1,
      icon: <img src={bread} alt="" style={iconStyle} />,
      label: "Bread",
    },
  },
];

const TradingExample = () => {
  const [completed, setCompleted] = useState(0);

  return (
    <div /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
      className="grid gap-4"
      style={{ maxWidth: "100%" }}
      /* eslint-enable shadcn/no-inline-styles */
    >
      <div /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
        className="overflow-x-auto"
        style={{ maxWidth: "100%" }}
        /* eslint-enable shadcn/no-inline-styles */
      >
        <Trading
          title="Village market"
          offers={offers}
          onTrade={() => {
            setCompleted((value) => value + 1);
          }}
        />
      </div>
      <output aria-live="polite">{completed} trades completed</output>
    </div>
  );
};

export default TradingExample;
