import { getWorldMapPixels } from "@grasscn/web/demos/map-world-data";
import type { MinecraftAvatarSkin } from "@grasscn/web/ui/avatar";
import { Book } from "@grasscn/web/ui/book";
import { Hotbar } from "@grasscn/web/ui/hotbar";
import {
  HealthMeter,
  ArmorMeter,
  HungerMeter,
  AirMeter,
  ExperienceBar,
} from "@grasscn/web/ui/hud";
import { MinecraftMap, LocatorBar } from "@grasscn/web/ui/map";
import { minecraftBadgeAssets } from "@grasscn/web/ui/minecraft-badge-assets";
import { setMinecraftSoundVolume } from "@grasscn/web/ui/minecraft-sound";
import { PlayerList, Scoreboard } from "@grasscn/web/ui/player-list";
import { PlayerPreview } from "@grasscn/web/ui/player-preview";
import { Sign, HangingSign } from "@grasscn/web/ui/sign";
import { Trading } from "@grasscn/web/ui/trading";
import * as React from "react";

import "./draft-demos.css";

interface Sample {
  element: string;
  uncontrolled?: boolean;
  offerCount?: number;
  heading?: number;
  muted?: boolean;
  src?: string;
  model?: "wide" | "slim";
  state?: string;
  color?: string;
  checked?: boolean;
  value?: number;
  labels?: string[];
  label?: string;
  text?: string;
  anchor?: number;
  width?: number;
  height?: number;
  cursor?: number;
  background?: string;
}

const hasSkinSource = (src: Sample["src"]): src is string =>
  (src?.length ?? 0) > 0;

const DraftDemos = ({
  sample,
  scale,
}: {
  sample: Sample;
  scale: 1 | 2 | 3;
}) => {
  const [value, setValue] = React.useState(sample.value ?? 0);
  const [selected, setSelected] = React.useState(String(sample.value ?? 0));
  const [trades, setTrades] = React.useState(0);
  const [scroll, setScroll] = React.useState(sample.cursor ?? 0);

  React.useEffect(() => {
    setMinecraftSoundVolume(sample.muted === true ? 0 : 1);
  }, [sample.muted]);
  const common = { "data-subject": "true", id: "subject", scale };

  const pixels = React.useMemo(
    () =>
      sample.state === "saved-world"
        ? getWorldMapPixels()
        : Uint8Array.from({ length: 16_384 }, (_, i) => {
            if (sample.state === "palette") {
              return i % 256;
            }

            if (sample.state === "empty") {
              return 0;
            }

            if (Math.floor(i / 128) < 40) {
              return 6;
            }

            if (i % 128 < 48) {
              return 50;
            }

            if (Math.floor(i / 128) > 100) {
              return 10;
            }

            return 34;
          }),
    [sample.state]
  );

  const roster = [
    {
      id: "alex",
      latency: 42,
      name: "Alex",
      score: 18,
      skin: "slim/alex" as const,
    },
    {
      id: "steve",
      latency: 220,
      name: "Steve",
      score: 12,
      skin: "wide/steve" as const,
    },
    {
      id: "kai",
      latency: 670,
      name: "Kai",
      score: 7,
      skin: "wide/kai" as const,
    },
  ];

  const icon = <img src={minecraftBadgeAssets.diamond} alt="" />;

  const offers = Array.from({ length: sample.offerCount ?? 9 }, (_, i) => ({
    cost: { count: i + 1, icon, label: "Diamonds" },
    id: String(i),
    inStock: i !== (sample.offerCount ?? 9) - 1,
    label: `Offer ${i + 1}`,
    result: { count: 1, icon, label: `Reward ${i + 1}` },
  }));

  let content: React.ReactNode;

  switch (sample.element) {
    case "book": {
      content = (
        <Book
          {...common}
          pages={
            sample.labels ?? [
              "Welcome to grasscn.\n\nEvery pixel counts.",
              "Plan. Build. Ship.",
              "Your next chapter.",
            ]
          }
          page={value}
          onPageChange={setValue}
        />
      );
      break;
    }

    case "hotbar": {
      content = (
        <Hotbar
          {...common}
          background={sample.background ?? "#202020"}
          value={value}
          onValueChange={setValue}
        />
      );
      break;
    }

    case "health": {
      content = (
        <HealthMeter
          {...common}
          value={value}
          condition={
            (
              {
                ABSORBING: "absorbing",
                FROZEN: "frozen",
                NORMAL: "normal",
                POISIONED: "poisoned",
                WITHERED: "withered",
              } as const
            )[sample.state as "NORMAL"] ?? "normal"
          }
        />
      );
      break;
    }

    case "armor": {
      content = <ArmorMeter {...common} value={value} />;
      break;
    }

    case "hunger": {
      content = <HungerMeter {...common} value={value} />;
      break;
    }

    case "air": {
      content = <AirMeter {...common} value={value} />;
      break;
    }

    case "experience": {
      content = <ExperienceBar {...common} value={value} />;
      break;
    }

    case "player-preview": {
      content = (
        <PlayerPreview
          {...common}
          src={sample.src}
          model={sample.model}
          onRotationChange={(pose) => {
            document.documentElement.dataset.rotation = JSON.stringify(pose);
          }}
          skin={
            (hasSkinSource(sample.src) &&
            !["wide/steve", "slim/alex"].includes(sample.state ?? "")
              ? "wide/steve"
              : (sample.state ?? "wide/steve")) as MinecraftAvatarSkin
          }
          width={sample.width ?? 80}
          height={sample.height ?? 120}
          defaultRotation={{
            pitch: sample.anchor ?? -5,
            yaw: sample.value ?? 30,
          }}
        />
      );
      break;
    }

    case "map": {
      content = (
        <MinecraftMap
          onMapClick={(point) => {
            document.documentElement.dataset.mapClick = JSON.stringify(point);
          }}
          {...common}
          pixels={pixels}
          markers={
            sample.checked === true
              ? [
                  {
                    decoration: "frame",
                    id: "home",
                    label: "Home",
                    rotation: value,
                    x: 0,
                    y: 0,
                  },
                  {
                    decoration: "plains_village",
                    id: "village",
                    label: "Village",
                    rotation: value,
                    x: 70,
                    y: -50,
                  },
                ]
              : []
          }
          onMarkerSelect={(id) => {
            setSelected(id);
            document.documentElement.dataset.marker = id;
          }}
        />
      );
      break;
    }

    case "locator": {
      content = (
        <div
          id="subject"
          style={{
            "--fixture-layout-1": `${17 * scale}px`,
            "--fixture-layout-2": `${182 * scale}px`,
          }}
          className="fixture-owner-layout-2 fixture-owner-layout-3 fixture-owner-layout-4"
          data-subject="true"
        >
          <LocatorBar
            scale={scale}
            heading={sample.heading ?? 0}
            markers={
              sample.checked === true
                ? [
                    {
                      bearing: value,
                      color: sample.color ?? "#ffffff",
                      id: "point",
                      label: "Waypoint",
                      shape: "default_3",
                    },
                  ]
                : []
            }
            className="fixture-native-locator-offset"
            style={{ "--fixture-locator-top": `${6 * scale}px` }}
            onMarkerSelect={(id) => {
              setSelected(id);
              document.documentElement.dataset.marker = id;
            }}
          />
        </div>
      );
      break;
    }

    case "sign": {
      content = (
        <Sign
          {...common}
          wood={
            (sample.state as import("@grasscn/web/ui/sign").SignWood) ?? "oak"
          }
          glowing={sample.checked}
          lines={
            sample.labels ?? ["Welcome", "to grasscn", "", "Make it yours."]
          }
        />
      );
      break;
    }

    case "hanging-sign": {
      content = (
        <HangingSign
          {...common}
          wood={
            (sample.state as import("@grasscn/web/ui/sign").SignWood) ?? "oak"
          }
          glowing={sample.checked}
          lines={sample.labels ?? ["Open", "for business", "", "Welcome!"]}
        />
      );
      break;
    }

    case "player-list": {
      content = (
        <PlayerList
          {...common}
          players={(sample.labels ?? roster.map((p) => p.name)).map(
            (name, i) => {
              let selectedFixtureBranch1: number | undefined;

              if (sample.checked === true) {
                selectedFixtureBranch1 =
                  (sample.labels?.length ?? 3) === 3
                    ? [18, 12, 7][i]
                    : i * 3 + 7;
              } else {
                selectedFixtureBranch1 = undefined;
              }

              return {
                id: String(i),
                latency:
                  (sample.labels?.length ?? 3) === 3
                    ? [42, 220, 670][i]
                    : [-1, 42, 149, 150, 299, 300, 670, 1200][i % 8],
                name,
                score: selectedFixtureBranch1,
                skin: (["slim/alex", "wide/steve", "wide/kai"] as const)[i % 3],
              };
            }
          )}
          header={sample.label}
          footer={sample.text}
          onPlayerSelect={setSelected}
        />
      );
      break;
    }

    case "scoreboard": {
      content = (
        <Scoreboard
          {...common}
          title={sample.label ?? "Build leaderboard"}
          entries={(sample.labels ?? roster.map((p) => p.name)).map(
            (name, i) => ({
              id: String(i),
              name,
              score:
                (sample.labels?.length ?? 3) === 3 ? [18, 12, 7][i] : i * 3 + 7,
            })
          )}
        />
      );
      break;
    }

    case "trading-scrollbar":
    case "trading": {
      content = (
        <Trading
          ref={(node) => {
            document.documentElement.dataset.tradingRef =
              node?.dataset.slot ?? "";
          }}
          defaultScrollOffset={sample.cursor ?? 0}
          scrollOffset={sample.uncontrolled === true ? undefined : scroll}
          onScrollOffsetChange={setScroll}
          {...common}
          id={sample.element === "trading-scrollbar" ? undefined : "subject"}
          offers={offers}
          title="Component shop"
          selectedId={selected}
          onSelectedIdChange={setSelected}
          onTrade={() => {
            setTrades((v) => v + 1);
          }}
          data-subject={
            (sample.element === "trading-scrollbar" ? undefined : "subject") ===
            "subject"
              ? "true"
              : undefined
          }
        />
      );
      break;
    }

    default: {
      throw new Error(`Unknown draft feature: ${sample.element}`);
    }
  }

  if (sample.element === "trading-scrollbar") {
    return (
      <div
        id="subject"
        style={{
          "--fixture-layout-3": `${140 * scale}px`,
          "--fixture-layout-4": `${6 * scale}px`,
        }}
        className="fixture-owner-layout-5 fixture-owner-layout-6 fixture-owner-layout-7 fixture-owner-layout-8"
        data-subject="true"
      >
        <div
          style={{
            "--fixture-layout-5": `${-94 * scale}px`,
            "--fixture-layout-6": `${-18 * scale}px`,
          }}
          className="fixture-owner-layout-9 fixture-owner-layout-10 fixture-owner-layout-11"
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <>
      {content}
      {sample.element === "trading" && (
        <input
          aria-label="Scroll offset"
          type="number"
          value={scroll}
          onChange={(event) => {
            setScroll(Number(event.target.value));
          }}
        />
      )}
      <output aria-label="Demo value" className="fixture-demo-value">
        {value} / {selected} / {trades}
      </output>
    </>
  );
};

export { DraftDemos as default };
