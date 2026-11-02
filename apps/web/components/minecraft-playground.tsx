"use client";

import AdvancementTreeDemo from "../demos/advancement-tree";
import BookDemo from "../demos/book";
import HotbarDemo from "../demos/hotbar";
import HudDemo from "../demos/hud";
import MapDemo from "../demos/map";
import PlayerListDemo from "../demos/player-list";
import PlayerPreviewDemo from "../demos/player-preview";
import SignDemo from "../demos/sign";
import TradingDemo from "../demos/trading";

import "./documentation.css";

const playgrounds = {
  "advancement-tree": AdvancementTreeDemo,
  book: BookDemo,
  hotbar: HotbarDemo,
  hud: HudDemo,
  map: MapDemo,
  "player-list": PlayerListDemo,
  "player-preview": PlayerPreviewDemo,
  sign: SignDemo,
  trading: TradingDemo,
};

export const MinecraftPlayground = ({
  name,
}: {
  name: keyof typeof playgrounds;
}) => {
  const Demo = playgrounds[name];

  return (
    <section
      className="documentation-playground minecraft-example"
      aria-label={`${name} playground`}
    >
      <Demo scale={2} />
    </section>
  );
};
