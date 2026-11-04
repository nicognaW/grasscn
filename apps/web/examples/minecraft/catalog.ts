import type { ExampleDefinition } from "../definition";
import AdvancementTreeExample from "./advancement-tree-example";
import BookExample from "./book-example";
import FireworksExample from "./fireworks-example";
import HotbarExample from "./hotbar-example";
import HotbarTools from "./hotbar-tools";
import HudExample from "./hud-example";
import MapExample from "./map-example";
import MapLocator from "./map-locator";
import PlayerListExample from "./player-list-example";
import PlayerListScoreboard from "./player-list-scoreboard";
import PlayerPreviewAlex from "./player-preview-alex";
import PlayerPreviewExample from "./player-preview-example";
import RedstoneLampDisplayExample from "./redstone-lamp-display-example";
import SignExample from "./sign-example";
import SignHanging from "./sign-hanging";
import TradingExample from "./trading-example";

export const minecraftExamples = {
  "advancement-tree-example": {
    Component: AdvancementTreeExample,
    filename: "minecraft/advancement-tree-example.tsx",
    title: "Advancement Tree Example",
  },
  "book-example": {
    Component: BookExample,
    filename: "minecraft/book-example.tsx",
    title: "Book Example",
  },
  "fireworks-example": {
    Component: FireworksExample,
    filename: "minecraft/fireworks-example.tsx",
    title: "Fireworks Example",
  },
  "hotbar-example": {
    Component: HotbarExample,
    filename: "minecraft/hotbar-example.tsx",
    title: "Hotbar Example",
  },
  "hotbar-tools": {
    Component: HotbarTools,
    filename: "minecraft/hotbar-tools.tsx",
    title: "Hotbar Tools",
  },
  "hud-example": {
    Component: HudExample,
    filename: "minecraft/hud-example.tsx",
    title: "Hud Example",
  },
  "map-example": {
    Component: MapExample,
    filename: "minecraft/map-example.tsx",
    title: "Map Example",
  },
  "map-locator": {
    Component: MapLocator,
    filename: "minecraft/map-locator.tsx",
    title: "Map Locator",
  },
  "player-list-example": {
    Component: PlayerListExample,
    filename: "minecraft/player-list-example.tsx",
    title: "Player List Example",
  },
  "player-list-scoreboard": {
    Component: PlayerListScoreboard,
    filename: "minecraft/player-list-scoreboard.tsx",
    title: "Player List Scoreboard",
  },
  "player-preview-alex": {
    Component: PlayerPreviewAlex,
    filename: "minecraft/player-preview-alex.tsx",
    title: "Player Preview Alex",
  },
  "player-preview-example": {
    Component: PlayerPreviewExample,
    filename: "minecraft/player-preview-example.tsx",
    title: "Player Preview Example",
  },
  "redstone-lamp-display-example": {
    Component: RedstoneLampDisplayExample,
    filename: "minecraft/redstone-lamp-display-example.tsx",
    title: "Redstone Lamp Display Example",
  },
  "sign-example": {
    Component: SignExample,
    filename: "minecraft/sign-example.tsx",
    title: "Sign Example",
  },
  "sign-hanging": {
    Component: SignHanging,
    filename: "minecraft/sign-hanging.tsx",
    title: "Sign Hanging",
  },
  "trading-example": {
    Component: TradingExample,
    filename: "minecraft/trading-example.tsx",
    title: "Trading Example",
  },
} satisfies Record<string, ExampleDefinition>;
